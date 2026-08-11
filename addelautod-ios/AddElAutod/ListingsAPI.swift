import Foundation

/// Autosweb `GET /api/listings` — ugyanaz, mint a webes főoldal rács.
enum ListingsAPI {
  static var baseURL: URL { PartnerRecommendationsClient.baseURL }
  static let homeFetchLimit = 500

  struct HomeListing: Identifiable, Equatable {
    let id: String
    let title: String
    let priceLabel: String
    let meta: String
    let badge: String?
    let updatedAt: String
    let imageURLs: [URL]
    /// Tulajdonos (Autosweb users.id), ha van.
    var userId: String? = nil
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

    func withBadge(_ badge: String?) -> HomeListing {
      HomeListing(
        id: id,
        title: title,
        priceLabel: priceLabel,
        meta: meta,
        badge: badge,
        updatedAt: updatedAt,
        imageURLs: imageURLs,
        userId: userId,
        brand: brand,
        model: model,
        year: year,
        km: km,
        priceFt: priceFt,
        fuelRaw: fuelRaw
      )
    }
  }

  /// Relatív API út — NE `appendingPathComponent("a/b/c")` (a `/` %-kódolódhat).
  static func apiURL(_ path: String, query: [URLQueryItem] = []) -> URL? {
    let trimmed = path.hasPrefix("/") ? String(path.dropFirst()) : path
    guard var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false) else {
      return nil
    }
    let basePath = components.path.hasSuffix("/") ? String(components.path.dropLast()) : components.path
    components.path = basePath + "/" + trimmed
    if !query.isEmpty {
      components.queryItems = query
    }
    return components.url
  }

  /// Relatív `/uploads/...` vagy abszolút URL → betölthető kép.
  static func absoluteImageURL(_ path: String?) -> URL? {
    let raw = (path ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    guard !raw.isEmpty else { return nil }
    if raw.hasPrefix("http://") || raw.hasPrefix("https://") {
      return URL(string: raw)
    }
    var base = baseURL.absoluteString
    while base.hasSuffix("/") { base.removeLast() }
    let pathPart = raw.hasPrefix("/") ? raw : "/\(raw)"
    return URL(string: base + pathPart)
  }

  enum ListingsError: LocalizedError {
    case unreachable
    case server(String)
    case notLoggedIn
    case needsPhoto

    var errorDescription: String? {
      switch self {
      case .unreachable:
        return "Autosweb nem elérhető (3456). Indítsd az Autosweb-indítót (feature ág)."
      case .server(let m):
        return m
      case .notLoggedIn:
        return "A feladáshoz / Hirdetéseimhez be kell jelentkezned."
      case .needsPhoto:
        return "Legalább egy fénykép kell a feladáshoz."
      }
    }
  }

  /// Új hirdetés feladása → `POST /api/listings` (listings.db, status: feladott).
  /// `photos`: base64 JPEG lista, első = főkép.
  /// `token`: kötelező feladáskor → user_id (Hirdetéseim).
  @discardableResult
  static func saveListing(
    form: [String: Any],
    status: String = "feladott",
    photos: [String] = [],
    token: String? = nil
  ) async throws -> Int {
    guard let token, !token.isEmpty else { throw ListingsError.notLoggedIn }
    if status == "feladott", photos.isEmpty { throw ListingsError.needsPhoto }
    guard let url = apiURL("api/listings") else { throw ListingsError.unreachable }
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.timeoutInterval = photos.isEmpty ? 30 : 120
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue("application/json", forHTTPHeaderField: "Accept")
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    var body: [String: Any] = ["form": form, "status": status]
    if !photos.isEmpty {
      body["photos"] = photos
    }
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
      if http.statusCode == 401 { throw ListingsError.notLoggedIn }
      if err == "Ismeretlen API." || err?.contains("Ismeretlen") == true {
        throw ListingsError.server("Régi Autosweb — zárd be, indítsd újra az Autosweb-indito.command-ot (online).")
      }
      throw ListingsError.server(err ?? "HTTP \(http.statusCode)")
    }
    let decoded = try JSONDecoder().decode(SaveResponse.self, from: data)
    guard let id = decoded.listing?.id else {
      throw ListingsError.server("Mentés sikertelen — nincs azonosító.")
    }
    // Ha a szerver nem mentett képet, jelezzük (régi Autosweb — nincs listing-photos).
    if status == "feladott", !photos.isEmpty {
      let foKep = (decoded.listing?.fo_kep ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
      if foKep.isEmpty {
        throw ListingsError.server(
          "A kép nem mentődött el. Indítsd újra az Autosweb-indito.command-ot (online frissítés), majd add fel újra."
        )
      }
    }
    PostedListingsStore.remember(id)
    return id
  }

  /// Webes főoldal: összes hirdetés, legújabb elöl.
  static func fetchHomeListings(limit: Int = homeFetchLimit) async throws -> [HomeListing] {
    guard let url = apiURL("api/listings", query: [URLQueryItem(name: "limit", value: String(limit))]) else {
      throw ListingsError.unreachable
    }
    return try await fetchListings(url: url, token: nil, statusBadge: false)
  }

  /// Bejelentkezett user saját hirdetései (+ eszközön feladott ID-k visszaesés).
  static func fetchMyListings(token: String?, limit: Int = 200) async throws -> [HomeListing] {
    guard let token, !token.isEmpty else { throw ListingsError.notLoggedIn }

    var byId: [String: HomeListing] = [:]
    var mineError: Error?

    if let mineURL = apiURL("api/listings/mine", query: [URLQueryItem(name: "limit", value: String(limit))]) {
      do {
        let mine = try await fetchListings(url: mineURL, token: token, statusBadge: true)
        for item in mine { byId[item.id] = item }
      } catch {
        mineError = error
      }
    }

    let localIds = PostedListingsStore.ids()
    if !localIds.isEmpty {
      do {
        let all = try await fetchHomeListings(limit: homeFetchLimit)
        for item in all where localIds.contains(item.id) {
          if byId[item.id] == nil {
            byId[item.id] = item.withBadge(item.badge ?? "Feladott")
          }
        }
      } catch {
        if byId.isEmpty { throw error }
      }
    }

    if byId.isEmpty, let mineError {
      throw mineError
    }

    return byId.values.sorted { a, b in
      a.updatedAt > b.updatedAt
    }
  }

  // MARK: - Fetch helper

  private static func fetchListings(url: URL, token: String?, statusBadge: Bool) async throws -> [HomeListing] {
    var request = URLRequest(url: url)
    request.timeoutInterval = 25
    request.setValue("application/json", forHTTPHeaderField: "Accept")
    if let token, !token.isEmpty {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

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
      if http.statusCode == 401 {
        throw ListingsError.notLoggedIn
      }
      if err == "Ismeretlen API." {
        throw ListingsError.server("Régi Autosweb — indítsd újra az Autosweb-indito.command-ot.")
      }
      throw ListingsError.server(err ?? "HTTP \(http.statusCode)")
    }

    let decoded = try JSONDecoder().decode(ListResponse.self, from: data)
    let cards = decoded.listings.map { mapListing($0, statusBadge: statusBadge) }
    return cards.sorted { a, b in
      a.updatedAt > b.updatedAt
    }
  }

  // MARK: - Mapping

  private static func mapListing(_ row: RemoteListing, statusBadge: Bool) -> HomeListing {
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
      guard statusBadge, row.status == "feladott" else { return nil }
      return "Feladott"
    }()
    let images = collectImageURLs(
      foKep: row.fo_kep,
      previewURL: preview?.imageUrl,
      previewURLs: preview?.imageUrls
    )
    let kmNum: Int? = {
      let digits = (preview?.km ?? "").filter(\.isNumber)
      return digits.isEmpty ? nil : Int(digits)
    }()
    let owner: String? = {
      if let n = row.user_id { return String(n) }
      if let s = row.userId, !s.isEmpty { return s }
      return nil
    }()
    return HomeListing(
      id: String(row.id),
      title: title,
      priceLabel: price,
      meta: meta,
      badge: badge,
      updatedAt: row.updated_at ?? row.created_at ?? "",
      imageURLs: images,
      userId: owner,
      brand: preview?.filter?.gyartmany,
      model: preview?.filter?.modell,
      year: preview?.filter?.gyartasi_ev,
      km: kmNum,
      priceFt: preview?.priceNum,
      fuelRaw: preview?.filter?.uzemanyag
    )
  }

  static func collectImageURLs(foKep: String?, previewURL: String?, previewURLs: [String]?) -> [URL] {
    var seen = Set<String>()
    var images: [URL] = []
    func append(_ raw: String?) {
      guard let url = absoluteImageURL(raw) else { return }
      let key = url.absoluteString
      guard !seen.contains(key) else { return }
      seen.insert(key)
      images.append(url)
    }
    append(foKep)
    append(previewURL)
    for path in previewURLs ?? [] {
      append(path)
    }
    return images
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
    let fo_kep: String?
  }

  private struct RemoteListing: Decodable {
    let id: Int
    let hirdetes_cime: String?
    let fo_kep: String?
    let status: String?
    let created_at: String?
    let updated_at: String?
    let user_id: Int?
    let userId: String?
    let preview: RemotePreview?
  }

  private struct RemotePreview: Decodable {
    let title: String?
    let price: String?
    let priceNum: Int?
    let km: String?
    let specLine: String?
    let imageUrl: String?
    let imageUrls: [String]?
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

/// Eszközön feladott hirdetés-ID-k — Hirdetéseim visszaesés, ha a szerveren még nincs user_id.
enum PostedListingsStore {
  private static let key = "addelautod.postedListingIds.v1"

  static func remember(_ id: Int) {
    var ids = Set(ids().compactMap(Int.init))
    ids.insert(id)
    UserDefaults.standard.set(ids.sorted().map(String.init), forKey: key)
  }

  static func ids() -> Set<String> {
    let raw = UserDefaults.standard.stringArray(forKey: key) ?? []
    return Set(raw.filter { !$0.isEmpty })
  }
}
