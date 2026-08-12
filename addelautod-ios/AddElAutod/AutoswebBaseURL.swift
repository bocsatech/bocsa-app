import Foundation
import SwiftUI

/// Autosweb API gyökér — Simulator: localhost; telefon: Mac Wi‑Fi IP (UserDefaults / Bonjour).
enum AutoswebBaseURL {
    static let defaultsKey = "autosweb.baseURL"
    static let defaultSimulator = "http://127.0.0.1:3456"

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

    /// Betöltés indításkor — a baseURL mindig `currentURL()`-t olvas.
    static func applyStored() {
        _ = currentURL()
        AutoswebBonjour.shared.start()
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
        if isLoopbackOnPhysicalDevice {
            return "Telefonon a localhost a készülék, nem a Mac. Fogaskerék → Autosweb: add meg a Mac Wi‑Fi IP-jét, vagy Keresés Wi‑Fi-n. (Most: \(url))"
        }
        return "Autosweb nem elérhető (\(url)). Ugyanaz a Wi‑Fi, Macen fusson az Autosweb-indító, iOS engedélyezze a helyi hálózatot."
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

    /// `192.168.0.12` → `http://192.168.0.12:3456`
    static func normalizedURL(from raw: String) -> URL? {
        var s = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if s.isEmpty { return URL(string: defaultSimulator) }
        if !s.contains("://") {
            s = "http://\(s)"
        }
        guard var components = URLComponents(string: s) else { return nil }
        if components.scheme == nil { components.scheme = "http" }
        if components.port == nil {
            components.port = 3456
        }
        if components.path == "/" { components.path = "" }
        guard let url = components.url, let host = components.host, !host.isEmpty else {
            return nil
        }
        return url
    }

    static func testReachability() async -> String {
        if isLoopbackOnPhysicalDevice {
            return unreachableMessage()
        }
        let url = PartnerRecommendationsClient.baseURL.appendingPathComponent("api/db/stats")
        var req = URLRequest(url: url)
        req.timeoutInterval = 8
        do {
            let (_, response) = try await URLSession.shared.data(for: req)
            let code = (response as? HTTPURLResponse)?.statusCode ?? 0
            if (200..<500).contains(code) {
                return "Elérhető: \(PartnerRecommendationsClient.baseURL.absoluteString)"
            }
            return "Válasz: HTTP \(code)"
        } catch {
            return unreachableMessage()
        }
    }
}

/// Bonjour: `_autosweb._tcp` — helyi hálózat engedély + Mac IP felismerés.
final class AutoswebBonjour: NSObject, NetServiceBrowserDelegate, NetServiceDelegate {
    static let shared = AutoswebBonjour()

    private let browser = NetServiceBrowser()
    private var resolving: [NetService] = []
    private(set) var lastFoundURL: URL?
    var onFound: ((URL) -> Void)?

    func start() {
        browser.delegate = self
        browser.searchForServices(ofType: "_autosweb._tcp.", inDomain: "local.")
    }

    func netServiceBrowser(_ browser: NetServiceBrowser, didFind service: NetService, moreComing: Bool) {
        service.delegate = self
        service.resolve(withTimeout: 4)
        resolving.append(service)
    }

    func netServiceDidResolveAddress(_ sender: NetService) {
        guard let url = url(from: sender) else { return }
        lastFoundURL = url
        if AutoswebBaseURL.isLoopbackOnPhysicalDevice {
            _ = AutoswebBaseURL.set(url.absoluteString)
        }
        DispatchQueue.main.async { [onFound] in
            onFound?(url)
        }
    }

    private func url(from service: NetService) -> URL? {
        let port = service.port > 0 ? service.port : 3456
        if let ip = ipv4(from: service) {
            return URL(string: "http://\(ip):\(port)")
        }
        if let host = service.hostName, !host.isEmpty {
            let h = host.hasSuffix(".") ? String(host.dropLast()) : host
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
                if !s.isEmpty, s != "0.0.0.0" { return s }
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

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(compact ? "Autosweb (Wi‑Fi)" : "Autosweb szerver")
                .font(compact ? .subheadline.weight(.semibold) : .headline)
                .foregroundStyle(AppTheme.text)

            Text("Telefonon a Mac Wi‑Fi IP-jét add meg (pl. 192.168.0.12), vagy Keresés Wi‑Fi-n. Nem localhost.")
                .font(.footnote)
                .foregroundStyle(AppTheme.textSecondary)

            if AutoswebBaseURL.isLoopbackOnPhysicalDevice {
                Text("Most localhost van beállítva — a telefonon ez nem a Mac. Engedélyezd a helyi hálózatot, ha iOS kéri.")
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
                    searchLAN()
                }
                .font(.body.weight(.semibold))
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

    private func searchLAN() {
        AutoswebBonjour.shared.start()
        if let found = AutoswebBonjour.shared.lastFoundURL {
            _ = AutoswebBaseURL.set(found.absoluteString)
            urlText = found.absoluteString
            emit("Megtalálva: \(found.absoluteString)")
        } else {
            emit("Keresés… Engedélyezd a helyi hálózatot. Az Autosweb-indítónak futnia kell a Macen.")
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
