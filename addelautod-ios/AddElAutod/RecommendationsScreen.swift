import SwiftUI
import UIKit

/// Autós oldal fizetős partner-ajánlói (Autosweb / irányítószám).
/// Körzet szerkesztés: Beállítások → Ajánlások körzete.
struct RecommendationsScreen: View {
  @EnvironmentObject private var profile: ProfileStore
  var onClose: (() -> Void)? = nil

  @State private var cityLabel: String?
  @State private var categories: [PartnerCategoryGroup] = PartnerRecommendationsDemo.categories
  @State private var loading = false
  @State private var sourceNote: String = "Körzet: Beállítások → Ajánlások körzete"
  /// Accordion: egyszerre legfeljebb egy kategória nyitva (nil = mind zárva)
  @State private var expandedCategoryId: String? = nil

  private var postalCode: String {
    String(profile.profile.postalCode.filter(\.isNumber).prefix(4))
  }

  private var radiusKm: Int {
    min(30, max(5, profile.profile.recommendationsRadiusKm))
  }

  var body: some View {
    VStack(spacing: 0) {
      ScreenHeader(
        title: "Ajánlások",
        subtitle: subtitle,
        onBack: onClose,
        rightLabel: "Frissítés",
        onRight: { Task { await loadRecommendations() } }
      )

      if loading {
        ProgressView()
          .padding(.vertical, 8)
      }

      if !sourceNote.isEmpty {
        Text(sourceNote)
          .font(.caption)
          .foregroundStyle(AppTheme.textSecondary)
          .frame(maxWidth: .infinity, alignment: .leading)
          .padding(.horizontal, 16)
          .padding(.bottom, 8)
      }

      ScrollView {
        LazyVStack(alignment: .leading, spacing: 10) {
          ForEach(categories) { group in
            categorySection(group)
          }
        }
        .padding(16)
        .padding(.bottom, 24)
      }
    }
    .background(AppTheme.bg)
    .task(id: "\(postalCode)-\(radiusKm)") {
      await loadRecommendations()
    }
  }

  private var subtitle: String {
    if postalCode.count != 4 {
      return "Állítsd be a körzetet a Beállításokban"
    }
    if let city = cityLabel, !city.isEmpty {
      return "\(city) · szolgáltatók \(radiusKm) km-en belül"
    }
    return "\(postalCode) · szolgáltatók \(radiusKm) km-en belül"
  }

  @ViewBuilder
  private func categorySection(_ group: PartnerCategoryGroup) -> some View {
    let isOpen = expandedCategoryId == group.id
    VStack(alignment: .leading, spacing: 0) {
      Button {
        withAnimation(.easeInOut(duration: 0.2)) {
          expandedCategoryId = isOpen ? nil : group.id
        }
      } label: {
        HStack {
          Text(group.label)
            .font(.headline)
            .foregroundStyle(AppTheme.text)
            .multilineTextAlignment(.leading)
          Spacer(minLength: 8)
          Text(group.partners.isEmpty ? "0" : "\(group.partners.count)")
            .font(.caption.weight(.semibold))
            .foregroundStyle(AppTheme.textSecondary)
          Image(systemName: isOpen ? "chevron.up" : "chevron.down")
            .font(.caption.weight(.semibold))
            .foregroundStyle(AppTheme.textSecondary)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppTheme.bgElevated)
        .contentShape(Rectangle())
      }
      .buttonStyle(.plain)

      if isOpen {
        VStack(alignment: .leading, spacing: 10) {
          if group.partners.isEmpty {
            Text("Ebben a kategóriában nincs ajánlott partner a közelben.")
              .font(.footnote)
              .foregroundStyle(AppTheme.textSecondary)
              .padding(.horizontal, 4)
          } else {
            ForEach(group.partners) { partner in
              partnerCard(partner)
            }
          }
        }
        .padding(.top, 10)
        .padding(.bottom, 4)
      }
    }
    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    .overlay(
      RoundedRectangle(cornerRadius: 14, style: .continuous)
        .stroke(AppTheme.border, lineWidth: 0.5)
    )
  }

  private func partnerCard(_ partner: PartnerRecommendation) -> some View {
    VStack(alignment: .leading, spacing: 8) {
      Text(partner.name)
        .font(.headline)
        .foregroundStyle(AppTheme.text)

      Text(locationLine(partner))
        .font(.subheadline)
        .foregroundStyle(AppTheme.textSecondary)

      if let hours = partner.openingHours, !hours.isEmpty {
        Text(hours)
          .font(.caption)
          .foregroundStyle(AppTheme.textSecondary)
      }

      if let ratingLine = ratingText(partner) {
        Text(ratingLine)
          .font(.caption.weight(.medium))
          .foregroundStyle(AppTheme.accent)
      }

      HStack(spacing: 12) {
        if let phone = partner.phone, let tel = URL(string: "tel:\(phone.filter { $0.isNumber || $0 == "+" })") {
          Button("Hívás") { UIApplication.shared.open(tel) }
            .font(.caption.weight(.semibold))
        }
        if let maps = partner.mapsURL {
          Button("Térkép") { UIApplication.shared.open(maps) }
            .font(.caption.weight(.semibold))
        }
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(14)
    .background(AppTheme.bgElevated)
    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    .overlay(
      RoundedRectangle(cornerRadius: 14, style: .continuous)
        .stroke(AppTheme.border, lineWidth: 0.5)
    )
  }

  private func locationLine(_ partner: PartnerRecommendation) -> String {
    var parts: [String] = []
    if !partner.postalCode.isEmpty { parts.append(partner.postalCode) }
    if !partner.address.isEmpty { parts.append(partner.address) }
    if let km = partner.distanceKm {
      parts.append(String(format: "%.1f km", km))
    }
    return parts.joined(separator: " · ")
  }

  private func ratingText(_ partner: PartnerRecommendation) -> String? {
    guard let rating = partner.rating else { return nil }
    if let count = partner.reviewCount {
      return String(format: "★ %.1f (%d)", rating, count)
    }
    return String(format: "★ %.1f", rating)
  }

  private func filterByRadius(_ groups: [PartnerCategoryGroup]) -> [PartnerCategoryGroup] {
    let maxKm = Double(radiusKm)
    return groups.map { group in
      let filtered = group.partners.filter { partner in
        guard let km = partner.distanceKm else { return true }
        return km <= maxKm + 0.05
      }
      return PartnerCategoryGroup(id: group.id, label: group.label, partners: filtered)
    }
  }

  @MainActor
  private func loadRecommendations() async {
    guard postalCode.count == 4 else {
      cityLabel = nil
      categories = []
      expandedCategoryId = nil
      sourceNote = "Állítsd be az irányítószámot: Beállítások → Ajánlások körzete"
      return
    }

    loading = true
    defer { loading = false }

    do {
      let result = try await PartnerRecommendationsClient.fetch(postalCode: postalCode)
      cityLabel = result.city
      let filtered = filterByRadius(result.categories)
      let withPartners = filtered.filter { !$0.partners.isEmpty }
      categories = withPartners.isEmpty ? filtered : withPartners
      expandedCategoryId = nil
      sourceNote = "Élő Autosweb · \(postalCode) · \(radiusKm) km"
    } catch {
      cityLabel = postalCode == "8000" ? "Székesfehérvár" : profile.profile.city.nilIfEmpty
      let demo = filterByRadius(PartnerRecommendationsDemo.categories)
      categories = demo
      expandedCategoryId = nil
      sourceNote = "Autosweb nem elérhető — demo. Körzet: Beállítások → Ajánlások körzete"
    }
  }
}

private extension String {
  var nilIfEmpty: String? {
    let t = trimmingCharacters(in: .whitespacesAndNewlines)
    return t.isEmpty ? nil : t
  }
}
