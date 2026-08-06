import Foundation
import Combine
import UIKit

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
    var accountType: String = "private" // private | business | dealer
    var company: String = ""
    var notifyMessages: Bool = false
    var notifyFavorites: Bool = false
    var notifyInterests: Bool = false
    var notifyNewsletter: Bool = false
    /// Gyors kategória keresés: km-sugár az irányítószám körül (helyi, nem szerver)
    var searchRadiusKm: Int = 30

    var displayName: String {
        let n = "\(lastName) \(firstName)".trimmingCharacters(in: .whitespaces)
        if !n.isEmpty { return n }
        if !email.isEmpty { return email }
        return "Fiók"
    }

    var avatarLetter: String {
        let ch = lastName.first ?? firstName.first ?? email.first ?? "A"
        return String(ch).uppercased()
    }
}

@MainActor
final class ProfileStore: ObservableObject {
    @Published var profile = UserProfile()
    @Published var token: String?
    @Published var isRestoring = true
    @Published var authError: String?
    @Published var avatarImage: UIImage?

    var isLoggedIn: Bool { token != nil && !profile.email.isEmpty }

    private let profileKey = "addelautod.userProfile.v2"
    private let tokenKey = "addelautod.authToken.v1"

    init() {
        loadLocal()
        loadAvatarFromDisk()
        if token == nil {
            isRestoring = false
        } else {
            Task { await restoreSession() }
        }
    }

    func saveLocal() {
        if let data = try? JSONEncoder().encode(profile) {
            UserDefaults.standard.set(data, forKey: profileKey)
        }
        if let token {
            UserDefaults.standard.set(token, forKey: tokenKey)
        } else {
            UserDefaults.standard.removeObject(forKey: tokenKey)
        }
    }

    /// Helyi gyors mentés (pl. keresési sugár) — profil szerverre külön.
    func save() {
        saveLocal()
    }

    private func loadLocal() {
        if let data = UserDefaults.standard.data(forKey: profileKey),
           let decoded = try? JSONDecoder().decode(UserProfile.self, from: data) {
            profile = decoded
        }
        token = UserDefaults.standard.string(forKey: tokenKey)
    }

    // MARK: - Profilkép

    func setAvatar(_ image: UIImage) {
        let resized = Self.resize(image, maxSide: 512)
        avatarImage = resized
        guard let email = avatarEmailKey(), let data = resized.jpegData(compressionQuality: 0.85) else { return }
        try? data.write(to: avatarFileURL(email: email), options: .atomic)
    }

    func clearAvatar() {
        avatarImage = nil
        if let email = avatarEmailKey() {
            try? FileManager.default.removeItem(at: avatarFileURL(email: email))
        }
    }

    func loadAvatarFromDisk() {
        guard let email = avatarEmailKey() else {
            avatarImage = nil
            return
        }
        let url = avatarFileURL(email: email)
        guard let data = try? Data(contentsOf: url), let image = UIImage(data: data) else {
            avatarImage = nil
            return
        }
        avatarImage = image
    }

    private func avatarEmailKey() -> String? {
        let email = profile.email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        return email.isEmpty ? nil : email
    }

    private func avatarFileURL(email: String) -> URL {
        let dir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("avatars", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let safe = email.replacingOccurrences(of: "@", with: "_at_").replacingOccurrences(of: "/", with: "_")
        return dir.appendingPathComponent("\(safe).jpg")
    }

    private static func resize(_ image: UIImage, maxSide: CGFloat) -> UIImage {
        let size = image.size
        let longest = max(size.width, size.height)
        guard longest > maxSide else { return image }
        let scale = maxSide / longest
        let newSize = CGSize(width: size.width * scale, height: size.height * scale)
        let renderer = UIGraphicsImageRenderer(size: newSize)
        return renderer.image { _ in image.draw(in: CGRect(origin: .zero, size: newSize)) }
    }

    func restoreSession() async {
        isRestoring = true
        defer { isRestoring = false }
        guard let token else { return }
        do {
            let user = try await AuthAPI.me(token: token)
            applyRemote(user)
            authError = nil
        } catch {
            // Token érvénytelen vagy szerver offline — kijelentkeztetünk ha 401 jellegű
            if let auth = error as? AuthAPI.AuthError, case .server = auth {
                clearSession()
            }
            // Offline: megtartjuk a helyi session-t, amíg a szerver újra él
        }
    }

    func login(email: String, password: String) async -> Bool {
        authError = nil
        do {
            let result = try await AuthAPI.login(email: email, password: password)
            token = result.token
            applyRemote(result.user)
            saveLocal()
            return true
        } catch {
            authError = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            return false
        }
    }

    func register(email: String, password: String, passwordConfirm: String) async -> Bool {
        authError = nil
        do {
            let result = try await AuthAPI.register(
                email: email,
                password: password,
                passwordConfirm: passwordConfirm
            )
            token = result.token
            applyRemote(result.user)
            saveLocal()
            return true
        } catch {
            authError = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            return false
        }
    }

    func logout() async {
        if let token {
            await AuthAPI.logout(token: token)
        }
        clearSession()
    }

    func saveProfileToServer() async -> String? {
        guard let token else { return "Nem vagy bejelentkezve." }
        do {
            let user = try await AuthAPI.saveProfile(token: token, profile: profile.remotePayload())
            applyRemote(user)
            saveLocal()
            return nil
        } catch {
            return (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    func changePassword(current: String, newPassword: String, confirm: String) async -> String? {
        guard let token else { return "Nem vagy bejelentkezve." }
        do {
            try await AuthAPI.changePassword(
                token: token,
                current: current,
                newPassword: newPassword,
                confirm: confirm
            )
            return nil
        } catch {
            return (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    func deleteAccount() async -> String? {
        guard let token else { return "Nem vagy bejelentkezve." }
        do {
            try await AuthAPI.deleteAccount(token: token)
            clearSession()
            return nil
        } catch {
            return (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    func reset() {
        clearSession()
    }

    private func applyRemote(_ user: AuthAPI.RemoteUser) {
        profile.apply(remote: user)
        loadAvatarFromDisk()
    }

    private func clearSession() {
        clearAvatar()
        token = nil
        profile = UserProfile()
        UserDefaults.standard.removeObject(forKey: profileKey)
        UserDefaults.standard.removeObject(forKey: tokenKey)
    }
}
