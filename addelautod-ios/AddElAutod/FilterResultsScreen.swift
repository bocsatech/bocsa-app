import SwiftUI
import UIKit

/// Keresőfeltételek találati listája — saját + élő használtautó.hu (egy kártya = egy autó)
struct FilterResultsScreen: View {
  @EnvironmentObject private var store: SearchStore
  var onBack: () -> Void

  @State private var remote: [UnifiedListing] = []
  @State private var loadingRemote = true
  @State private var warning: String?
  @State private var remoteMode: String?
  @State private var needsAutosweb = false

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
            VStack(spacing: 10) {
              ProgressView()
              Text("használtautó.hu élő keresés…")
                .font(.footnote)
                .foregroundStyle(AppTheme.textSecondary)
              Text("Chrome ablak nyílhat — Cloudflare esetén jelöld be a pipát.")
                .font(.caption2)
                .foregroundStyle(AppTheme.textSecondary)
                .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
          }

          if needsAutosweb, !loadingRemote {
            autoswebHelpCard
          }

          if allItems.isEmpty, !loadingRemote, !needsAutosweb {
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
  }

  private var subtitle: String {
    let local = localItems.count
    let ha = remote.count
    if loadingRemote {
      return "\(local) saját · használtautó.hu…"
    }
    return "\(local) saját · \(ha) használtautó.hu"
  }

  private var autoswebHelpCard: some View {
    VStack(alignment: .leading, spacing: 10) {
      Text("Élő használtautó.hu kell")
        .font(.headline)
        .foregroundStyle(AppTheme.text)
      Text("Minden találat külön autó a listában, kattintásra Safari az adott hirdetést nyitja. Ehhez a Macen fusson az Autosweb.")
        .font(.footnote)
        .foregroundStyle(AppTheme.textSecondary)
      Text("Terminál (egészben):")
        .font(.caption.weight(.semibold))
      Text(autoswebStartCommand)
        .font(.system(.caption2, design: .monospaced))
        .foregroundStyle(AppTheme.text)
        .textSelection(.enabled)
      Button("Újrapróbálás") {
        Task { await loadRemote() }
      }
      .buttonStyle(.borderedProminent)
    }
    .padding(14)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(Color.orange.opacity(0.08))
    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
  }

  private var autoswebStartCommand: String {
    """
    lsof -ti tcp:3456 | xargs kill -9 2>/dev/null; cd ~/Downloads && rm -rf bocsa-ha-tmp && git clone --depth 1 -b cursor/addelautod-mobile-de62 https://github.com/bocsatech/bocsa-app.git bocsa-ha-tmp && cd bocsa-ha-tmp/autosweb && npm install && npx playwright install chromium && npm start
    """
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
            Text("Megnyitás Safariban ›")
              .font(.caption.weight(.medium))
              .foregroundStyle(AppTheme.accent)
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
    guard item.canOpenLiveListing, let url = item.externalUrl else {
      warning = "Ehhez a találathoz nincs egyedi hirdetés-link."
      return
    }
    UIApplication.shared.open(url)
  }

  @MainActor
  private func loadRemote() async {
    loadingRemote = true
    warning = nil
    needsAutosweb = false
    remote = []
    defer { loadingRemote = false }

    do {
      let response = try await HasznaltautoSearchClient.search(filter: store.filter)
      remoteMode = response.mode

      // Csak élő, egyedi hirdetés URL-ek — soha demó / hamis link
      let live = response.results
        .map { $0.asUnified(forceDemo: false) }
        .filter(\.canOpenLiveListing)

      if response.mode == "live", (response.ok != false) {
        remote = live
        warning = response.warning
        if live.isEmpty, response.warning == nil {
          warning = "használtautó.hu: nincs egyedi találat ezekkel a feltételekkel."
        }
      } else {
        remote = []
        needsAutosweb = true
        warning = response.warning
          ?? response.error
          ?? "Élő használtautó keresés sikertelen."
      }
    } catch {
      remote = []
      needsAutosweb = true
      warning = "Autosweb nem elérhető (127.0.0.1:3456). Indítsd a Macen, majd Újrapróbálás."
    }
  }
}
