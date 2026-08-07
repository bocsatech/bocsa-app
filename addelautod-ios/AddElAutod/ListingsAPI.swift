import Foundation

/// Autosweb `GET /api/listings` — ugyanaz, mint a webes főoldal rács.
enum ListingsAPI {
  static var baseURL = PartnerRecommendationsClient.baseURL
  static let homeFetchLimit = 500

  struct HomeListing: Identifiable, Equatable {
    let id: String
    let title: String
    let priceLabel: String
    let meta: String
    let badge: String?
    let updatedAt: String
    let imageURLs: [URL]

    var featuredAd: FeaturedAd {
      FeaturedAd(
        id: id,
        title: title,
        priceLabel: priceLabel,
        meta: meta,
        badge: badge
      )
    }

    var messageTarget: ListingMessageTarget {
      ListingMessageTarget(
        listingId: id,
        title: title,
        priceLabel: priceLabel,
        meta: meta
      )
    }

    /// Könnyű kártya a listához (részletes adat a loaderben jön).
    var cardDetail: ListingDetail {
      ListingDetail(
        id: id,
        title: title,
        priceLabel: priceLabel,
        kmLabel: meta.split(separator: "·").dropFirst().first.map { String($0).trimmingCharacters(in: .whitespaces) } ?? "—",
        registrationLabel: meta.split(separator: "·").first.map { String($0).trimmingCharacters(in: .whitespaces) } ?? "—",
        imageURLs: imageURLs,
        meta: meta,
        badge: badge,
        vehicleRows: [],
        equipment: [],
        description: "",
        sellerName: "Eladó",
        sellerPhone: nil,
        addressLines: [],
        mapQuery: nil
      )
    }
  }

  /// Relatív `/uploads/...` vagy abszolút URL → betölthető kép.
  static func absoluteImageURL(_ path: String?) -> URL? {
    let raw = (path ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    guard !raw.isEmpty else { return nil }
    if raw.hasPrefix("http://") || raw.hasPrefix("https://") {
      return URL(string: raw)
    }
    let trimmed = raw.hasPrefix("/") ? String(raw.dropFirst()) : raw
    return URL(string: trimmed, relativeTo: baseURL)?.absoluteURL
  }

  enum ListingsError: LocalizedError {
    case unreachable
    case server(String)

    var errorDescription: String? {
      switch self {
      case .unreachable:
        return "Autosweb nem elérhető (3456). Indítsd az Autosweb-indítót."
      case .server(let m):
        return m
      }
    }
  }

  /// Webes főoldal: összes hirdetés, legújabb elöl.
  static func fetchHomeListings(limit: Int = homeFetchLimit) async throws -> [HomeListing] {
    var components = URLComponents(
      url: baseURL.appendingPathComponent("api/listings"),
      resolvingAgainstBaseURL: false
    )!
    components.queryItems = [URLQueryItem(name: "limit", value: String(limit))]
    guard let url = components.url else { throw ListingsError.unreachable }

    var request = URLRequest(url: url)
    request.timeoutInterval = 25
    request.setValue("application/json", forHTTPHeaderField: "Accept")

    let data: Data
    let response: URLResponse
    do {
      (data, response) = try await URLSession.shared.data(for: request)
    } catch {
      throw ListingsError.unreachable
    }
    guard let http = response as? HTTPURLResponse else { throw ListingsError.unreachable }
    if http.statusCode >= 400 {
      let err = (try? JSONDecoder().decode(ErrBody.self, from: data))?.error
      if err == "Ismeretlen API." {
        throw ListingsError.server("Régi Autosweb — indítsd újra az Autosweb-indito.command-ot.")
      }
      throw ListingsError.server(err ?? "HTTP \(http.statusCode)")
    }

    let decoded = try JSONDecoder().decode(ListResponse.self, from: data)
    let cards = decoded.listings.map(Self.mapListing)
    return cards.sorted { a, b in
      a.updatedAt > b.updatedAt
    }
  }

  // MARK: - Mapping

  private static func mapListing(_ row: RemoteListing) -> HomeListing {
    let preview = row.preview
    let rawTitle = preview?.title ?? row.hirdetes_cime ?? "Hirdetés #\(row.id)"
    let title = displayTitle(rawTitle, year: preview?.filter?.gyartasi_ev, specLine: preview?.specLine)
    let price = (preview?.price).flatMap { $0.isEmpty ? nil : $0 } ?? "—"
    let year = yearLabel(preview?.filter?.gyartasi_ev, specLine: preview?.specLine)
    let km = (preview?.km).flatMap { $0.isEmpty ? nil : $0 } ?? "—"
    let fuel = fuelLabel(preview?.filter?.uzemanyag)
    let meta = [year, km, fuel].joined(separator: " · ")
    let badge: String? = {
      if row.status == "feladott" { return "Feladott" }
      return nil
    }()
    var images: [URL] = []
    if let u = absoluteImageURL(row.fo_kep) { images.append(u) }
    if let u = absoluteImageURL(preview?.imageUrl), !images.contains(u) { images.append(u) }
    return HomeListing(
      id: String(row.id),
      title: title,
      priceLabel: price,
      meta: meta,
      badge: badge,
      updatedAt: row.updated_at ?? row.created_at ?? "",
      imageURLs: images
    )
  }

  private static func displayTitle(_ raw: String, year: Int?, specLine: String?) -> String {
    var base = raw.trimmingCharacters(in: .whitespacesAndNewlines)
    if base.lowercased().hasPrefix("eladó ") {
      base = String(base.dropFirst(6))
    }
    let upper = base.uppercased()
    if upper.range(of: #"\(\d{4}"#, options: .regularExpression) != nil {
      return upper
    }
    if let y = year, y > 1900 {
      return "\(upper) (\(y))"
    }
    if let spec = specLine,
       let match = spec.range(of: #"\b((?:19|20)\d{2})\b"#, options: .regularExpression) {
      return "\(upper) (\(spec[match]))"
    }
    return upper
  }

  private static func yearLabel(_ year: Int?, specLine: String?) -> String {
    if let y = year, y > 1900 { return String(y) }
    if let spec = specLine,
       let match = spec.range(of: #"\b((?:19|20)\d{2})\b"#, options: .regularExpression) {
      return String(spec[match])
    }
    return "—"
  }

  private static func fuelLabel(_ value: String?) -> String {
    let fuel = (value ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    if fuel.isEmpty { return "—" }
    if fuel.lowercased() == "dízel" || fuel.lowercased() == "diesel" { return "Dízel" }
    return fuel
  }

  // MARK: - Decode

  private struct ListResponse: Decodable {
    let listings: [RemoteListing]
  }

  private struct RemoteListing: Decodable {
    let id: Int
    let hirdetes_cime: String?
    let fo_kep: String?
    let status: String?
    let created_at: String?
    let updated_at: String?
    let preview: RemotePreview?
  }

  private struct RemotePreview: Decodable {
    let title: String?
    let price: String?
    let km: String?
    let specLine: String?
    let imageUrl: String?
    let filter: RemoteFilter?
  }

  private struct RemoteFilter: Decodable {
    let uzemanyag: String?
    let gyartasi_ev: Int?
  }

  private struct ErrBody: Decodable {
    let error: String?
  }
}
