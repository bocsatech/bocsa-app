import SwiftUI

struct ContentView: View {
    @State private var page = 0

    var body: some View {
        VStack(spacing: 0) {
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
