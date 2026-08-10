import Foundation

/// SearchFilter draft → Autosweb űrlap JSON (POST /api/listings)
enum PostAdListingMapper {
    static let maxLeirasLength = 700

    static func formData(
        from filter: SearchFilter,
        leiras: String,
        vehicleTitle: String = "Személyautó"
    ) -> [String: Any] {
        var form: [String: Any] = [:]

        if let kind = filter.vehicleKind {
            form["jarmu_kategoria"] = kind
        }

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
        if let szemelyek = filter.szemelyek.first {
            form["szallithato_szemelyek"] = szemelyek
        }
        if let hajtas = filter.hajtasok.first {
            form["hajtas"] = hajtas
        }
        if let okmanyJelleg = filter.okmanyJellegek.first {
            form["okmany_jelleg"] = okmanyJelleg
        }
        if let okmany = filter.okmanyErvenyesseg.first {
            form["okmany_ervenyesseg"] = okmany
        }
        if let hirdeto = filter.hirdetok.first {
            form["hirdeto"] = hirdeto
        }
        if let henger = filter.hengerCm3Tol ?? filter.hengerCm3Ig {
            form["hengerurtartalom"] = String(henger)
        }
        if let kw = filter.kwTol ?? filter.kwIg {
            form["teljesitmeny_kw"] = String(kw)
        }
        if let nm = filter.nyomatekNmTol ?? filter.nyomatekNmIg {
            form["nyomatek_nm"] = String(nm)
        }
        if let st = filter.sajatTomegTol ?? filter.sajatTomegIg {
            form["sajat_tomeg"] = String(st)
        }
        if let ot = filter.osszTomegTol ?? filter.osszTomegIg {
            form["ossztomeg"] = String(ot)
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

        // Akkumulátor / hatótáv
        if let kwh = filter.akkumulatorKwhTol ?? filter.akkumulatorKwhIg {
            form["akkumulator_kwh"] = String(kwh)
        }
        if let jkwh = filter.jelenlegiAkkukapacitasTol ?? filter.jelenlegiAkkukapacitasIg {
            form["jelenlegi_akkukapacitas"] = String(jkwh)
        }
        if let ac = filter.acToltoCsatlakozok.first {
            form["ac_tolto_csatlakozo"] = ac
        }
        if let acKw = filter.acToltoTeljesitmenyTol ?? filter.acToltoTeljesitmenyIg {
            form["ac_tolto_teljesitmeny"] = String(acKw)
        }
        if let dc = filter.dcToltoCsatlakozok.first {
            form["dc_tolto_csatlakozo"] = dc
        }
        if let dcKw = filter.dcToltoTeljesitmenyTol ?? filter.dcToltoTeljesitmenyIg {
            form["dc_tolto_teljesitmeny"] = String(dcKw)
        }
        if let wltp = filter.hatotavTol ?? filter.hatotavIg {
            form["wltp_hatotav"] = String(wltp)
        }
        if let ap = filter.autopalyaHatotavTol ?? filter.autopalyaHatotavIg {
            form["autopalya_hatotav"] = String(ap)
        }
        if let teli = filter.teliHatotavTol ?? filter.teliHatotavIg {
            form["teli_hatotav"] = String(teli)
        }
        if filter.villamToltes { form["villamtoltes"] = true }
        if filter.zoldRendszam { form["zold_rendszam"] = true }

        // Raktér
        if let v = filter.rakterTerfogatTol ?? filter.rakterTerfogatIg {
            form["rakter_terfogat"] = String(v)
        }
        if let v = filter.rakterHosszTol ?? filter.rakterHosszIg {
            form["rakter_hossz"] = String(v)
        }
        if let v = filter.rakterSzelessegTol ?? filter.rakterSzelessegIg {
            form["rakter_szelesseg"] = String(v)
        }
        if let v = filter.rakterMagassagTol ?? filter.rakterMagassagIg {
            form["rakter_magassag"] = String(v)
        }
        if let v = filter.doblemezTavolsagTol ?? filter.doblemezTavolsagIg {
            form["doblemez_tavolsag"] = String(v)
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
        if title.isEmpty { title = vehicleTitle }
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
