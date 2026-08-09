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
                SocialWebScreen(kind: .facebookReel, isActive: page == 1)
                    .tag(1)
                SocialWebScreen(kind: .youTube, isActive: page == 2)
                    .tag(2)
                RecommendationsScreen()
                    .tag(3)
                FeaturedScreen()
                    .tag(4)
                SearchScreen(onOpenSettings: { showSettings = true })
                    .tag(5)
                SavedSearchesScreen(onOpenSearch: { page = 5 })
                    .tag(6)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))

            PageIconBar(index: $page)
                .padding(.bottom, 4)
        }
        .background(AppTheme.bg.ignoresSafeArea())
        .task(id: profile.token) {
            guard profile.isLoggedIn, let token = profile.token else {
                PushNotificationService.shared.stopPolling()
                return
            }
            let store = profile
            await PushNotificationService.shared.requestPermissionAndRegister(authToken: token)
            PushNotificationService.shared.startPolling { store.token }
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(SearchStore())
        .environmentObject(ProfileStore())
}
