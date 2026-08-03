import SwiftUI

/// Gyors kategória találatok — egy szűrés + irányítószám / km-sugár a beállításokból
struct CategoryResultsScreen: View {
    @EnvironmentObject private var store: SearchStore
    @EnvironmentObject private var profile: ProfileStore

    let category: QuickCategory
    var onBack: () -> Void
    var onOpenSettings: () -> Void

    private var radiusKm: Int { max(1, profile.profile.searchRadiusKm) }
    private var postal: String {
        let p = profile.profile.postalCode.trimmingCharacters(in: .whitespaces)
        return p.isEmpty ? "nincs megadva" : p
    }

    private var cars: [DemoListing] {
        DemoListing.filtered(for: category, maxDistanceKm: radiusKm)
    }

    var body: some View {
        VStack(spacing: 0) {
            ScreenHeader(
                title: category.title,
                subtitle: "\(postal) · \(radiusKm) km",
                onBack: onBack,
                rightLabel: "Körzet",
                onRight: onOpenSettings
            )

            if profile.profile.postalCode.trimmingCharacters(in: .whitespaces).isEmpty {
                Button(action: onOpenSettings) {
                    HStack(spacing: 8) {
                        Image(systemName: "mappin.and.ellipse")
                        Text("Add meg az irányítószámot és a km-sugarat a Beállításokban")
                            .font(.footnote)
                            .multilineTextAlignment(.leading)
                    }
                    .foregroundStyle(AppTheme.accent)
                    .padding(12)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(AppTheme.accent.opacity(0.08))
                }
                .buttonStyle(.plain)
            }

            ScrollView {
                LazyVStack(spacing: 12) {
                    Text("\(cars.count) találat · \(category.title) · \(radiusKm) km körzet")
                        .font(.footnote)
                        .foregroundStyle(AppTheme.textSecondary)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    ForEach(cars) { car in
                        VStack(alignment: .leading, spacing: 6) {
                            HStack(alignment: .top) {
                                Text(car.title)
                                    .font(.headline)
                                    .foregroundStyle(AppTheme.text)
                                Spacer()
                                if let badge = car.badge {
                                    Text(badge)
                                        .font(.caption2.weight(.bold))
                                        .foregroundStyle(AppTheme.accent)
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 3)
                                        .background(AppTheme.accent.opacity(0.12))
                                        .clipShape(Capsule())
                                }
                            }
                            Text(car.priceLabel)
                                .font(.title3.weight(.bold))
                            Text(car.meta)
                                .font(.subheadline)
                                .foregroundStyle(AppTheme.textSecondary)
                            Text("\(car.postalCode) · ~\(car.distanceKm) km")
                                .font(.caption)
                                .foregroundStyle(AppTheme.textTertiary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(16)
                        .background(AppTheme.bgElevated)
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .stroke(AppTheme.border, lineWidth: 0.5)
                        )
                    }
                }
                .padding(16)
                .padding(.bottom, 24)
            }
        }
        .background(AppTheme.bg)
        .onAppear {
            store.applyQuickCategory(category)
        }
    }
}

struct DemoListing: Identifiable {
    let id: String
    let title: String
    let priceLabel: String
    let meta: String
    let badge: String?
    let fuel: FuelType?
    let year: Int
    let isLeasing: Bool
    let isRentable: Bool
    let isOldtimer: Bool
    let postalCode: String
    let distanceKm: Int

    static let all: [DemoListing] = [
        DemoListing(id: "1", title: "BMW 320d · 2019", priceLabel: "8,9 M Ft", meta: "142 000 km · Diesel · Automat", badge: "Kiemelt", fuel: .diesel, year: 2019, isLeasing: false, isRentable: false, isOldtimer: false, postalCode: "1117", distanceKm: 8),
        DemoListing(id: "2", title: "Volkswagen Golf 1.5 TSI", priceLabel: "6,2 M Ft", meta: "68 000 km · Benzin · 2021", badge: "Friss", fuel: .benzin, year: 2021, isLeasing: false, isRentable: false, isOldtimer: false, postalCode: "1024", distanceKm: 12),
        DemoListing(id: "3", title: "Toyota Corolla Hybrid", priceLabel: "7,4 M Ft", meta: "51 000 km · Hybrid · 2022", badge: "Kiemelt", fuel: .hybrid, year: 2022, isLeasing: true, isRentable: false, isOldtimer: false, postalCode: "1138", distanceKm: 5),
        DemoListing(id: "4", title: "Skoda Octavia 2.0 TDI", priceLabel: "5,1 M Ft", meta: "118 000 km · Diesel · 2018", badge: nil, fuel: .diesel, year: 2018, isLeasing: false, isRentable: false, isOldtimer: false, postalCode: "1048", distanceKm: 18),
        DemoListing(id: "5", title: "Ford Kuga ST-Line", priceLabel: "9,8 M Ft", meta: "34 000 km · Hybrid · 2023", badge: "Kiemelt", fuel: .hybrid, year: 2023, isLeasing: false, isRentable: true, isOldtimer: false, postalCode: "1095", distanceKm: 6),
        DemoListing(id: "6", title: "Tesla Model 3", priceLabel: "14,2 M Ft", meta: "22 000 km · Elektromos · 2024", badge: "Új", fuel: .elektromos, year: 2024, isLeasing: true, isRentable: false, isOldtimer: false, postalCode: "1052", distanceKm: 3),
        DemoListing(id: "7", title: "VW ID.3 Pro", priceLabel: "11,5 M Ft", meta: "15 000 km · Elektromos · 2025", badge: "Új", fuel: .elektromos, year: 2025, isLeasing: false, isRentable: false, isOldtimer: false, postalCode: "1112", distanceKm: 9),
        DemoListing(id: "8", title: "Mercedes C 220d", priceLabel: "10,1 M Ft", meta: "89 000 km · Diesel · 2020", badge: nil, fuel: .diesel, year: 2020, isLeasing: true, isRentable: false, isOldtimer: false, postalCode: "1124", distanceKm: 11),
        DemoListing(id: "9", title: "Opel Corsa 1.2", priceLabel: "4,2 M Ft", meta: "41 000 km · Benzin · 2022", badge: nil, fuel: .benzin, year: 2022, isLeasing: false, isRentable: true, isOldtimer: false, postalCode: "1037", distanceKm: 14),
        DemoListing(id: "10", title: "Trabant 601", priceLabel: "1,8 M Ft", meta: "62 000 km · Benzin · 1985", badge: "OT", fuel: .benzin, year: 1985, isLeasing: false, isRentable: false, isOldtimer: true, postalCode: "1173", distanceKm: 22),
        DemoListing(id: "11", title: "Audi A4 2.0 TDI", priceLabel: "7,9 M Ft", meta: "95 000 km · Diesel · 2021", badge: nil, fuel: .diesel, year: 2021, isLeasing: false, isRentable: false, isOldtimer: false, postalCode: "1144", distanceKm: 7),
        DemoListing(id: "12", title: "Suzuki Swift", priceLabel: "3,6 M Ft", meta: "28 000 km · Benzin · 2023", badge: "Friss", fuel: .benzin, year: 2023, isLeasing: false, isRentable: true, isOldtimer: false, postalCode: "1082", distanceKm: 4),
    ]

    static func filtered(for category: QuickCategory, maxDistanceKm: Int = 500) -> [DemoListing] {
        all.filter { car in
            guard car.distanceKm <= maxDistanceKm else { return false }
            switch category {
            case .uj: return car.year >= 2024
            case .benzin: return car.fuel == .benzin && !car.isOldtimer
            case .diesel: return car.fuel == .diesel
            case .elektromos: return car.fuel == .elektromos
            case .hybrid: return car.fuel == .hybrid
            case .leasing: return car.isLeasing
            case .berelheto: return car.isRentable
            case .ot: return car.isOldtimer
            }
        }
    }
}
