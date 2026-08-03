import SwiftUI

struct ContentView: View {
    @State private var page = 0

    private let titles = ["Hírfolyam", "Kiemeltek", "Keresés", "Mentett"]

    var body: some View {
        VStack(spacing: 0) {
            HStack(alignment: .firstTextBaseline) {
                Text("Add el autod")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(AppTheme.text)
                Spacer()
                Text(titles[page])
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(AppTheme.textSecondary)
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
            .padding(.bottom, 4)

            TabView(selection: $page) {
                FeedScreen()
                    .tag(0)
                FeaturedScreen()
                    .tag(1)
                SearchScreen()
                    .tag(2)
                SavedSearchesScreen(onOpenSearch: { page = 2 })
                    .tag(3)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))

            PageDots(count: 4, index: page)
                .padding(.bottom, 8)
        }
        .background(AppTheme.bg.ignoresSafeArea())
    }
}

#Preview {
    ContentView()
        .environmentObject(SearchStore())
}
