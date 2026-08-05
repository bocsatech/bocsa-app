import SwiftUI
import UIKit

/// Autós oldal fizetős partner-ajánlói (Autosweb / irányítószám, max ~30 km)
struct RecommendationsScreen: View {
  @EnvironmentObject private var profile: ProfileStore

  @State private var postalCode: String = ""
  @State private var cityLabel: String?
  @State private var categories: [PartnerCategoryGroup] = PartnerRecommendationsDemo.categories
  @State private var loading = false
  @State private var sourceNote: String = "Demo ajánlások — Autosweb élő listához indítsd a 3456-ot."

  var body: some View {
    VStack(spacing: 0) {
      ScreenHeader(
        title: "Ajánlások",
        subtitle: subtitle
      )

      postalBar

      if !sourceNote.isEmpty {
        Text(sourceNote)
          .font(.caption)
          .foregroundStyle(AppTheme.textSecondary)
          .frame(maxWidth: .infinity, alignment: .leading)
          .padding(.horizontal, 16)
          .padding(.bottom, 8)
      }

      ScrollView {
        LazyVStack(alignment: .leading, spacing: 20) {
          ForEach(categories) { group in
            categorySection(group)
          }
        }
        .padding(16)
        .padding(.bottom, 24)
      }
    }
    .background(AppTheme.bg)
    .onAppear {
      if postalCode.isEmpty {
        let fromProfile = profile.profile.postalCode.trimmingCharacters(in: .whitespaces)
        postalCode = fromProfile.count == 4 ? fromProfile : "8000"
      }
    }
    .task(id: postalCode) {
      await loadRecommendations()
    }
  }

  private var subtitle: String {
    if let city = cityLabel, !city.isEmpty {
      return "\(city) · szolgáltatók 30 km-en belül"
    }
    return "Szolgáltatók az irányítószámod körül"
  }

  private var postalBar: some View {
    HStack(spacing: 10) {
      TextField("Irányítószám", text: $postalCode)
        .keyboardType(.numberPad)
        .textFieldStyle(.roundedBorder)
        .frame(maxWidth: 120)

      Button("Keresés") {
        let trimmed = String(postalCode.filter(\.isNumber).prefix(4))
        postalCode = trimmed
        Task { await loadRecommendations() }
      }
      .buttonStyle(.borderedProminent)
      .disabled(postalCode.filter(\.isNumber).count != 4 || loading)

      if loading {
        ProgressView()
      }
      Spacer(minLength: 0)
    }
    .padding(.horizontal, 16)
    .padding(.vertical, 10)
  }

  @ViewBuilder
  private func categorySection(_ group: PartnerCategoryGroup) -> some View {
    VStack(alignment: .leading, spacing: 10) {
      Text(group.label)
        .font(.title3.weight(.semibold))
        .foregroundStyle(AppTheme.text)

      if group.partners.isEmpty {
        Text("Ebben a kategóriában nincs ajánlott partner a közelben.")
          .font(.footnote)
          .foregroundStyle(AppTheme.textSecondary)
      } else {
        ForEach(group.partners) { partner in
          partnerCard(partner)
        }
      }
    }
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

  @MainActor
  private func loadRecommendations() async {
    let code = String(postalCode.filter(\.isNumber).prefix(4))
    guard code.count == 4 else { return }

    loading = true
    defer { loading = false }

    do {
      let result = try await PartnerRecommendationsClient.fetch(postalCode: code)
      cityLabel = result.city
      let withPartners = result.categories.filter { !$0.partners.isEmpty }
      categories = withPartners.isEmpty ? result.categories : withPartners
      sourceNote = "Élő Autosweb ajánlások (\(code))."
      if profile.profile.postalCode != code {
        profile.profile.postalCode = code
        profile.save()
      }
    } catch {
      cityLabel = code == "8000" ? "Székesfehérvár" : nil
      categories = PartnerRecommendationsDemo.categories
      sourceNote = "Autosweb nem elérhető (3456) — demo ajánlások. Élőhöz: Autosweb-indito."
    }
  }
}
