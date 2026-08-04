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
  let externalUrl: URL?
  let badge: String?

  var sourceLabel: String {
    switch source {
    case .local: return "Add el autod"
    case .hasznaltauto: return "használtautó.hu"
    }
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
      badge: car.badge
    )
  }
}

struct HaSearchResponse: Decodable {
  let ok: Bool?
  let mode: String?
  let sourceUrl: String?
  let warning: String?
  let results: [HaRemoteListing]
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

  func asUnified() -> UnifiedListing {
    UnifiedListing(
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
      externalUrl: url.flatMap(URL.init(string:)),
      badge: "használtautó.hu"
    )
  }
}

enum HasznaltautoSearchClient {
  /// Simulator → Mac localhost Autosweb
  static var baseURL = URL(string: "http://127.0.0.1:3456")!

  static func search(filter: SearchFilter, demo: Bool = false) async throws -> HaSearchResponse {
    var request = URLRequest(url: baseURL.appendingPathComponent("api/ha-search"))
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.timeoutInterval = 180

    let body: [String: Any] = [
      "demo": demo,
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
