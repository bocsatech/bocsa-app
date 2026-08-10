import Foundation
import SwiftUI

/// Autosweb API gyökér — Simulator: localhost; telefon: Mac Wi‑Fi IP (UserDefaults).
enum AutoswebBaseURL {
    static let defaultsKey = "autosweb.baseURL"
    static let defaultSimulator = "http://127.0.0.1:3456"

    /// Betöltés indításkor + Beállításokból.
    static func applyStored() {
        PartnerRecommendationsClient.baseURL = currentURL()
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
}
