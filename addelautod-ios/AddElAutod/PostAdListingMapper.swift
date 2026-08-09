import Foundation

/// SearchFilter draft → Autosweb űrlap JSON (POST /api/listings)
enum PostAdListingMapper {
    static let maxLeirasLength = 700

    static func formData(from filter: SearchFilter, leiras: String) -> [String: Any] {
        var form: [String: Any] = [:]

        let brand = filter.gyartmanyok.first
        let model = filter.modellek.first
        if let brand { form["gyartmany"] = brand }
        if let model { form["modell"] = model }

        // Feladáskor egy érték (mindkét filter mező ugyanaz).
        let year = filter.evTol ?? filter.evIg
        if let year { form["gyartasi_ev"] = String(year) }

        let km = filter.kmTol ?? filter.kmIg
        if let km { form["km"] = String(km) }

        let price = filter.arTol ?? filter.arIg
        if let price { form["vetelar"] = String(price) }

        if let fuel = filter.fuels.first {
            form["uzemanyag"] = fuelFormLabel(fuel)
        }

        if let allapot = filter.allapotok.first {
            form["allapot"] = allapot
        }
        if let kivitel = filter.kiviteles.first {
            form["kivitel"] = kivitel
        }
        if let ajtok = filter.ajtok.first {
            form["ajtok"] = ajtok
        }
        if let hajtas = filter.hajtasok.first {
            form["hajtas"] = hajtas
        }
        if let okmany = filter.okmanyErvenyesseg.first {
            form["okmany_ervenyesseg"] = okmany
        }
        if let henger = filter.hengerCm3Tol ?? filter.hengerCm3Ig {
            form["hengerurtartalom"] = String(henger)
        }
        if let valt = filter.sebessegvaltok.first {
            form["sebessegvalto"] = valt
        }
        if let szin = filter.szinek.first {
            form["szin"] = szin
        }
        if let klima = filter.klima {
            form["klima"] = klima
        }

        let extras = filter.extras.filter { $0.value }.map(\.key).sorted()
        if !extras.isEmpty {
            form["felszereltseg"] = extras
        }

        let trimmed = String(leiras.prefix(maxLeirasLength))
            .trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmed.isEmpty {
            form["leiras"] = trimmed
        }

        let titleParts = [brand, model].compactMap { $0 }.filter { !$0.isEmpty }
        var title = titleParts.joined(separator: " ")
        if title.isEmpty { title = "Személyautó" }
        if let year {
            title = "\(title) (\(year))"
        }
        form["hirdetes_cime"] = title

        return form
    }

    private static func fuelFormLabel(_ fuel: FuelType) -> String {
        switch fuel {
        case .benzin: return "Benzin"
        case .diesel: return "Dízel"
        case .hybrid: return "Hibrid"
        case .elektromos: return "Elektromos"
        case .benzinGaz: return "Benzin/Gáz"
        }
    }
}
