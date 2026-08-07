import SwiftUI

/// Keresőfeltételek találati listája — saját (Add el autod) hirdetések
struct FilterResultsScreen: View {
  @EnvironmentObject private var store: SearchStore
  @EnvironmentObject private var profile: ProfileStore
  var onBack: () -> Void

  @State private var openRequest: ListingOpenRequest?

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
              ListingFeedCard(
                detail: car.asDetail,
                onOpen: { openRequest = .demo(car) }
              )
            }
          }
        }
        .padding(16)
        .padding(.bottom, 24)
      }
    }
    .background(AppTheme.bg)
    .fullScreenCover(item: $openRequest) { req in
      ListingDetailLoader(request: req, onClose: { openRequest = nil })
        .environmentObject(profile)
    }
  }
}
