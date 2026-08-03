import Foundation
import Combine

@MainActor
final class SearchStore: ObservableObject {
    @Published var filter = SearchFilter()
    @Published var saved: [SavedSearch] = []

    private let storageKey = "addelautod.savedSearches.v3"

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
        pruneModels()
    }

    func clearBrands() {
        filter.gyartmanyok = []
        filter.modellek = []
    }

    func isBrandOn(_ brand: String) -> Bool {
        filter.gyartmanyok.contains(brand)
    }

    func setModel(_ model: String, on: Bool) {
        var list = filter.modellek
        if on {
            if !list.contains(model) { list.append(model) }
        } else {
            list.removeAll { $0 == model }
        }
        filter.modellek = list.sorted()
    }

    func clearModels() {
        filter.modellek = []
    }

    func clearModels(for brand: String) {
        let allowed = Set(Catalog.brands[brand] ?? [])
        filter.modellek.removeAll { allowed.contains($0) }
    }

    func isModelOn(_ model: String) -> Bool {
        filter.modellek.contains(model)
    }

    /// Egy gyártmányhoz tartozó, bekapcsolt modellek
    func models(for brand: String) -> [String] {
        let allowed = Set(Catalog.brands[brand] ?? [])
        return filter.modellek.filter { allowed.contains($0) }
    }

    func modelLabel(for brand: String) -> String {
        let m = models(for: brand)
        if m.isEmpty { return "Mindegy" }
        if m.count == 1 { return m[0] }
        if m.count <= 3 { return m.joined(separator: ", ") }
        return "\(m.count) modell"
    }

    /// Gyors kategória a főoldali ikonokról (Új, Diesel, …)
    func applyQuickCategory(_ category: QuickCategory) {
        applyListingQuery(.category(category))
    }

    func applyListingQuery(_ query: ListingQuery) {
        filter = SearchFilter()
        let year = Calendar.current.component(.year, from: Date())
        switch query {
        case .nearby:
            break
        case .newListings:
            filter.evTol = year - 1
        case .category(let category):
            switch category {
            case .uj:
                filter.evTol = year - 1
            case .benzin:
                filter.fuels = [.benzin]
            case .diesel:
                filter.fuels = [.diesel]
            case .elektromos:
                filter.fuels = [.elektromos]
            case .hybrid:
                filter.fuels = [.hybrid]
            case .leasing, .berelheto, .ot:
                break
            }
        }
    }

    private func pruneModels() {
        let allowed = Set(filter.gyartmanyok.flatMap { Catalog.brands[$0] ?? [] })
        filter.modellek = filter.modellek.filter { allowed.contains($0) }
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
        var t = tol
        var i = ig
        if let tVal = t, let iVal = i, tVal > iVal {
            // ha minimum > maximum, igazítjuk
            i = tVal
        }
        filter.arTol = t
        filter.arIg = i
    }

    func setPriceMin(_ value: Int?) {
        setPrice(tol: value, ig: filter.arIg)
    }

    func setPriceMax(_ value: Int?) {
        setPrice(tol: filter.arTol, ig: value)
    }

    func setYear(tol: Int?, ig: Int?) {
        var t = tol
        var i = ig
        if let tVal = t, let iVal = i, tVal > iVal {
            i = tVal
        }
        filter.evTol = t
        filter.evIg = i
    }

    func setYearMin(_ value: Int?) {
        setYear(tol: value, ig: filter.evIg)
    }

    func setYearMax(_ value: Int?) {
        setYear(tol: filter.evTol, ig: value)
    }

    func setKm(tol: Int?, ig: Int?) {
        var t = tol
        var i = ig
        if let tVal = t, let iVal = i, tVal > iVal {
            i = tVal
        }
        filter.kmTol = t
        filter.kmIg = i
    }

    func setKmMin(_ value: Int?) {
        setKm(tol: value, ig: filter.kmIg)
    }

    func setKmMax(_ value: Int?) {
        setKm(tol: filter.kmTol, ig: value)
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
