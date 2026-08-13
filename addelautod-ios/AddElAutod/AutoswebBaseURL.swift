import Foundation
import SwiftUI
import Network
#if canImport(Darwin)
import Darwin
#endif

/// Autosweb API gyökér — Simulator: localhost; telefon: Mac Wi‑Fi IP (UserDefaults / LAN-keresés).
enum AutoswebBaseURL {
    static let defaultsKey = "autosweb.baseURL"
    static let defaultSimulator = "http://127.0.0.1:3456"
    static let port = 3456

    static var isSimulator: Bool {
        #if targetEnvironment(simulator)
        true
        #else
        false
        #endif
    }

    static var isPhysicalDevice: Bool { !isSimulator }

    static var isLoopbackOnPhysicalDevice: Bool {
        isPhysicalDevice && isLoopback(currentURL())
    }

    static func applyStored() {
        _ = currentURL()
        AutoswebBonjour.shared.start()
        if isPhysicalDevice {
            Task { await ensureLANBase() }
        }
    }

    static func currentString() -> String {
        let stored = UserDefaults.standard.string(forKey: defaultsKey)?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if stored.isEmpty { return defaultSimulator }
        return stored
    }

    static func currentURL() -> URL {
        normalizedURL(from: currentString()) ?? URL(string: defaultSimulator)!
    }

    static func isLoopback(_ url: URL) -> Bool {
        let host = (url.host ?? "").lowercased()
        return host == "127.0.0.1" || host == "localhost" || host == "::1" || host == "[::1]"
    }

    static func unreachableMessage() -> String {
        let url = currentURL().absoluteString
        let wifi = AutoswebLAN.wifiIPv4Addresses()
        if isLoopbackOnPhysicalDevice {
            if wifi.isEmpty {
                return "A telefonon a localhost a készülék, nem a Mac. Kapcsold be a Wi‑Fi-t (ugyanaz, mint a Mac), majd Keresés Wi‑Fi-n. iOS: Beállítások → Bymy → Helyi hálózat."
            }
            return "A telefonon a localhost a készülék, nem a Mac. Telefon Wi‑Fi: \(wifi.joined(separator: ", ")). Fogaskerék → Keresés, vagy a Mac IP (Autosweb-indító). Most: \(url)"
        }
        return "Autosweb nem elérhető (\(url)). Ugyanaz a Wi‑Fi, Macen fusson az indító, iOS: Beállítások → Bymy → Helyi hálózat."
    }

    @discardableResult
    static func set(_ raw: String) -> URL? {
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let url = normalizedURL(from: trimmed.isEmpty ? defaultSimulator : trimmed) else {
            return nil
        }
        if trimmed.isEmpty || url.absoluteString == defaultSimulator {
            UserDefaults.standard.removeObject(forKey: defaultsKey)
        } else {
            UserDefaults.standard.set(url.absoluteString, forKey: defaultsKey)
        }
        return url
    }

    static func normalizedURL(from raw: String) -> URL? {
        var s = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if s.isEmpty { return URL(string: defaultSimulator) }
        if !s.contains("://") { s = "http://\(s)" }
        guard var components = URLComponents(string: s) else { return nil }
        if components.scheme == nil { components.scheme = "http" }
        if components.port == nil { components.port = port }
        if components.path == "/" { components.path = "" }
        guard let url = components.url, let host = components.host, !host.isEmpty else { return nil }
        return url
    }

    /// Készüléken: ha localhost / nem válaszol, Wi‑Fi-n megkeresi az Autoswebt.
    @discardableResult
    static func ensureLANBase() async -> URL? {
        await AutoswebLAN.ensureBase()
    }

    static func testReachability() async -> String {
        if let found = await ensureLANBase(), await AutoswebLAN.probe(found) {
            return "Elérhető: \(found.absoluteString)"
        }
        return unreachableMessage()
    }

    static func rebasing(_ request: URLRequest, onto newBase: URL) -> URLRequest {
        guard let old = request.url, var comps = URLComponents(url: old, resolvingAgainstBaseURL: false) else {
            return request
        }
        comps.scheme = newBase.scheme
        comps.host = newBase.host
        comps.port = newBase.port
        var req = request
        req.url = comps.url
        return req
    }
}

/// Wi‑Fi alhálózat: UDP ping + HTTP `/api/health`. Csak `en*` (Wi‑Fi), nem VPN/mobilnet.
enum AutoswebLAN {
    private static var inFlight: Task<URL?, Never>?

    static func ensureBase() async -> URL? {
        if let existing = inFlight {
            return await existing.value
        }
        let task = Task<URL?, Never> { await search() }
        inFlight = task
        let result = await task.value
        inFlight = nil
        return result
    }

    private static func search() async -> URL? {
        AutoswebBonjour.shared.start()
        let current = AutoswebBaseURL.currentURL()
        let skipLoopback = AutoswebBaseURL.isPhysicalDevice && AutoswebBaseURL.isLoopback(current)
        if !skipLoopback, await probe(current) {
            return current
        }

        // Először a helyi hálózat engedély (felugró) — e nélkül a keresés üresen lefut.
        await AutoswebBonjour.shared.waitUntilReady(timeout: 8)
        if let bonjour = AutoswebBonjour.shared.lastFoundURL, await probe(bonjour) {
            _ = AutoswebBaseURL.set(bonjour.absoluteString)
            return bonjour
        }

        let wifi = wifiIPv4Addresses()
        if wifi.isEmpty, AutoswebBaseURL.isPhysicalDevice {
            return nil
        }

        if let found = await udpDiscover(from: wifi), await probe(found) {
            _ = AutoswebBaseURL.set(found.absoluteString)
            return found
        }
        if let found = await scanSubnet(wifiIPs: wifi) {
            _ = AutoswebBaseURL.set(found.absoluteString)
            return found
        }
        return nil
    }

    private struct Health: Decodable {
        let ok: Bool?
        let service: String?
        let listingsMine: Bool?
        let lan: [String]?
        let port: Int?
    }

    static func probe(_ base: URL) async -> Bool {
        let url = base.appendingPathComponent("api/health")
        var req = URLRequest(url: url)
        req.timeoutInterval = 1.4
        req.cachePolicy = .reloadIgnoringLocalCacheData
        do {
            let (data, response) = try await URLSession.shared.data(for: req)
            let code = (response as? HTTPURLResponse)?.statusCode ?? 0
            guard (200..<500).contains(code), isAutosweb(data) else { return false }
            return true
        } catch {
            return false
        }
    }

    static func isAutosweb(_ data: Data) -> Bool {
        guard let h = try? JSONDecoder().decode(Health.self, from: data) else { return false }
        if h.service == "bymy-autosweb" { return true }
        if h.ok == true, h.listingsMine == true { return true }
        return h.ok == true
    }

    static func scanSubnet(wifiIPs: [String]? = nil) async -> URL? {
        let mine = wifiIPs ?? wifiIPv4Addresses()
        var candidates: [String] = []
        var seen = Set<String>()
        for ip in mine {
            let parts = ip.split(separator: ".").compactMap { Int($0) }
            guard parts.count == 4 else { continue }
            let prefix = "\(parts[0]).\(parts[1]).\(parts[2])"
            // DHCP gyakran az alsó tartományba rakja a Macet — először 1…40.
            var ordered: [Int] = Array(1...40) + Array(41...254)
            ordered.removeAll { $0 == parts[3] }
            for last in ordered {
                let cand = "\(prefix).\(last)"
                if seen.insert(cand).inserted {
                    candidates.append(cand)
                }
            }
        }
        guard !candidates.isEmpty else { return nil }

        return await withTaskGroup(of: URL?.self) { group in
            var iterator = candidates.makeIterator()
            let workers = min(48, candidates.count)
            for _ in 0..<workers {
                guard let ip = iterator.next() else { break }
                group.addTask { await probeIP(ip) }
            }
            while let result = await group.next() {
                if let url = result {
                    group.cancelAll()
                    return url
                }
                if let ip = iterator.next() {
                    group.addTask { await probeIP(ip) }
                }
            }
            return nil
        }
    }

    private static func probeIP(_ ip: String) async -> URL? {
        guard let url = URL(string: "http://\(ip):\(AutoswebBaseURL.port)") else { return nil }
        return await probe(url) ? url : nil
    }

    /// Csak Wi‑Fi (`en0`/`en1`…), nem VPN (`utun`) és nem mobilnet (`pdp_ip`).
    static func wifiIPv4Addresses() -> [String] {
        var ifaddr: UnsafeMutablePointer<ifaddrs>?
        guard getifaddrs(&ifaddr) == 0, let first = ifaddr else { return [] }
        defer { freeifaddrs(ifaddr) }
        var out: [String] = []
        var ptr: UnsafeMutablePointer<ifaddrs>? = first
        while let p = ptr {
            let name = String(cString: p.pointee.ifa_name)
            let flags = Int32(p.pointee.ifa_flags)
            if name.hasPrefix("en"),
               (flags & IFF_UP) != 0,
               (flags & IFF_LOOPBACK) == 0,
               let addr = p.pointee.ifa_addr,
               addr.pointee.sa_family == UInt8(AF_INET) {
                var host = [CChar](repeating: 0, count: Int(NI_MAXHOST))
                getnameinfo(addr, socklen_t(addr.pointee.sa_len), &host, socklen_t(host.count), nil, 0, NI_NUMERICHOST)
                let ip = String(cString: host)
                if isPrivateIPv4(ip), !out.contains(ip) {
                    out.append(ip)
                }
            }
            ptr = p.pointee.ifa_next
        }
        return out
    }

    static func isPrivateIPv4(_ ip: String) -> Bool {
        let parts = ip.split(separator: ".").compactMap { Int($0) }
        guard parts.count == 4 else { return false }
        if parts[0] == 10 { return true }
        if parts[0] == 192, parts[1] == 168 { return true }
        if parts[0] == 172, (16...31).contains(parts[1]) { return true }
        return false
    }

    /// UDP unicast a Wi‑Fi /24-re — a szerver `BYMY?` üzenetre válaszol. Nem broadcast (nincs multicast entitlement).
    static func udpDiscover(from wifiIPs: [String]) async -> URL? {
        let candidates = udpCandidates(from: wifiIPs)
        guard !candidates.isEmpty else { return nil }
        return await withCheckedContinuation { cont in
            DispatchQueue.global(qos: .userInitiated).async {
                let found = udpPing(candidates: candidates)
                cont.resume(returning: found)
            }
        }
    }

    private static func udpCandidates(from wifiIPs: [String]) -> [String] {
        var out: [String] = []
        var seen = Set<String>()
        for ip in wifiIPs {
            let parts = ip.split(separator: ".").compactMap { Int($0) }
            guard parts.count == 4 else { continue }
            let prefix = "\(parts[0]).\(parts[1]).\(parts[2])"
            for last in 1...254 where last != parts[3] {
                let cand = "\(prefix).\(last)"
                if seen.insert(cand).inserted { out.append(cand) }
            }
        }
        return out
    }

    private static func udpPing(candidates: [String]) -> URL? {
        let fd = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP)
        guard fd >= 0 else { return nil }
        defer { close(fd) }

        var timeout = timeval(tv_sec: 2, tv_usec: 0)
        setsockopt(fd, SOL_SOCKET, SO_RCVTIMEO, &timeout, socklen_t(MemoryLayout<timeval>.size))

        let payload = Array("BYMY?".utf8)
        let port = UInt16(AutoswebBaseURL.port).bigEndian
        for ip in candidates {
            var addr = sockaddr_in()
            addr.sin_len = UInt8(MemoryLayout<sockaddr_in>.size)
            addr.sin_family = sa_family_t(AF_INET)
            addr.sin_port = port
            _ = ip.withCString { inet_pton(AF_INET, $0, &addr.sin_addr) }
            _ = payload.withUnsafeBytes { buf in
                guard let base = buf.baseAddress else { return 0 }
                return withUnsafePointer(to: &addr) { ptr in
                    ptr.withMemoryRebound(to: sockaddr.self, capacity: 1) { sa in
                        sendto(fd, base, buf.count, 0, sa, socklen_t(MemoryLayout<sockaddr_in>.size))
                    }
                }
            }
        }

        var buf = [UInt8](repeating: 0, count: 2048)
        var from = sockaddr_in()
        var fromLen = socklen_t(MemoryLayout<sockaddr_in>.size)
        let n: Int = withUnsafeMutablePointer(to: &from) { fromPtr in
            fromPtr.withMemoryRebound(to: sockaddr.self, capacity: 1) { sa in
                recvfrom(fd, &buf, buf.count, 0, sa, &fromLen)
            }
        }
        guard n > 0 else { return nil }
        let data = Data(buf.prefix(n))
        guard isAutosweb(data) || (String(data: data, encoding: .utf8)?.contains("bymy-autosweb") == true) else {
            return nil
        }
        var host = [CChar](repeating: 0, count: Int(NI_MAXHOST))
        inet_ntop(AF_INET, &from.sin_addr, &host, socklen_t(NI_MAXHOST))
        let ip = String(cString: host)
        guard !ip.isEmpty, ip != "0.0.0.0" else { return nil }
        return URL(string: "http://\(ip):\(AutoswebBaseURL.port)")
    }
}

/// Bonjour + NWBrowser: helyi hálózat engedély + Mac IP.
final class AutoswebBonjour: NSObject, NetServiceBrowserDelegate, NetServiceDelegate {
    static let shared = AutoswebBonjour()

    private let browser = NetServiceBrowser()
    private var resolving: [NetService] = []
    private var nwBrowser: NWBrowser?
    private var connections: [NWConnection] = []
    private(set) var lastFoundURL: URL?
    private var isReady = false
    var onFound: ((URL) -> Void)?

    func start() {
        DispatchQueue.main.async {
            let me = AutoswebBonjour.shared
            me.browser.delegate = me
            me.browser.searchForServices(ofType: "_autosweb._tcp.", inDomain: "local.")
            me.startNWBrowser()
        }
    }

    /// Vár, amíg az iOS helyi hálózat engedély megvan, vagy van Bonjour találat.
    func waitUntilReady(timeout: TimeInterval) async {
        if isReady || lastFoundURL != nil { return }
        start()
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if isReady || lastFoundURL != nil { return }
            try? await Task.sleep(nanoseconds: 200_000_000)
        }
    }

    private func markReady() {
        isReady = true
        Task {
            if AutoswebBaseURL.isLoopbackOnPhysicalDevice {
                _ = await AutoswebBaseURL.ensureLANBase()
            }
        }
    }

    private func startNWBrowser() {
        guard nwBrowser == nil else { return }
        let params = NWParameters()
        params.includePeerToPeer = true
        let b = NWBrowser(for: .bonjour(type: "_autosweb._tcp", domain: "local."), using: params)
        b.stateUpdateHandler = { state in
            guard case .ready = state else { return }
            DispatchQueue.main.async {
                AutoswebBonjour.shared.markReady()
            }
        }
        b.browseResultsChangedHandler = { results, _ in
            DispatchQueue.main.async {
                for result in results {
                    AutoswebBonjour.shared.resolve(result.endpoint)
                }
            }
        }
        b.start(queue: .main)
        nwBrowser = b
    }

    private func resolve(_ endpoint: NWEndpoint) {
        if case .hostPort(let host, let port) = endpoint {
            if let url = url(host: host, port: port) {
                found(url)
            }
            return
        }
        let conn = NWConnection(to: endpoint, using: .tcp)
        conn.stateUpdateHandler = { state in
            guard case .ready = state else { return }
            let remote = conn.currentPath?.remoteEndpoint
            conn.cancel()
            DispatchQueue.main.async {
                if case .hostPort(let host, let port) = remote,
                   let url = AutoswebBonjour.shared.url(host: host, port: port) {
                    AutoswebBonjour.shared.found(url)
                }
            }
        }
        connections.append(conn)
        conn.start(queue: .main)
    }

    private func url(host: NWEndpoint.Host, port: NWEndpoint.Port) -> URL? {
        let hostStr: String
        switch host {
        case .ipv4(let addr):
            hostStr = "\(addr)"
        case .ipv6:
            return nil
        case .name(let name, _):
            hostStr = name
        @unknown default:
            hostStr = "\(host)"
        }
        let cleaned = hostStr.trimmingCharacters(in: CharacterSet(charactersIn: "[]"))
        guard !cleaned.isEmpty, cleaned != "127.0.0.1", cleaned != "localhost" else { return nil }
        let p = port.rawValue == 0 ? UInt16(AutoswebBaseURL.port) : port.rawValue
        return URL(string: "http://\(cleaned):\(p)")
    }

    private func found(_ url: URL) {
        lastFoundURL = url
        if AutoswebBaseURL.isLoopbackOnPhysicalDevice {
            _ = AutoswebBaseURL.set(url.absoluteString)
        }
        let handler = onFound
        DispatchQueue.main.async {
            handler?(url)
        }
    }

    func netServiceBrowser(_ browser: NetServiceBrowser, didFind service: NetService, moreComing: Bool) {
        service.delegate = self
        service.resolve(withTimeout: 4)
        resolving.append(service)
    }

    func netServiceDidResolveAddress(_ sender: NetService) {
        guard let url = url(from: sender) else { return }
        found(url)
    }

    private func url(from service: NetService) -> URL? {
        let port = service.port > 0 ? service.port : AutoswebBaseURL.port
        if let ip = ipv4(from: service) {
            return URL(string: "http://\(ip):\(port)")
        }
        if let host = service.hostName, !host.isEmpty {
            let h = host.hasSuffix(".") ? String(host.dropLast()) : host
            if h == "localhost" { return nil }
            return URL(string: "http://\(h):\(port)")
        }
        return nil
    }

    private func ipv4(from service: NetService) -> String? {
        guard let addrs = service.addresses else { return nil }
        for data in addrs {
            var host = [CChar](repeating: 0, count: Int(NI_MAXHOST))
            let ok: Bool = data.withUnsafeBytes { raw in
                guard let sa = raw.baseAddress?.assumingMemoryBound(to: sockaddr.self) else { return false }
                guard sa.pointee.sa_family == sa_family_t(AF_INET) else { return false }
                return getnameinfo(sa, socklen_t(data.count), &host, socklen_t(host.count), nil, 0, NI_NUMERICHOST) == 0
            }
            if ok {
                let s = String(cString: host)
                if !s.isEmpty, s != "0.0.0.0", s != "127.0.0.1" { return s }
            }
        }
        return nil
    }
}

/// Belépés előtt is szerkeszthető (vendég mód) — Mac Wi‑Fi IP.
struct AutoswebServerSettingsCard: View {
    var compact: Bool = false
    var onMessage: ((String) -> Void)? = nil

    @State private var urlText = AutoswebBaseURL.currentString()
    @State private var busy = false
    @State private var localMessage: String?

    private var wifiLabel: String {
        let ips = AutoswebLAN.wifiIPv4Addresses()
        if ips.isEmpty { return "A telefonon nincs Wi‑Fi IPv4. Kapcsold be a Wi‑Fi-t (ne vendéghálózat)." }
        return "Telefon Wi‑Fi: \(ips.joined(separator: ", ")) — a Mac ugyanígy kezdődjön, nem localhost."
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(compact ? "Autosweb (Wi‑Fi)" : "Autosweb szerver")
                .font(compact ? .subheadline.weight(.semibold) : .headline)
                .foregroundStyle(AppTheme.text)

            Text("A telefon localhostja a telefon, nem a Mac. Ugyanaz a Wi‑Fi, engedélyezd a helyi hálózatot, majd Keresés — vagy írd be a Mac IP-t az Autosweb-indítóból.")
                .font(.footnote)
                .foregroundStyle(AppTheme.textSecondary)

            Text(wifiLabel)
                .font(.footnote.weight(.semibold))
                .foregroundStyle(AppTheme.text)

            if AutoswebBaseURL.isLoopbackOnPhysicalDevice {
                Text("Most localhost van beállítva. Nyomj Keresés Wi‑Fi-n, és iOS-en: Beállítások → Bymy → Helyi hálózat = be.")
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(Color(red: 0.75, green: 0.12, blue: 0.12))
            }

            TextField("http://192.168.0.12:3456", text: $urlText)
                .textFieldStyle(.roundedBorder)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .keyboardType(.URL)

            HStack(spacing: 12) {
                Button("Mentés") { save() }
                    .font(.body.weight(.semibold))
                Button("Teszt") {
                    Task { await test() }
                }
                .font(.body.weight(.semibold))
                .disabled(busy)
                Button("Keresés Wi‑Fi-n") {
                    Task { await searchLAN() }
                }
                .font(.body.weight(.semibold))
                .disabled(busy)
                if busy { ProgressView().scaleEffect(0.8) }
                Spacer()
            }
            .foregroundStyle(AppTheme.accent)

            if let localMessage, onMessage == nil {
                Text(localMessage)
                    .font(.caption)
                    .foregroundStyle(AppTheme.textSecondary)
            }
        }
        .padding(compact ? 16 : 20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(compact ? AppTheme.bgElevated : Color.white)
        .clipShape(RoundedRectangle(cornerRadius: compact ? 12 : 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: compact ? 12 : 16, style: .continuous)
                .stroke(AppTheme.border, lineWidth: compact ? 0 : 1)
        )
        .onAppear {
            AutoswebBonjour.shared.start()
            AutoswebBonjour.shared.onFound = { url in
                urlText = url.absoluteString
                emit("Megtalálva: \(url.absoluteString)")
            }
            urlText = AutoswebBaseURL.currentString()
            if AutoswebBaseURL.isPhysicalDevice {
                Task { await searchLAN() }
            }
        }
    }

    private func save() {
        if let url = AutoswebBaseURL.set(urlText) {
            urlText = url.absoluteString
            emit("Autosweb cím: \(url.absoluteString)")
        } else {
            emit("Érvénytelen cím.")
        }
    }

    private func searchLAN() async {
        busy = true
        defer { busy = false }
        emit("Keresés a Wi‑Fi-n…")
        AutoswebBonjour.shared.start()
        if let found = await AutoswebBaseURL.ensureLANBase() {
            urlText = found.absoluteString
            emit("Megtalálva: \(found.absoluteString)")
        } else {
            let wifi = AutoswebLAN.wifiIPv4Addresses()
            if wifi.isEmpty {
                emit("Nincs Wi‑Fi IPv4 a telefonon. Kapcsold be a Wi‑Fi-t, ugyanaz mint a Mac.")
            } else {
                emit("Nem található a \(wifi[0].split(separator: ".").prefix(3).joined(separator: ".")).x hálózaton. Macen fusson az Autosweb-indító, iOS: Beállítások → Bymy → Helyi hálózat.")
            }
        }
    }

    private func test() async {
        _ = AutoswebBaseURL.set(urlText)
        urlText = AutoswebBaseURL.currentString()
        busy = true
        defer { busy = false }
        emit(await AutoswebBaseURL.testReachability())
    }

    private func emit(_ text: String) {
        if let onMessage {
            onMessage(text)
        } else {
            localMessage = text
        }
    }
}
