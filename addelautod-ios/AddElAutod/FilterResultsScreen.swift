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
              Text("Hirdetések betöltése az appba…")
                .font(.footnote)
                .foregroundStyle(AppTheme.textSecondary)
              Text("A böngésző nem nyílik meg magától — csak ha egy kártyára kattintasz.")
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
      Text("Autosweb-HA kell (port 3457)")
        .font(.headline)
        .foregroundStyle(AppTheme.text)
      Text("Az Asztali Autosweb (3456 / main) NEM elég. Külön HA szerver kell a 3457-en.")
        .font(.footnote)
        .foregroundStyle(AppTheme.textSecondary)
      Text("Terminálba (egészben), hagyd futni:")
        .font(.caption.weight(.semibold))
      Text(autoswebRestartHint)
        .font(.system(.caption2, design: .monospaced))
        .textSelection(.enabled)
      Text("Amíg látod: Autosweb: http://127.0.0.1:3457 → Újrapróbálás")
        .font(.footnote)
        .foregroundStyle(AppTheme.textSecondary)
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

  private var autoswebRestartHint: String {
    """
    cd ~/Downloads && rm -rf bocsa-run && git clone --depth 1 -b cursor/addelautod-mobile-de62 https://github.com/bocsatech/bocsa-app.git bocsa-run && bash bocsa-run/addelautod-ios/mac/Autosweb-HA-indito.command
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
            Text("Koppintás: ez az egy autó Safariban")
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
    // Csak explicit koppintásra — soha automatikusan
    guard item.source == .hasznaltauto else { return }
    guard item.canOpenLiveListing, let url = item.externalUrl else { return }
    UIApplication.shared.open(url)
  }

  @MainActor
  private func loadRemote() async {
    loadingRemote = true
    warning = nil
    needsAutosweb = false
    remote = []
    defer { loadingRemote = false }

    // Először: fut-e egyáltalán az Autosweb?
    let up = await HasznaltautoSearchClient.isReachable()
    if !up {
      needsAutosweb = true
      warning = "Autosweb-HA nem fut a 3457-en. Indítsd: Autosweb-HA-indito.command (ne az Asztali 3456-ot)"
      return
    }

    let hasApi = await HasznaltautoSearchClient.hasHaSearchApi()
    if !hasApi {
      needsAutosweb = true
      warning = "A 3457-en nincs /api/ha-search. Indítsd újra: Autosweb-HA-indito.command"
      return
    }

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
          ?? "A használtautó keresés nem adott találatot. Nézd a Terminál [ha-search] sorait."
      }
    } catch let urlError as URLError {
      remote = []
      needsAutosweb = true
      switch urlError.code {
      case .timedOut:
        warning = "A keresés túl sokáig tartott. Terminál: [ha-search] logok. Cloudflare pipa a Chrome-ban, majd Újrapróbálás."
      case .cannotConnectToHost, .networkConnectionLost, .notConnectedToInternet:
        warning = "Megszakadt a kapcsolat (3457). Indítsd újra: Autosweb-HA-indito.command"
      default:
        warning = "Hálózati hiba: \(urlError.localizedDescription)"
      }
    } catch {
      remote = []
      needsAutosweb = true
      warning = error.localizedDescription
    }
  }
}
