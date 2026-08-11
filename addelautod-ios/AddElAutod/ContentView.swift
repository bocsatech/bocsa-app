import SwiftUI

/// Vendég mód: csak Belépés vagy Regisztráció — nincs lapozás.
enum AuthPage: String {
    case login
    case register
}

struct ContentView: View {
    @EnvironmentObject private var profile: ProfileStore
    @EnvironmentObject private var pageLayout: PageLayoutStore
    @EnvironmentObject private var searchStore: SearchStore
    @State private var page = 0
    @State private var authPage: AuthPage = .login
    @State private var showSettings = false
    @State private var showAccountMenu = false

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
                .environmentObject(pageLayout)
        }
        .fullScreenCover(isPresented: $showAccountMenu) {
            AccountMenuScreen(
                onClose: { showAccountMenu = false },
                onOpenSearch: {
                    if let idx = pageLayout.index(of: .foOldal) {
                        page = idx
                    }
                }
            )
            .environmentObject(profile)
            .environmentObject(searchStore)
            .environmentObject(pageLayout)
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
        let pages = pageLayout.visible
        return VStack(spacing: 0) {
            SiteAuthBar(
                selectedPage: nil,
                onLogin: {},
                onRegister: {},
                onAccount: { showAccountMenu = true }
            )

            TabView(selection: $page) {
                ForEach(Array(pages.enumerated()), id: \.element) { index, id in
                    mainPageView(id, tabIndex: index)
                        .tag(index)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .id(pages.map(\.rawValue).joined(separator: "-"))
            .onChange(of: pages.map(\.rawValue)) { _, newIds in
                if page >= newIds.count {
                    page = max(0, newIds.count - 1)
                }
            }

            PageIconBar(pages: pages, index: $page)
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

    @ViewBuilder
    private func mainPageView(_ id: MainPageID, tabIndex: Int) -> some View {
        switch id {
        case .hirfolyam:
            FeedScreen()
        case .facebook:
            SocialWebScreen(kind: .facebookReel, isActive: page == tabIndex)
        case .youtube:
            SocialWebScreen(kind: .youTube, isActive: page == tabIndex)
        case .ajanlasok:
            RecommendationsScreen()
        case .kiemeltek:
            FeaturedScreen()
        case .foOldal:
            SearchScreen(onOpenSettings: { showSettings = true })
        case .mentettKeresesek:
            SavedSearchesScreen(onOpenSearch: {
                if let idx = pageLayout.index(of: .foOldal) {
                    page = idx
                }
            })
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(SearchStore())
        .environmentObject(ProfileStore())
        .environmentObject(PageLayoutStore())
}
