import Foundation
import Combine

struct UserProfile: Codable, Equatable {
    var salutation: String = ""
    var firstName: String = ""
    var lastName: String = ""
    var street: String = ""
    var postalCode: String = ""
    var city: String = ""
    var country: String = "Magyarország"
    var phone: String = ""
    var email: String = ""
    var accountType: String = "private" // private | business
    var company: String = ""
    var notifyMessages: Bool = false
    var notifyFavorites: Bool = false
    var notifyInterests: Bool = false
    var notifyNewsletter: Bool = false

    var displayName: String {
        let n = "\(firstName) \(lastName)".trimmingCharacters(in: .whitespaces)
        if !n.isEmpty { return n }
        if !email.isEmpty { return email }
        return "Fiók"
    }

    var avatarLetter: String {
        let ch = firstName.first ?? email.first ?? "A"
        return String(ch).uppercased()
    }
}

@MainActor
final class ProfileStore: ObservableObject {
    @Published var profile = UserProfile()

    private let key = "addelautod.userProfile.v1"

    init() {
        load()
    }

    func save() {
        if let data = try? JSONEncoder().encode(profile) {
            UserDefaults.standard.set(data, forKey: key)
        }
    }

    private func load() {
        guard let data = UserDefaults.standard.data(forKey: key),
              let decoded = try? JSONDecoder().decode(UserProfile.self, from: data)
        else { return }
        profile = decoded
    }

    func reset() {
        profile = UserProfile()
        UserDefaults.standard.removeObject(forKey: key)
    }
}
