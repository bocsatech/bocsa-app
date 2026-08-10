import Foundation
import SwiftUI

/// Autosweb API gyökér — Simulator: localhost; telefon: Mac Wi‑Fi IP (UserDefaults).
enum AutoswebBaseURL {
    static let defaultsKey = "autosweb.baseURL"
    static let defaultSimulator = "http://127.0.0.1:3456"

    /// Betöltés indításkor — a baseURL mindig `currentURL()`-t olvas.
    static func applyStored() {
        _ = currentURL()
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
        PartnerRecommendationsClient.baseURL = url
        return url
    }

    /// `192.168.0.12` → `http://192.168.0.12:3456`
    private static func normalizedURL(from raw: String) -> URL? {
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
        // Trailing slash nélkül
        var path = components.path
        if path == "/" { components.path = "" }
        guard let url = components.url, let host = components.host, !host.isEmpty else {
            return nil
        }
        _ = path
        return url
    }

    static func testReachability() async -> String {
        let url = PartnerRecommendationsClient.baseURL.appendingPathComponent("api/db/stats")
        var req = URLRequest(url: url)
        req.timeoutInterval = 4
        do {
            let (_, response) = try await URLSession.shared.data(for: req)
            let code = (response as? HTTPURLResponse)?.statusCode ?? 0
            if (200..<500).contains(code) {
                return "Elérhető: \(PartnerRecommendationsClient.baseURL.absoluteString)"
            }
            return "Válasz: HTTP \(code)"
        } catch {
            return "Nem elérhető. Macen fusson az Autosweb, ugyanaz a Wi‑Fi, helyes IP."
        }
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

            Text("Telefonon a Mac Wi‑Fi IP-jét add meg (pl. 192.168.0.12). Nem localhost.")
                .font(.footnote)
                .foregroundStyle(AppTheme.textSecondary)

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
    }

    private func save() {
        if let url = AutoswebBaseURL.set(urlText) {
            urlText = url.absoluteString
            emit("Autosweb cím: \(url.absoluteString)")
        } else {
            emit("Érvénytelen cím.")
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
