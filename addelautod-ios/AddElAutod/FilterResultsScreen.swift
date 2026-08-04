import SwiftUI
import UIKit

/// Keresőfeltételek találati listája — saját demo + használtautó.hu (ideiglenes)
struct FilterResultsScreen: View {
  @EnvironmentObject private var store: SearchStore
  var onBack: () -> Void

  @State private var remote: [UnifiedListing] = []
  @State private var loadingRemote = true
  @State private var warning: String?
  @State private var remoteMode: String?
  @State private var demoTapItem: UnifiedListing?

  private var localItems: [UnifiedListing] {
    DemoListing.filtered(for: store.filter).map(UnifiedListing.fromLocal)
  }

  private var allItems: [UnifiedListing] {
    localItems + remote
  }

  var body: some View {
    VStack(spacing: 0) {
      ScreenHeader(
        title: "Találatok",
        subtitle: subtitle,
        onBack: onBack
      )

      if let warning, !warning.isEmpty {
        Text(warning)
          .font(.caption)
          .foregroundStyle(.orange)
          .frame(maxWidth: .infinity, alignment: .leading)
          .padding(.horizontal, 16)
          .padding(.vertical, 8)
          .background(Color.orange.opacity(0.08))
      }

      ScrollView {
        LazyVStack(spacing: 12) {
          Text(store.filter.summary)
            .font(.footnote)
            .foregroundStyle(AppTheme.textSecondary)
            .frame(maxWidth: .infinity, alignment: .leading)

          if loadingRemote {
            HStack(spacing: 8) {
              ProgressView()
              Text("használtautó.hu keresés…")
                .font(.footnote)
                .foregroundStyle(AppTheme.textSecondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
          }

          if allItems.isEmpty, !loadingRemote {
            Text("Nincs találat ezekkel a feltételekkel.")
              .font(.body)
              .foregroundStyle(AppTheme.textSecondary)
              .frame(maxWidth: .infinity)
              .padding(.top, 40)
          } else {
            ForEach(allItems) { item in
              listingRow(item)
            }
          }
        }
        .padding(16)
        .padding(.bottom, 24)
      }
    }
    .background(AppTheme.bg)
    .task {
      await loadRemote()
    }
    .alert(
      "Demo találat",
      isPresented: Binding(
        get: { demoTapItem != nil },
        set: { if !$0 { demoTapItem = nil } }
      )
    ) {
      Button("Márka keresés Safariban") {
        if let item = demoTapItem, let url = item.searchUrl {
          UIApplication.shared.open(url)
        }
        demoTapItem = nil
      }
      Button("OK", role: .cancel) {
        demoTapItem = nil
      }
    } message: {
      Text("Ez nem élő hirdetés-link (a hamis link 404 lenne). Valós autóhoz indítsd az Autoswebet Chrome-mal: cd autosweb && npm start — utána új keresés.")
    }
  }

  private var subtitle: String {
    let local = localItems.count
    let ha = remote.count
    if loadingRemote {
      return "\(local) saját · használtautó.hu…"
    }
    if remoteMode == "live" {
      return "\(local) saját · \(ha) használtautó.hu"
    }
    return "\(local) saját · \(ha) HA demo"
  }

  @ViewBuilder
  private func listingRow(_ item: UnifiedListing) -> some View {
    Button {
      openExternalIfNeeded(item)
    } label: {
      HStack(alignment: .top, spacing: 12) {
        thumb(item)

        VStack(alignment: .leading, spacing: 6) {
          HStack(alignment: .top) {
            Text(item.title)
              .font(.headline)
              .foregroundStyle(AppTheme.text)
              .multilineTextAlignment(.leading)
            Spacer(minLength: 8)
            Text(item.sourceLabel)
              .font(.caption2.weight(.bold))
              .foregroundStyle(item.source == .hasznaltauto ? Color.orange : AppTheme.accent)
              .padding(.horizontal, 8)
              .padding(.vertical, 3)
              .background(
                (item.source == .hasznaltauto ? Color.orange : AppTheme.accent).opacity(0.12)
              )
              .clipShape(Capsule())
          }

          Text(item.priceLabel)
            .font(.title3.weight(.bold))
            .foregroundStyle(AppTheme.text)

          Text(detailLine(item))
            .font(.subheadline)
            .foregroundStyle(AppTheme.textSecondary)

          if item.source == .hasznaltauto {
            Text(item.canOpenLiveListing ? "Megnyitás Safariban ›" : "Demo · nincs élő link")
              .font(.caption.weight(.medium))
              .foregroundStyle(item.canOpenLiveListing ? AppTheme.accent : AppTheme.textSecondary)
          }
        }
      }
      .padding(14)
      .background(AppTheme.bgElevated)
      .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
      .overlay(
        RoundedRectangle(cornerRadius: 16, style: .continuous)
          .stroke(
            item.source == .hasznaltauto ? Color.orange.opacity(0.35) : AppTheme.border,
            lineWidth: item.source == .hasznaltauto ? 1.5 : 0.5
          )
      )
    }
    .buttonStyle(.plain)
  }

  private func thumb(_ item: UnifiedListing) -> some View {
    Group {
      if let url = item.imageUrl {
        AsyncImage(url: url) { phase in
          switch phase {
          case .success(let image):
            image.resizable().scaledToFill()
          default:
            placeholderThumb
          }
        }
      } else {
        placeholderThumb
      }
    }
    .frame(width: 88, height: 66)
    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
  }

  private var placeholderThumb: some View {
    RoundedRectangle(cornerRadius: 10, style: .continuous)
      .fill(Color(.tertiarySystemFill))
      .overlay {
        Image(systemName: "car.fill")
          .foregroundStyle(.secondary)
      }
  }

  private func detailLine(_ item: UnifiedListing) -> String {
    var parts: [String] = []
    if let y = item.year { parts.append(String(y)) }
    if let km = item.km { parts.append("\(km.formatted()) km") }
    if !item.brand.isEmpty { parts.append(item.brand) }
    if parts.isEmpty { return item.meta }
    return parts.joined(separator: " · ")
  }

  private func openExternalIfNeeded(_ item: UnifiedListing) {
    guard item.source == .hasznaltauto else { return }

    // Élő scrape → egyedi hirdetés Safariban
    if item.canOpenLiveListing, let url = item.externalUrl {
      UIApplication.shared.open(url)
      return
    }

    // Demo / hamis link → ne 404; magyarázat + opcionális márka keresés
    demoTapItem = item
  }

  @MainActor
  private func loadRemote() async {
    loadingRemote = true
    warning = nil
    defer { loadingRemote = false }
    do {
      let response = try await HasznaltautoSearchClient.search(filter: store.filter)
      let demo = response.isDemoMode
      remote = response.results
        .map { $0.asUnified(forceDemo: demo) }
        .filter { demo ? true : $0.canOpenLiveListing }
      remoteMode = response.mode
      if demo {
        warning = (response.warning ?? "Demo mód.") + " Valós Safari-hirdetéshez: Autosweb + Chrome, majd új keresés."
      } else {
        warning = response.warning
      }
    } catch {
      do {
        let response = try await HasznaltautoSearchClient.search(filter: store.filter, demo: true)
        remote = response.results.map { $0.asUnified(forceDemo: true) }
        remoteMode = "demo"
        warning = "Autosweb élő keresés nem elérhető — demo. Valós linkhez: cd autosweb && npm start (Chrome)."
      } catch {
        remote = localDemoHa(store.filter)
        remoteMode = "local-demo"
        warning = "Autosweb nem fut (127.0.0.1:3456). Demo kártyák — Safari csak élő scrape után nyit egyedi hirdetést."
      }
    }
  }
}

private func localDemoHa(_ filter: SearchFilter) -> [UnifiedListing] {
  let raw: [(String, String, Int, Int, Int)] = [
    ("BMW", "320d", 2019, 142_000, 8_990_000),
    ("BMW", "520d", 2018, 168_000, 7_950_000),
    ("AUDI", "A4", 2021, 95_000, 7_900_000),
    ("AUDI", "A3", 2020, 78_000, 6_490_000),
    ("OPEL", "Astra", 2019, 98_000, 4_290_000),
    ("OPEL", "Astra", 2021, 54_000, 5_890_000),
    ("OPEL", "Corsa", 2020, 61_000, 3_990_000),
    ("VOLKSWAGEN", "Golf", 2021, 68_000, 6_250_000),
    ("TOYOTA", "Corolla", 2022, 51_000, 7_490_000),
    ("FORD", "Focus", 2019, 89_000, 4_590_000),
    ("SKODA", "Octavia", 2018, 118_000, 5_100_000),
    ("SUZUKI", "Swift", 2023, 28_000, 3_600_000),
  ]

  func slug(_ s: String) -> String {
    s.folding(options: .diacriticInsensitive, locale: .current)
      .lowercased()
      .replacingOccurrences(of: " ", with: "_")
  }

  var samples: [UnifiedListing] = raw.enumerated().map { index, row in
    let (brand, model, year, km, price) = row
    let b = slug(brand)
    let m = slug(model)
    return UnifiedListing(
      id: "ha-local-demo-\(40000000 + index)",
      source: .hasznaltauto,
      title: "\(brand) \(model) (\(year))",
      brand: brand,
      model: model,
      year: year,
      km: km,
      priceFt: price,
      priceLabel: "\(price.formatted()) Ft",
      meta: "\(year) · \(km.formatted()) km",
      imageUrl: nil,
      externalUrl: nil,
      searchUrl: URL(string: "https://www.hasznaltauto.hu/szemelyauto/\(b)/\(m)"),
      badge: "demo",
      isDemo: true
    )
  }

  if let brand = filter.gyartmanyok.first {
    let existing = samples.filter {
      $0.brand.uppercased().contains(brand.uppercased()) || brand.uppercased().contains($0.brand.uppercased())
    }
    if existing.count < 6 {
      let model = filter.modellek.first ?? existing.first?.model ?? "320d"
      let b = slug(brand)
      let m = slug(model)
      let need = max(0, 8 - existing.count)
      let generated: [UnifiedListing] = (0..<need).map { i in
        let year = 2017 + i
        let km = 35000 + i * 11000
        let price = 3_800_000 + i * 450_000
        return UnifiedListing(
          id: "ha-local-gen-\(50000000 + i)",
          source: .hasznaltauto,
          title: "\(brand) \(model) (\(year))",
          brand: brand.uppercased(),
          model: model,
          year: year,
          km: km,
          priceFt: price,
          priceLabel: "\(price.formatted()) Ft",
          meta: "\(year) · \(km.formatted()) km",
          imageUrl: nil,
          externalUrl: nil,
          searchUrl: URL(string: "https://www.hasznaltauto.hu/szemelyauto/\(b)/\(m)"),
          badge: "demo",
          isDemo: true
        )
      }
      samples.append(contentsOf: generated)
    }
  }

  return samples.filter { item in
    if !filter.gyartmanyok.isEmpty {
      let brands = filter.gyartmanyok.map { $0.uppercased() }
      if !brands.contains(where: { item.brand.uppercased().contains($0) || $0.contains(item.brand.uppercased()) }) {
        return false
      }
    }
    if !filter.modellek.isEmpty {
      let hay = "\(item.model) \(item.title)".lowercased()
      if !filter.modellek.contains(where: { hay.contains($0.lowercased()) }) {
        return false
      }
    }
    if let tol = filter.evTol, let y = item.year, y < tol { return false }
    if let ig = filter.evIg, let y = item.year, y > ig { return false }
    if let tol = filter.kmTol, let km = item.km, km < tol { return false }
    if let ig = filter.kmIg, let km = item.km, km > ig { return false }
    if let tol = filter.arTol, let p = item.priceFt, p < tol { return false }
    if let ig = filter.arIg, let p = item.priceFt, p > ig { return false }
    return true
  }
}
