import Foundation
import Combine

@MainActor
final class SearchStore: ObservableObject {
    @Published var filter = SearchFilter()
    @Published var saved: [SavedSearch] = []

    private let storageKey = "addelautod.savedSearches.v2"

    init() {
        load()
    }

    func setBrand(_ brand: String, on: Bool) {
        var list = filter.gyartmanyok
        if on {
            if !list.contains(brand) { list.append(brand) }
        } else {
            list.removeAll { $0 == brand }
        }
        list.sort()
        filter.gyartmanyok = list
        // Modell csak akkor marad, ha még van hozzá tartozó bekapcsolt márka
        if let modell = filter.modell {
            let stillValid = list.contains { brand in
                (Catalog.brands[brand] ?? []).contains(modell)
            }
            if !stillValid { filter.modell = nil }
        }
    }

    func clearBrands() {
        filter.gyartmanyok = []
        filter.modell = nil
    }

    func isBrandOn(_ brand: String) -> Bool {
        filter.gyartmanyok.contains(brand)
    }

    func setModel(_ model: String?) {
        filter.modell = model
    }

    func setFuel(_ fuel: FuelType, on: Bool) {
        var list = filter.fuels
        if on {
            if !list.contains(fuel) { list.append(fuel) }
        } else {
            list.removeAll { $0 == fuel }
        }
        // stabil sorrend: FuelType.allCases szerint
        filter.fuels = FuelType.allCases.filter { list.contains($0) }
    }

    func clearFuels() {
        filter.fuels = []
    }

    func isFuelOn(_ fuel: FuelType) -> Bool {
        filter.fuels.contains(fuel)
    }

    func setPrice(tol: Int?, ig: Int?) {
        filter.arTol = tol
        filter.arIg = ig
    }

    func setYear(tol: Int?, ig: Int?) {
        filter.evTol = tol
        filter.evIg = ig
    }

    func setKm(tol: Int?, ig: Int?) {
        filter.kmTol = tol
        filter.kmIg = ig
    }

    func setExtra(_ key: ExtraKey, on: Bool) {
        filter.extras[key.rawValue] = on
    }

    func isExtraOn(_ key: ExtraKey) -> Bool {
        filter.extras[key.rawValue] == true
    }

    func reset() {
        filter = SearchFilter()
    }

    func apply(_ item: SavedSearch) {
        filter = item.filter
    }

    @discardableResult
    func saveCurrent(name: String? = nil) -> SavedSearch? {
        guard !filter.isEmpty else { return nil }
        let icon = Catalog.savedIcons[saved.count % Catalog.savedIcons.count]
        let item = SavedSearch(
            id: UUID().uuidString,
            name: (name?.trimmingCharacters(in: .whitespacesAndNewlines)).flatMap { $0.isEmpty ? nil : $0 } ?? filter.summary,
            icon: icon,
            filter: filter,
            createdAt: Date()
        )
        saved.insert(item, at: 0)
        if saved.count > 12 { saved = Array(saved.prefix(12)) }
        persist()
        return item
    }

    func remove(_ id: String) {
        saved.removeAll { $0.id == id }
        persist()
    }

    private func load() {
        guard let data = UserDefaults.standard.data(forKey: storageKey) else { return }
        if let decoded = try? JSONDecoder().decode([SavedSearch].self, from: data) {
            saved = decoded
        }
    }

    private func persist() {
        if let data = try? JSONEncoder().encode(saved) {
            UserDefaults.standard.set(data, forKey: storageKey)
        }
    }
}
