import SwiftUI

@main
struct AddElAutodApp: App {
    @StateObject private var searchStore = SearchStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(searchStore)
        }
    }
}
