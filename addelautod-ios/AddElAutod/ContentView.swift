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
    @State private var tab: BottomTab = .fooldal
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
                onOpenSearch: { tab = .kereses }
            )
            .environmentObject(profile)
            .environmentObject(searchStore)
            .environmentObject(pageLayout)
        }
    }

    /// Belépés nélkül: krém belépő oldal (Apple / Google / Facebook / email / telefon).
    private var guestAuthOnly: some View {
        AuthLandingScreen()
            .environmentObject(profile)
            .background(Color(red: 0.980, green: 0.965, blue: 0.945).ignoresSafeArea())
    }

    private var mainTabs: some View {
        VStack(spacing: 0) {
            SiteAuthBar(
                selectedPage: nil,
                onLogin: {},
                onRegister: {},
                onAccount: { showAccountMenu = true }
            )

            TabView(selection: $tab) {
                SearchScreen(
                    searchRoot: .homeLanding,
                    onOpenAccount: { showAccountMenu = true },
                    onOpenSettings: { showSettings = true },
                    onOpenSearchTab: { tab = .kereses },
                    onOpenPostAdTab: { tab = .hirdetesFeladas },
                    onOpenMessagesTab: { tab = .uzenetek }
                )
                .tag(BottomTab.fooldal)

                SearchScreen(
                    searchRoot: .searchMenu,
                    onOpenAccount: { showAccountMenu = true },
                    onOpenSettings: { showSettings = true }
                )
                .tag(BottomTab.kereses)

                PostAdScreen()
                    .tag(BottomTab.hirdetesFeladas)

                MessagesScreen()
                    .tag(BottomTab.uzenetek)

                FeedScreen()
                    .tag(BottomTab.hirfolyam)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))

            PageIconBar(selection: $tab)
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
        .environmentObject(PageLayoutStore())
}
