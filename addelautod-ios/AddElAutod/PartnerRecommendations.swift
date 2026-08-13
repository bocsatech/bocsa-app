import Foundation

struct PartnerRecommendation: Identifiable, Hashable {
  let id: String
  let name: String
  let address: String
  let postalCode: String
  let phone: String?
  let openingHours: String?
  let rating: Double?
  let reviewCount: Int?
  let distanceKm: Double?
  let mapsURL: URL?
}

struct PartnerCategoryGroup: Identifiable, Hashable {
  let id: String
  let label: String
  let partners: [PartnerRecommendation]
}

/// Fizetős partner ajánló kategóriák — ugyanaz a lista, mint az Autosweben.
enum PartnerCategoryCatalog {
  static let items: [(id: String, label: String)] = [
    ("atiras_ugyintezes", "Átírás ügyintézés"),
    ("eredetvizsga", "Eredetvizsga"),
    ("muszakivizsga", "Műszaki vizsga"),
    ("autoatvizsgalas", "Autoátvizsgálás"),
    ("autoszerelo", "Autószerelő"),
    ("gumiszerelo", "Gumiszerelő"),
    ("lakatos", "Lakatos"),
    ("klimaszerelo", "Klímaszerelő"),
    ("autokozmetika", "Autókozmetika"),
    ("autovillamossag", "Autóvillamosság"),
  ]
}

enum PartnerRecommendationsDemo {
  static let categories: [PartnerCategoryGroup] = [
    PartnerCategoryGroup(
      id: "atiras_ugyintezes",
      label: "Átírás ügyintézés",
      partners: [
        PartnerRecommendation(
          id: "d1",
          name: "Autó-Átírás Fejér",
          address: "Piac tér 5.",
          postalCode: "8000",
          phone: "+36 22 678 9012",
          openingHours: "H–P 8–16",
          rating: 4.8,
          reviewCount: 34,
          distanceKm: 1.2,
          mapsURL: URL(string: "https://www.google.com/maps/search/?api=1&query=Aut%C3%B3-%C3%81t%C3%ADr%C3%A1s%20Fej%C3%A9r%20Sz%C3%A9kesfeh%C3%A9rv%C3%A1r")
        ),
      ]
    ),
    PartnerCategoryGroup(
      id: "eredetvizsga",
      label: "Eredetvizsga",
      partners: [
        PartnerRecommendation(
          id: "d2",
          name: "MVK Vizsgaállomás",
          address: "Ipari park 1.",
          postalCode: "8000",
          phone: "+36 22 567 8901",
          openingHours: "H–P 7–18",
          rating: 4.2,
          reviewCount: 210,
          distanceKm: 3.4,
          mapsURL: URL(string: "https://www.google.com/maps/search/?api=1&query=MVK%20Vizsga%C3%A1llom%C3%A1s%20Sz%C3%A9kesfeh%C3%A9rv%C3%A1r")
        ),
      ]
    ),
    PartnerCategoryGroup(
      id: "muszakivizsga",
      label: "Műszaki vizsga",
      partners: [
        PartnerRecommendation(
          id: "d2b",
          name: "MVK Vizsgaállomás",
          address: "Ipari park 1.",
          postalCode: "8000",
          phone: "+36 22 567 8901",
          openingHours: "H–P 7–18",
          rating: 4.2,
          reviewCount: 210,
          distanceKm: 3.4,
          mapsURL: URL(string: "https://www.google.com/maps/search/?api=1&query=MVK%20Vizsga%C3%A1llom%C3%A1s%20Sz%C3%A9kesfeh%C3%A9rv%C3%A1r")
        ),
      ]
    ),
    PartnerCategoryGroup(
      id: "autoatvizsgalas",
      label: "Autoátvizsgálás",
      partners: [
        PartnerRecommendation(
          id: "d2c",
          name: "Autóátvizsgálás Fejér",
          address: "Gáz utca 8.",
          postalCode: "8000",
          phone: "+36 22 456 7890",
          openingHours: "H–P 8–17",
          rating: 4.6,
          reviewCount: 48,
          distanceKm: 2.7,
          mapsURL: URL(string: "https://www.google.com/maps/search/?api=1&query=Aut%C3%B3%C3%A1tvizsg%C3%A1l%C3%A1s%20Sz%C3%A9kesfeh%C3%A9rv%C3%A1r")
        ),
      ]
    ),
    PartnerCategoryGroup(
      id: "autoszerelo",
      label: "Autószerelő",
      partners: [
        PartnerRecommendation(
          id: "d3",
          name: "Fejér Autószerviz Kft.",
          address: "Fő utca 12.",
          postalCode: "8000",
          phone: "+36 22 123 4567",
          openingHours: "H–P 8–17, Szo 8–12",
          rating: 4.7,
          reviewCount: 89,
          distanceKm: 0.8,
          mapsURL: URL(string: "https://www.google.com/maps/search/?api=1&query=Fej%C3%A9r%20Aut%C3%B3szerviz%20Sz%C3%A9kesfeh%C3%A9rv%C3%A1r")
        ),
        PartnerRecommendation(
          id: "d4",
          name: "Klíma-Autó Bt.",
          address: "Vásárhelyi u. 3.",
          postalCode: "8019",
          phone: "+36 22 345 6789",
          openingHours: nil,
          rating: 4.3,
          reviewCount: 56,
          distanceKm: 4.1,
          mapsURL: URL(string: "https://www.google.com/maps/search/?api=1&query=Kl%C3%ADma-Aut%C3%B3%20Sz%C3%A9kesfeh%C3%A9rv%C3%A1r")
        ),
      ]
    ),
    PartnerCategoryGroup(
      id: "gumiszerelo",
      label: "Gumiszerelő",
      partners: [
        PartnerRecommendation(
          id: "d5",
          name: "Gumi-Pro Székesfehérvár",
          address: "Berényi út 45.",
          postalCode: "8000",
          phone: "+36 22 234 5678",
          openingHours: "H–P 7:30–18, Szo 8–14",
          rating: 4.5,
          reviewCount: 142,
          distanceKm: 2.0,
          mapsURL: URL(string: "https://www.google.com/maps/search/?api=1&query=Gumi-Pro%20Sz%C3%A9kesfeh%C3%A9rv%C3%A1r")
        ),
      ]
    ),
    PartnerCategoryGroup(
      id: "autokozmetika",
      label: "Autókozmetika",
      partners: [
        PartnerRecommendation(
          id: "d6",
          name: "Premium Autókozmetika",
          address: "Palotai út 20.",
          postalCode: "8019",
          phone: "+36 22 789 0123",
          openingHours: "H–Szo 9–18",
          rating: 4.9,
          reviewCount: 67,
          distanceKm: 5.2,
          mapsURL: URL(string: "https://www.google.com/maps/search/?api=1&query=Premium%20Aut%C3%B3kozmetika%20Sz%C3%A9kesfeh%C3%A9rv%C3%A1r")
        ),
      ]
    ),
  ]
}

enum PartnerRecommendationsClient {
  /// Mindig az aktuális Autosweb cím (UserDefaults / Belépés képernyő).
  static var baseURL: URL { AutoswebBaseURL.currentURL() }

  /// Irányítószám → település (GET /api/postal-codes/lookup)
  static func lookupCity(postalCode: String) async -> String? {
    let digits = String(postalCode.filter(\.isNumber).prefix(4))
    guard digits.count == 4 else { return nil }
    var components = URLComponents(
      url: baseURL.appendingPathComponent("api/postal-codes/lookup"),
      resolvingAgainstBaseURL: false
    )!
    components.queryItems = [URLQueryItem(name: "postal_code", value: digits)]
    guard let url = components.url else { return nil }
    var request = URLRequest(url: url)
    request.timeoutInterval = 3
    do {
      let (data, response) = try await URLSession.shared.data(for: request)
      guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
        return nil
      }
      struct Row: Decodable { let city: String? }
      return try JSONDecoder().decode(Row.self, from: data).city
    } catch {
      return nil
    }
  }

  static func fetch(postalCode: String) async throws -> (city: String?, categories: [PartnerCategoryGroup]) {
    var components = URLComponents(
      url: baseURL.appendingPathComponent("api/partners/recommendations"),
      resolvingAgainstBaseURL: false
    )!
    components.queryItems = [URLQueryItem(name: "postal_code", value: postalCode)]
    guard let url = components.url else { throw URLError(.badURL) }

    var request = URLRequest(url: url)
    request.timeoutInterval = 20
    let (data, response) = try await URLSession.shared.data(for: request)
    guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
      throw URLError(.badServerResponse)
    }

    let decoded = try JSONDecoder().decode(RemoteRecommendations.self, from: data)
    let groups = decoded.categories.map { cat in
      PartnerCategoryGroup(
        id: cat.id,
        label: cat.label,
        partners: cat.partners.map { p in
          PartnerRecommendation(
            id: String(p.id),
            name: p.name,
            address: p.address ?? "",
            postalCode: p.postal_code ?? "",
            phone: p.phone,
            openingHours: p.opening_hours,
            rating: p.google_rating,
            reviewCount: p.google_review_count,
            distanceKm: p.distance_km,
            mapsURL: p.google_maps_url.flatMap(URL.init(string:))
          )
        }
      )
    }
    return (decoded.city, groups)
  }
}

private struct RemoteRecommendations: Decodable {
  let city: String?
  let categories: [RemoteCategory]
}

private struct RemoteCategory: Decodable {
  let id: String
  let label: String
  let partners: [RemotePartner]
}

private struct RemotePartner: Decodable {
  let id: Int
  let name: String
  let address: String?
  let postal_code: String?
  let phone: String?
  let opening_hours: String?
  let google_rating: Double?
  let google_review_count: Int?
  let google_maps_url: String?
  let distance_km: Double?
}
