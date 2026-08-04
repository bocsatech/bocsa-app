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
  }

  private var subtitle: String {
    let local = localItems.count
    let ha = remote.count
    if loadingRemote {
      return "\(local) saját · használtautó.hu…"
    }
    return "\(local) saját · \(ha) használtautó.hu"
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
            Text("Megnyitás böngészőben ›")
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
    guard item.source == .hasznaltauto, let url = item.externalUrl else { return }
    UIApplication.shared.open(url)
  }

  @MainActor
  private func loadRemote() async {
    loadingRemote = true
    warning = nil
    defer { loadingRemote = false }
    do {
      let response = try await HasznaltautoSearchClient.search(filter: store.filter)
      remote = response.results.map { $0.asUnified() }
      remoteMode = response.mode
      warning = response.warning
    } catch {
      // Autosweb nem fut / hálózat — demo fallback az API-n keresztül, ha elérhető
      do {
        let response = try await HasznaltautoSearchClient.search(filter: store.filter, demo: true)
        remote = response.results.map { $0.asUnified() }
        warning = "Autosweb élő keresés nem elérhető — demo. Indítsd: cd autosweb && npm start"
      } catch {
        // Nincs Autosweb — helyi demo használtautó kártyák a UI kipróbálásához
        remote = localDemoHa(store.filter)
        warning = "Autosweb nem fut (127.0.0.1:3456). Helyi demo használtautó találatok. Élőhöz: cd autosweb && npm start"
      }
    }
  }
}
