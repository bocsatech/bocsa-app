import Foundation

enum FuelType: String, Codable, CaseIterable, Identifiable {
    case benzin, diesel, hybrid, elektromos, benzinGaz = "benzin-gaz"

    var id: String { rawValue }

    var label: String {
        switch self {
        case .benzin: return "Benzin"
        case .diesel: return "Diesel"
        case .hybrid: return "Hybrid"
        case .elektromos: return "Elektromos"
        case .benzinGaz: return "Benzin/Gáz"
        }
    }
}

enum ExtraKey: String, Codable, CaseIterable, Identifiable {
    case klima, automata, tempomat, osszker, alufelni
    case elektromosAblak = "elektromos_ablak"
    case vonohorog, isofix, esp, szervizkonyv

    var id: String { rawValue }

    var label: String {
        switch self {
        case .klima: return "Klíma"
        case .automata: return "Automata váltó"
        case .tempomat: return "Tempomat"
        case .osszker: return "Összkerék"
        case .alufelni: return "Alufelni"
        case .elektromosAblak: return "Elektromos ablak"
        case .vonohorog: return "Vonóhorog"
        case .isofix: return "ISOFIX"
        case .esp: return "ESP"
        case .szervizkonyv: return "Szervizkönyv"
        }
    }
}

struct SearchFilter: Codable, Equatable {
    /// Több márka — kapcsolókkal (nem pipa).
    var gyartmanyok: [String] = []
    /// Több modell — kapcsolókkal.
    var modellek: [String] = []
    /// Több üzemanyag — kapcsolókkal.
    var fuels: [FuelType] = []
    var arTol: Int? = nil
    var arIg: Int? = nil
    var evTol: Int? = nil
    var evIg: Int? = nil
    var kmTol: Int? = nil
    var kmIg: Int? = nil
    var extras: [String: Bool] = [:]

    var activeExtrasCount: Int {
        extras.values.filter { $0 }.count
    }

    var brandLabel: String {
        if gyartmanyok.isEmpty { return "Mindegy" }
        if gyartmanyok.count == 1 { return gyartmanyok[0] }
        if gyartmanyok.count <= 3 { return gyartmanyok.joined(separator: ", ") }
        return "\(gyartmanyok.count) márka"
    }

    var modelLabel: String {
        if modellek.isEmpty { return "Mindegy" }
        if modellek.count == 1 { return modellek[0] }
        if modellek.count <= 3 { return modellek.joined(separator: ", ") }
        return "\(modellek.count) modell"
    }

    var fuelLabel: String {
        if fuels.isEmpty { return "Mindegy" }
        if fuels.count == 1 { return fuels[0].label }
        if fuels.count <= 3 { return fuels.map(\.label).joined(separator: ", ") }
        return "\(fuels.count) üzemanyag"
    }

    var summary: String {
        var parts: [String] = []
        if !gyartmanyok.isEmpty { parts.append(brandLabel) }
        if !modellek.isEmpty { parts.append(modelLabel) }
        if !fuels.isEmpty { parts.append(fuelLabel) }
        if let ig = arIg { parts.append("– \(Self.formatPrice(ig))") }
        else if let tol = arTol { parts.append("\(Self.formatPrice(tol)) –") }
        if activeExtrasCount > 0 { parts.append("\(activeExtrasCount) extra") }
        return parts.isEmpty ? "Nincs szűrő" : parts.joined(separator: " · ")
    }

    var isEmpty: Bool { summary == "Nincs szűrő" }

    static func formatPrice(_ n: Int) -> String {
        if n >= 1_000_000 {
            let m = Double(n) / 1_000_000
            if m == floor(m) { return "\(Int(m)) M Ft" }
            return String(format: "%.1f M Ft", m)
        }
        return "\(n / 1000) ezer Ft"
    }
}

struct SavedSearch: Identifiable, Codable, Equatable {
    var id: String
    var name: String
    var icon: String
    var filter: SearchFilter
    var createdAt: Date
}

struct FeedItem: Identifiable {
    let id: String
    let kind: Kind
    let title: String
    let source: String
    let subtitle: String
    let url: URL?

    enum Kind { case news, youtube }
}

struct FeaturedAd: Identifiable {
    let id: String
    let title: String
    let priceLabel: String
    let meta: String
    let badge: String?
}
