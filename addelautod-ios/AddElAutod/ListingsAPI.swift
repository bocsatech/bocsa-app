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
    /// Keresőszűréshez (preview)
    var brand: String? = nil
    var model: String? = nil
    var year: Int? = nil
    var km: Int? = nil
    var priceFt: Int? = nil
    var fuelRaw: String? = nil

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

  /// Új hirdetés feladása → `POST /api/listings` (listings.db, status: feladott).
  @discardableResult
  static func saveListing(form: [String: Any], status: String = "feladott") async throws -> Int {
    let url = baseURL.appendingPathComponent("api/listings")
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.timeoutInterval = 30
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue("application/json", forHTTPHeaderField: "Accept")
    let body: [String: Any] = ["form": form, "status": status]
    request.httpBody = try JSONSerialization.data(withJSONObject: body)

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
      throw ListingsError.server(err ?? "HTTP \(http.statusCode)")
    }
    let decoded = try JSONDecoder().decode(SaveResponse.self, from: data)
    guard let id = decoded.listing?.id else {
      throw ListingsError.server("Mentés sikertelen — nincs azonosító.")
    }
    return id
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
    var title = displayTitle(rawTitle, year: preview?.filter?.gyartasi_ev, specLine: preview?.specLine)
    title = sanitizeListingText(title)
    if title.isEmpty {
      title = "Hirdetés #\(row.id)"
    }
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
    let kmNum: Int? = {
      let digits = (preview?.km ?? "").filter(\.isNumber)
      return digits.isEmpty ? nil : Int(digits)
    }()
    return HomeListing(
      id: String(row.id),
      title: title,
      priceLabel: price,
      meta: meta,
      badge: badge,
      updatedAt: row.updated_at ?? row.created_at ?? "",
      imageURLs: images,
      brand: preview?.filter?.gyartmany,
      model: preview?.filter?.modell,
      year: preview?.filter?.gyartasi_ev,
      km: kmNum,
      priceFt: preview?.priceNum,
      fuelRaw: preview?.filter?.uzemanyag
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

  private struct SaveResponse: Decodable {
    let listing: SavedListing?
  }

  private struct SavedListing: Decodable {
    let id: Int
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
    let priceNum: Int?
    let km: String?
    let specLine: String?
    let imageUrl: String?
    let filter: RemoteFilter?
  }

  private struct RemoteFilter: Decodable {
    let uzemanyag: String?
    let gyartasi_ev: Int?
    let gyartmany: String?
    let modell: String?
  }

  private struct ErrBody: Decodable {
    let error: String?
  }

  /// Élő Autosweb lista szűrése a kereső feltételekkel.
  static func matches(_ ad: HomeListing, filter: SearchFilter) -> Bool {
    if !filter.gyartmanyok.isEmpty {
      let brands = Set(filter.gyartmanyok.map { $0.uppercased() })
      let b = (ad.brand ?? "").uppercased()
      let title = ad.title.uppercased()
      if !brands.contains(where: { b.contains($0) || title.contains($0) }) { return false }
    }
    if !filter.modellek.isEmpty {
      let models = filter.modellek.map { $0.lowercased() }
      let m = (ad.model ?? "").lowercased()
      let title = ad.title.lowercased()
      if !models.contains(where: { m.contains($0) || title.contains($0) }) { return false }
    }
    if !filter.fuels.isEmpty {
      let raw = (ad.fuelRaw ?? "").lowercased()
      let ok = filter.fuels.contains { fuel in
        switch fuel {
        case .diesel: return raw.contains("dízel") || raw.contains("diesel")
        case .benzin: return raw.contains("benzin") && !raw.contains("gáz")
        case .hybrid: return raw.contains("hibrid") || raw.contains("hybrid")
        case .elektromos: return raw.contains("elektrom")
        case .benzinGaz: return raw.contains("gáz") || raw.contains("gaz")
        }
      }
      if !ok { return false }
    }
    if let tol = filter.evTol, let y = ad.year, y < tol { return false }
    if let ig = filter.evIg, let y = ad.year, y > ig { return false }
    if let tol = filter.kmTol, let km = ad.km, km < tol { return false }
    if let ig = filter.kmIg, let km = ad.km, km > ig { return false }
    if let tol = filter.arTol, let p = ad.priceFt, p < tol { return false }
    if let ig = filter.arIg, let p = ad.priceFt, p > ig { return false }
    return true
  }
}
