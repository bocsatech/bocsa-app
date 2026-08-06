import SwiftUI

/// Vendég mód: csak Belépés vagy Regisztráció — nincs lapozás.
enum AuthPage: String {
    case login
    case register
}

struct ContentView: View {
    @EnvironmentObject private var profile: ProfileStore
    @State private var page = 0
    @State private var authPage: AuthPage = .login
    @State private var showSettings = false

    var body: some View {
        Group {
            if profile.isRestoring {
                ProgressView("Fiók…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(AppTheme.bg.ignoresSafeArea())
            } else if profile.isLoggedIn {
                mainTabs
            } else {
                guestAuthOnly
            }
        }
        .fullScreenCover(isPresented: $showSettings) {
            SettingsScreen(onClose: { showSettings = false })
                .environmentObject(profile)
        }
    }

    /// Belépés nélkül: egyetlen oldal, nincs jobbra/balra swipe.
    private var guestAuthOnly: some View {
        VStack(spacing: 0) {
            SiteAuthBar(
                selectedPage: authPage,
                onLogin: { authPage = .login },
                onRegister: { authPage = .register },
                onAccount: nil
            )

            Group {
                if authPage == .login {
                    LoginScreen(
                        onGoRegister: { authPage = .register },
                        onSuccess: nil
                    )
                } else {
                    RegisterScreen(
                        onGoLogin: { authPage = .login },
                        onSuccess: nil
                    )
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .background(AppTheme.bg.ignoresSafeArea())
    }

    private var mainTabs: some View {
        VStack(spacing: 0) {
            SiteAuthBar(
                selectedPage: nil,
                onLogin: {},
                onRegister: {},
                onAccount: { showSettings = true }
            )

            TabView(selection: $page) {
                FeedScreen()
                    .tag(0)
                RecommendationsScreen()
                    .tag(1)
                FeaturedScreen()
                    .tag(2)
                SearchScreen(onOpenSettings: { showSettings = true })
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
