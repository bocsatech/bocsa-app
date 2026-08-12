import SwiftUI

@main
struct AddElAutodApp: App {
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
                .onReceive(NotificationCenter.default.publisher(for: .bymyRemoteProfileApplied)) { note in
                    pageLayoutStore.applyFromRemote(note.object as? AuthAPI.PageLayoutDTO)
                }
        }
    }
}
