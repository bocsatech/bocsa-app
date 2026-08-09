import Foundation

/// Hirdetés feladás menüfa (űrlapok később).
enum PostAdCatalog {
    struct Item: Identifiable, Hashable {
        let id: String
        let title: String
    }

    /// Autó hirdetés almenü
    static let autoItems: [Item] = [
        .init(id: "auto-szemelyauto", title: "Személyautó"),
        .init(id: "auto-leasing", title: "Leasing hirdetés"),
        .init(id: "auto-berauto", title: "Bérautó hirdetés"),
        .init(id: "auto-berlakokocsi", title: "Bérelhető lakókocsi hirdetés"),
    ]

    /// Ingatlan → Típus (több is választható)
    static let ingatlanTipusok: [Item] = [
        .init(id: "elado", title: "Eladó"),
        .init(id: "kiado", title: "Kiadó"),
        .init(id: "berelheto", title: "Bérelhető"),
    ]

    /// Ingatlan → Kategória (több is választható; Eladó / Kiadó / Bérelhető alatt ugyanaz)
    static let ingatlanKategoriak: [Item] = [
        .init(id: "csaladi-haz", title: "Családi házak"),
        .init(id: "tarsashazi-lakas", title: "Társasházi lakások"),
        .init(id: "sorhaz", title: "Sorházak"),
        .init(id: "garazs", title: "Garázsok"),
        .init(id: "ipari", title: "Ipari ingatlanok"),
        .init(id: "telek", title: "Telkek"),
        .init(id: "nyaralo", title: "Nyaralók"),
        .init(id: "mezogazdasagi", title: "Mezőgazdasági ingatlanok"),
    ]
}
