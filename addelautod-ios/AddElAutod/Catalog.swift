import Foundation

enum Catalog {
    static let brands: [String: [String]] = [
        "Audi": ["A3", "A4", "A6", "Q3", "Q5"],
        "BMW": ["1-es", "3-as", "5-ös", "X1", "X3", "X5"],
        "Ford": ["Fiesta", "Focus", "Kuga", "Mustang", "Puma"],
        "Mercedes": ["A-osztály", "C-osztály", "E-osztály", "GLA", "GLC"],
        "Opel": ["Astra", "Corsa", "Insignia", "Mokka"],
        "Skoda": ["Fabia", "Octavia", "Superb", "Kodiaq"],
        "Suzuki": ["Swift", "Vitara", "SX4 S-Cross"],
        "Toyota": ["Corolla", "Yaris", "RAV4", "C-HR"],
        "Volkswagen": ["Golf", "Passat", "Tiguan", "Polo", "ID.3"],
    ]

    static var brandNames: [String] { brands.keys.sorted() }

    static let pricePresets: [(label: String, tol: Int?, ig: Int?)] = [
        ("Mindegy", nil, nil),
        ("– 2 M Ft", nil, 2_000_000),
        ("2 – 5 M Ft", 2_000_000, 5_000_000),
        ("5 – 10 M Ft", 5_000_000, 10_000_000),
        ("10 M Ft –", 10_000_000, nil),
    ]

    static let yearPresets: [(label: String, tol: Int?, ig: Int?)] = [
        ("Mindegy", nil, nil),
        ("2020 –", 2020, nil),
        ("2015 – 2019", 2015, 2019),
        ("2010 – 2014", 2010, 2014),
        ("– 2009", nil, 2009),
    ]

    static let kmPresets: [(label: String, tol: Int?, ig: Int?)] = [
        ("Mindegy", nil, nil),
        ("– 50 000 km", nil, 50_000),
        ("– 100 000 km", nil, 100_000),
        ("– 150 000 km", nil, 150_000),
        ("150 000 km –", 150_000, nil),
    ]

    static let savedIcons = ["🚗", "🔍", "⭐", "💎", "🏎️", "🛠️", "📌", "🔥"]
}

enum SampleContent {
    static let feed: [FeedItem] = [
        FeedItem(
            id: "yt1",
            kind: .youtube,
            title: "Használtautó vásárlás — mire figyelj 2026-ban",
            source: "YouTube",
            subtitle: "Add el autod · tippek",
            url: URL(string: "https://www.youtube.com")
        ),
        FeedItem(
            id: "n1",
            kind: .news,
            title: "Új elektromos modellek a magyar piacon",
            source: "Hírek",
            subtitle: "Összefoglaló a friss kínálatról",
            url: nil
        ),
        FeedItem(
            id: "yt2",
            kind: .youtube,
            title: "BMW 3-as teszt — dízel vs hibrid",
            source: "YouTube",
            subtitle: "Összehasonlító videó",
            url: URL(string: "https://www.youtube.com")
        ),
        FeedItem(
            id: "n2",
            kind: .news,
            title: "Átírás és eredetvizsgálat — rövid útmutató",
            source: "Útmutató",
            subtitle: "Közeli szolgáltatókhoz kapcsolódik",
            url: nil
        ),
    ]

    static let featured: [FeaturedAd] = [
        FeaturedAd(id: "a1", title: "BMW 320d · 2019", priceLabel: "8,9 M Ft", meta: "142 000 km · Diesel · Automat", badge: "Kiemelt"),
        FeaturedAd(id: "a2", title: "Volkswagen Golf 1.5 TSI", priceLabel: "6,2 M Ft", meta: "68 000 km · Benzin · 2021", badge: "Friss"),
        FeaturedAd(id: "a3", title: "Toyota Corolla Hybrid", priceLabel: "7,4 M Ft", meta: "51 000 km · Hybrid · 2022", badge: "Kiemelt"),
        FeaturedAd(id: "a4", title: "Skoda Octavia 2.0 TDI", priceLabel: "5,1 M Ft", meta: "118 000 km · Diesel · 2018", badge: nil),
        FeaturedAd(id: "a5", title: "Ford Kuga ST-Line", priceLabel: "9,8 M Ft", meta: "34 000 km · Hybrid · 2023", badge: "Kiemelt"),
    ]
}
