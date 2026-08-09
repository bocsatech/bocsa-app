import Foundation

/// Hirdetés feladás menüfa (űrlapok később).
enum PostAdCatalog {
    struct Item: Identifiable, Hashable {
        let id: String
        let title: String
    }

    struct Group: Identifiable, Hashable {
        let id: String
        let title: String
        let items: [Item]
    }

    /// Autó hirdetés almenü
    static let autoItems: [Item] = [
        .init(id: "auto-szemelyauto", title: "Személyautó"),
        .init(id: "auto-leasing", title: "Leasing hirdetés"),
        .init(id: "auto-berauto", title: "Bérautó hirdetés"),
        .init(id: "auto-berlakokocsi", title: "Bérelhető lakókocsi hirdetés"),
    ]

    /// Ingatlan típusok (Eladó / Kiadó)
    static let ingatlanTipusok: [Item] = [
        .init(id: "csaladi-haz", title: "Családi házak"),
        .init(id: "tarsashazi-lakas", title: "Társasházi lakások"),
        .init(id: "sorhaz", title: "Sorházak"),
        .init(id: "garazs", title: "Garázsok"),
        .init(id: "ipari", title: "Ipari ingatlanok"),
        .init(id: "telek", title: "Telkek"),
        .init(id: "nyaralo", title: "Nyaralók"),
        .init(id: "mezogazdasagi", title: "Mezőgazdasági ingatlanok"),
    ]

    static let ingatlanGroups: [Group] = [
        .init(id: "elado", title: "Eladó", items: ingatlanTipusok.map {
            .init(id: "elado-\($0.id)", title: $0.title)
        }),
        .init(id: "kiado", title: "Kiadó", items: ingatlanTipusok.map {
            .init(id: "kiado-\($0.id)", title: $0.title)
        }),
        /// Egyelőre üres — funkció később
        .init(id: "berelheto", title: "Bérelhető", items: []),
    ]
}
