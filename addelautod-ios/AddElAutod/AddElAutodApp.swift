import SwiftUI

@main
struct AddElAutodApp: App {
    @StateObject private var searchStore = SearchStore()
    @StateObject private var profileStore = ProfileStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(searchStore)
                .environmentObject(profileStore)
        }
    }
}
