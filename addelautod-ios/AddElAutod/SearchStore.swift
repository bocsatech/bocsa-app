import Foundation
import Combine

@MainActor
final class SearchStore: ObservableObject {
    @Published var filter = SearchFilter()
    @Published var saved: [SavedSearch] = []

    private let storageKey = "addelautod.savedSearches.v1"

    init() {
        load()
    }

    func setBrand(_ brand: String?) {
        if brand != filter.gyartmany {
            filter.modell = nil
        }
        filter.gyartmany = brand
    }

    func setModel(_ model: String?) {
        filter.modell = model
    }

    func setFuel(_ fuel: FuelType?) {
        filter.fuel = fuel
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
