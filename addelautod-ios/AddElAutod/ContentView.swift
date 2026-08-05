import SwiftUI

struct ContentView: View {
    @State private var page = 0

    var body: some View {
        VStack(spacing: 0) {
            TabView(selection: $page) {
                FeedScreen()
                    .tag(0)
                RecommendationsScreen()
                    .tag(1)
                FeaturedScreen()
                    .tag(2)
                SearchScreen()
                    .tag(3)
                SavedSearchesScreen(onOpenSearch: { page = 3 })
                    .tag(4)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))

            PageDots(count: 5, index: page)
                .padding(.bottom, 8)
        }
        .background(AppTheme.bg.ignoresSafeArea())
    }
}

#Preview {
    ContentView()
        .environmentObject(SearchStore())
        .environmentObject(ProfileStore())
}
