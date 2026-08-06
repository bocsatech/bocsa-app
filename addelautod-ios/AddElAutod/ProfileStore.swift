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
    /// Gyors kategória keresés: km-sugár az irányítószám körül (helyi, nem szerver)
    var searchRadiusKm: Int = 30

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
    @Published var token: String?
    @Published var isRestoring = true
    @Published var authError: String?

    var isLoggedIn: Bool { token != nil && !profile.email.isEmpty }

    private let profileKey = "addelautod.userProfile.v2"
    private let tokenKey = "addelautod.authToken.v1"

    init() {
        loadLocal()
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
    }

    private func clearSession() {
        token = nil
        profile = UserProfile()
        UserDefaults.standard.removeObject(forKey: profileKey)
        UserDefaults.standard.removeObject(forKey: tokenKey)
    }
}
