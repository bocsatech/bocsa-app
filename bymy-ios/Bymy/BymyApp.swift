import SwiftUI

@main
struct BymyApp: App {
    @StateObject private var searchStore = SearchStore()
    @StateObject private var profileStore = ProfileStore()
    @StateObject private var pageLayoutStore = PageLayoutStore()

    init() {
        AutoswebBaseURL.applyStored()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(searchStore)
                .environmentObject(profileStore)
                .environmentObject(pageLayoutStore)
        }
    }
}
