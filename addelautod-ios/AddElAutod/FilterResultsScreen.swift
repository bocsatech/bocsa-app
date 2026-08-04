import SwiftUI

/// Keresőfeltételek találati listája — saját (Add el autod) hirdetések
struct FilterResultsScreen: View {
  @EnvironmentObject private var store: SearchStore
  var onBack: () -> Void

  private var items: [DemoListing] {
    DemoListing.filtered(for: store.filter)
  }

  var body: some View {
    VStack(spacing: 0) {
      ScreenHeader(
        title: "Találatok",
        subtitle: "\(items.count) hirdetés",
        onBack: onBack
      )

      ScrollView {
        LazyVStack(spacing: 12) {
          Text(store.filter.summary)
            .font(.footnote)
            .foregroundStyle(AppTheme.textSecondary)
            .frame(maxWidth: .infinity, alignment: .leading)

          if items.isEmpty {
            Text("Nincs találat ezekkel a feltételekkel.")
              .font(.body)
              .foregroundStyle(AppTheme.textSecondary)
              .frame(maxWidth: .infinity)
              .padding(.top, 40)
          } else {
            ForEach(items) { car in
              listingRow(car)
            }
          }
        }
        .padding(16)
        .padding(.bottom, 24)
      }
    }
    .background(AppTheme.bg)
  }

  @ViewBuilder
  private func listingRow(_ car: DemoListing) -> some View {
    HStack(alignment: .top, spacing: 12) {
      RoundedRectangle(cornerRadius: 10, style: .continuous)
        .fill(Color(.tertiarySystemFill))
        .frame(width: 88, height: 66)
        .overlay {
          Image(systemName: "car.fill")
            .foregroundStyle(.secondary)
        }

      VStack(alignment: .leading, spacing: 6) {
        HStack(alignment: .top) {
          Text(car.title)
            .font(.headline)
            .foregroundStyle(AppTheme.text)
            .multilineTextAlignment(.leading)
          Spacer(minLength: 8)
          Text("Add el autod")
            .font(.caption2.weight(.bold))
            .foregroundStyle(AppTheme.accent)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(AppTheme.accent.opacity(0.12))
            .clipShape(Capsule())
        }

        Text(car.priceLabel)
          .font(.title3.weight(.bold))
          .foregroundStyle(AppTheme.text)

        Text(car.meta)
          .font(.subheadline)
          .foregroundStyle(AppTheme.textSecondary)
      }
    }
    .padding(14)
    .background(AppTheme.bgElevated)
    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    .overlay(
      RoundedRectangle(cornerRadius: 16, style: .continuous)
        .stroke(AppTheme.border, lineWidth: 0.5)
    )
  }
}
