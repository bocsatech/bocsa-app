import SwiftUI

enum AuthSheet: String, Identifiable {
    case login
    case register
    var id: String { rawValue }
}

struct ContentView: View {
    @EnvironmentObject private var profile: ProfileStore
    @State private var page = 0
    @State private var authSheet: AuthSheet?
    @State private var showSettings = false
    /// Belépés után Beállítások megnyitása (mint a webes next=)
    @State private var openSettingsAfterAuth = false

    var body: some View {
        Group {
            if profile.isRestoring {
                ProgressView("Fiók…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(AppTheme.bg.ignoresSafeArea())
            } else {
                mainShell
            }
        }
        .fullScreenCover(item: $authSheet) { sheet in
            switch sheet {
            case .login:
                LoginScreen(
                    onClose: { authSheet = nil },
                    onGoRegister: { authSheet = .register },
                    onSuccess: { handleAuthSuccess() }
                )
                .environmentObject(profile)
            case .register:
                RegisterScreen(
                    onClose: { authSheet = nil },
                    onGoLogin: { authSheet = .login },
                    onSuccess: { handleAuthSuccess() }
                )
                .environmentObject(profile)
            }
        }
        .fullScreenCover(isPresented: $showSettings) {
            SettingsScreen(onClose: { showSettings = false })
                .environmentObject(profile)
        }
    }

    private var mainShell: some View {
        VStack(spacing: 0) {
            SiteAuthBar(
                onLogin: {
                    openSettingsAfterAuth = false
                    authSheet = .login
                },
                onRegister: {
                    openSettingsAfterAuth = false
                    authSheet = .register
                },
                onAccount: { requestSettings() }
            )

            TabView(selection: $page) {
                FeedScreen()
                    .tag(0)
                RecommendationsScreen()
                    .tag(1)
                FeaturedScreen()
                    .tag(2)
                SearchScreen(onOpenSettings: { requestSettings() })
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

    private func requestSettings() {
        if profile.isLoggedIn {
            showSettings = true
        } else {
            openSettingsAfterAuth = true
            authSheet = .login
        }
    }

    private func handleAuthSuccess() {
        let wantSettings = openSettingsAfterAuth
        openSettingsAfterAuth = false
        authSheet = nil
        guard wantSettings else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
            showSettings = true
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(SearchStore())
        .environmentObject(ProfileStore())
}
