import Foundation

enum ListingSource: String, Codable {
  case local
  case hasznaltauto
}

struct UnifiedListing: Identifiable, Hashable {
  let id: String
  let source: ListingSource
  let title: String
  let brand: String
  let model: String
  let year: Int?
  let km: Int?
  let priceFt: Int?
  let priceLabel: String
  let meta: String
  let imageUrl: URL?
  /// Élő egyedi hirdetés URL (Safariban nyílik). Demónál nil.
  let externalUrl: URL?
  /// Demó / scrape nélkül: működő márka+modell kereső oldal (nem egy autó).
  let searchUrl: URL?
  let badge: String?
  /// true = nincs valódi hirdetés-link (hamis id → 404 lenne)
  let isDemo: Bool

  var sourceLabel: String {
    switch source {
    case .local: return "Add el autod"
    case .hasznaltauto: return isDemo ? "HA demo" : "használtautó.hu"
    }
  }

  /// Safariban egy konkrét hirdetés nyitható.
  var canOpenLiveListing: Bool {
    guard source == .hasznaltauto, !isDemo, let url = externalUrl else { return false }
    return url.path.range(of: #"/szemelyauto/.+-\d{5,}$"#, options: .regularExpression) != nil
  }

  static func fromLocal(_ car: DemoListing) -> UnifiedListing {
    UnifiedListing(
      id: "local-\(car.id)",
      source: .local,
      title: car.title,
      brand: car.brand,
      model: car.model,
      year: car.year,
      km: car.km,
      priceFt: car.priceFt,
      priceLabel: car.priceLabel,
      meta: car.meta,
      imageUrl: nil,
      externalUrl: nil,
      searchUrl: nil,
      badge: car.badge,
      isDemo: false
    )
  }
}

struct HaSearchResponse: Decodable {
  let ok: Bool?
  let mode: String?
  let sourceUrl: String?
  let warning: String?
  let error: String?
  let results: [HaRemoteListing]

  var isDemoMode: Bool {
    let m = (mode ?? "").lowercased()
    return m == "demo" || m == "demo-fallback" || m.contains("demo")
  }
}

struct HaRemoteListing: Decodable, Identifiable {
  let id: String
  let source: String?
  let title: String
  let brand: String?
  let model: String?
  let year: Int?
  let km: Int?
  let priceFt: Int?
  let priceLabel: String?
  let meta: String?
  let imageUrl: String?
  let url: String?
  let searchUrl: String?
  let demo: Bool?

  func asUnified(forceDemo: Bool = false) -> UnifiedListing {
    let isDemo = forceDemo || (demo == true)
    return UnifiedListing(
      id: id,
      source: .hasznaltauto,
      title: title,
      brand: brand ?? "",
      model: model ?? "",
      year: year,
      km: km,
      priceFt: priceFt,
      priceLabel: priceLabel ?? "—",
      meta: meta ?? [year.map(String.init), km.map { "\($0) km" }].compactMap { $0 }.joined(separator: " · "),
      imageUrl: imageUrl.flatMap(URL.init(string:)),
      externalUrl: isDemo ? nil : url.flatMap(URL.init(string:)),
      searchUrl: searchUrl.flatMap(URL.init(string:)) ?? Self.fallbackSearchUrl(brand: brand, model: model),
      badge: isDemo ? "demo" : "használtautó.hu",
      isDemo: isDemo
    )
  }

  private static func fallbackSearchUrl(brand: String?, model: String?) -> URL? {
    guard let brand, !brand.isEmpty else {
      return URL(string: "https://www.hasznaltauto.hu/szemelyauto")
    }
    let b = slugify(brand)
    if let model, !model.isEmpty {
      return URL(string: "https://www.hasznaltauto.hu/szemelyauto/\(b)/\(slugify(model))")
    }
    return URL(string: "https://www.hasznaltauto.hu/szemelyauto/\(b)")
  }

  private static func slugify(_ text: String) -> String {
    text
      .folding(options: .diacriticInsensitive, locale: .current)
      .lowercased()
      .replacingOccurrences(of: " ", with: "_")
      .replacingOccurrences(of: "-", with: "_")
  }
}

enum HasznaltautoSearchClient {
  /// Simulator → Mac localhost Autosweb
  static var baseURL = URL(string: "http://127.0.0.1:3456")!

  static func search(filter: SearchFilter, demo: Bool = false) async throws -> HaSearchResponse {
    var request = URLRequest(url: baseURL.appendingPathComponent("api/ha-search"))
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.timeoutInterval = 300

    let body: [String: Any] = [
      "demo": demo,
      "maxPages": 10,
      "filter": encodeFilter(filter),
    ]
    request.httpBody = try JSONSerialization.data(withJSONObject: body)

    let (data, response) = try await URLSession.shared.data(for: request)
    guard let http = response as? HTTPURLResponse else {
      throw URLError(.badServerResponse)
    }
    guard (200..<300).contains(http.statusCode) else {
      let msg = String(data: data, encoding: .utf8) ?? "HTTP \(http.statusCode)"
      throw NSError(domain: "HasznaltautoSearch", code: http.statusCode, userInfo: [
        NSLocalizedDescriptionKey: msg,
      ])
    }
    return try JSONDecoder().decode(HaSearchResponse.self, from: data)
  }

  private static func encodeFilter(_ filter: SearchFilter) -> [String: Any] {
    var dict: [String: Any] = [
      "gyartmanyok": filter.gyartmanyok,
      "modellek": filter.modellek,
      "fuels": filter.fuels.map(\.rawValue),
    ]
    if let v = filter.arTol { dict["arTol"] = v }
    if let v = filter.arIg { dict["arIg"] = v }
    if let v = filter.evTol { dict["evTol"] = v }
    if let v = filter.evIg { dict["evIg"] = v }
    if let v = filter.kmTol { dict["kmTol"] = v }
    if let v = filter.kmIg { dict["kmIg"] = v }
    return dict
  }
}
