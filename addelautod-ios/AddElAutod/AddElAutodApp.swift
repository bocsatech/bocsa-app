import SwiftUI

@main
struct AddElAutodApp: App {
    @StateObject private var searchStore = SearchStore()
    @StateObject private var profileStore = ProfileStore()
    @StateObject private var pageLayoutStore = PageLayoutStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(searchStore)
                .environmentObject(profileStore)
                .environmentObject(pageLayoutStore)
        }
    }
}
