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
    /// Ajánlások (partnerek) km-sugár — max 30 (Autosweb)
    var recommendationsRadiusKm: Int = 30
    /// Szerver `displayName` (ha a kereszt-/vezetéknév még üres)
    var serverDisplayName: String = ""

    var displayName: String {
        let n = "\(lastName) \(firstName)".trimmingCharacters(in: .whitespaces)
        if !n.isEmpty { return n }
        let s = serverDisplayName.trimmingCharacters(in: .whitespaces)
        if !s.isEmpty { return s }
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
    /// Szerver user id — chat buborék „saját” oldalhoz
    @Published var userId: Int?
    @Published var isRestoring = true
    @Published var authError: String?
    @Published var avatarImage: UIImage?

    var isLoggedIn: Bool { token != nil && !profile.email.isEmpty }

    private let profileKey = "addelautod.userProfile.v2"
    private let tokenKey = "addelautod.authToken.v1"
    private let userIdKey = "addelautod.userId.v1"

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
        if let userId {
            UserDefaults.standard.set(userId, forKey: userIdKey)
        } else {
            UserDefaults.standard.removeObject(forKey: userIdKey)
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
        let storedId = UserDefaults.standard.integer(forKey: userIdKey)
        userId = storedId > 0 ? storedId : nil
    }

    // MARK: - Profilkép

    func setAvatar(_ image: UIImage) {
        let display = Self.resize(image, maxSide: 512)
        avatarImage = display
        persistAvatarToDisk(display)
        // Szerverre kisebb JPEG (data URL limit + gyorsabb sync)
        let upload = Self.resize(image, maxSide: 256).jpegData(compressionQuality: 0.72)
        if let token, let upload {
            Task {
                do {
                    let user = try await AuthAPI.saveAvatar(token: token, jpegData: upload)
                    // Profilmezők frissülhetnek — a helyi (jobb minőségű) képet ne töröljük,
                    // ha a szerver üres/invalid avatart ad vissza.
                    applyRemote(user, preferLocalAvatar: true)
                    saveLocal()
                } catch {
                    /* helyi kép megmarad; szerver később */
                }
            }
        }
    }

    func clearAvatar() {
        avatarImage = nil
        removeAvatarFiles()
        if let token {
            Task {
                _ = try? await AuthAPI.saveAvatar(token: token, jpegData: Data())
            }
        }
    }

    /// Mindig próbálja a lemezről (email + userId kulcs).
    func loadAvatarFromDisk() {
        for url in avatarCandidateURLs() {
            guard let data = try? Data(contentsOf: url), let image = UIImage(data: data) else { continue }
            avatarImage = image
            // Másodlagos kulcsra is mentsük, ha még nincs
            persistAvatarToDisk(image)
            return
        }
    }

    func applyAvatarFromRemote(_ dataUrl: String?) {
        guard let dataUrl, !dataUrl.isEmpty else { return }
        guard let image = Self.imageFromDataURL(dataUrl) else { return }
        let resized = Self.resize(image, maxSide: 512)
        avatarImage = resized
        persistAvatarToDisk(resized)
    }

    private func persistAvatarToDisk(_ image: UIImage) {
        guard let data = image.jpegData(compressionQuality: 0.82) else { return }
        for url in avatarCandidateURLs(createDir: true) {
            try? data.write(to: url, options: .atomic)
        }
    }

    private func removeAvatarFiles() {
        for url in avatarCandidateURLs() {
            try? FileManager.default.removeItem(at: url)
        }
    }

    private static func imageFromDataURL(_ dataUrl: String) -> UIImage? {
        let trimmed = dataUrl.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let range = trimmed.range(of: "base64,", options: .caseInsensitive) else { return nil }
        var b64 = String(trimmed[range.upperBound...])
        b64 = b64.replacingOccurrences(of: "\n", with: "")
            .replacingOccurrences(of: "\r", with: "")
            .replacingOccurrences(of: " ", with: "")
        guard let data = Data(base64Encoded: b64, options: .ignoreUnknownCharacters),
              let image = UIImage(data: data) else { return nil }
        return image
    }

    private func avatarEmailKey() -> String? {
        let email = profile.email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        return email.isEmpty ? nil : email
    }

    private func avatarCandidateURLs(createDir: Bool = false) -> [URL] {
        let dir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("avatars", isDirectory: true)
        if createDir {
            try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        }
        var urls: [URL] = []
        if let uid = userId, uid > 0 {
            urls.append(dir.appendingPathComponent("uid_\(uid).jpg"))
        }
        if let email = avatarEmailKey() {
            let safe = email.replacingOccurrences(of: "@", with: "_at_").replacingOccurrences(of: "/", with: "_")
            urls.append(dir.appendingPathComponent("\(safe).jpg"))
        }
        return urls
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
        // Offline / hibás válasz előtt is legyen meg a helyi kép
        if avatarImage == nil {
            loadAvatarFromDisk()
        }
        do {
            let user = try await AuthAPI.me(token: token)
            applyRemote(user, preferLocalAvatar: true)
            saveLocal()
            authError = nil
        } catch {
            // Csak érvénytelen tokennél lépünk ki — ne töröljük a profilképet offline / 5xx miatt
            if let auth = error as? AuthAPI.AuthError, case .unauthorized = auth {
                clearSession(removeAvatarFiles: false)
            }
            // Offline / egyéb hiba: helyi session + avatar megmarad
            if avatarImage == nil {
                loadAvatarFromDisk()
            }
        }
    }

    func login(email: String, password: String) async -> Bool {
        authError = nil
        do {
            let result = try await AuthAPI.login(email: email, password: password)
            token = result.token
            applyRemote(result.user, preferLocalAvatar: true)
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
            applyRemote(result.user, preferLocalAvatar: true)
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
        // Kilépéskor a helyi kép fájl megmarad — következő belépésnél visszajön
        clearSession(removeAvatarFiles: false)
    }

    func saveProfileToServer() async -> String? {
        guard let token else { return "Nem vagy bejelentkezve." }
        do {
            let user = try await AuthAPI.saveProfile(token: token, profile: profile.remotePayload())
            applyRemote(user, preferLocalAvatar: true)
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
            clearSession(removeAvatarFiles: true)
            return nil
        } catch {
            return (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    func reset() {
        clearSession(removeAvatarFiles: false)
    }

    private func applyRemote(_ user: AuthAPI.RemoteUser, preferLocalAvatar: Bool = false) {
        userId = user.id
        profile.apply(remote: user)
        let remote = user.profile.avatarDataUrl?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if !remote.isEmpty, let decoded = Self.imageFromDataURL(remote) {
            let resized = Self.resize(decoded, maxSide: 512)
            // Ha a helyi kép már megvan és a szerver ugyanazt / gyengébbet adná,
            // preferLocalAvatar esetén tartsuk a helyit, de mentsük mindkét kulcsra.
            if preferLocalAvatar, avatarImage != nil {
                if let avatarImage {
                    persistAvatarToDisk(avatarImage)
                }
            } else {
                avatarImage = resized
                persistAvatarToDisk(resized)
            }
        } else {
            // Szerveren nincs (vagy hibás) avatar — soha ne töröljük a helyi képet
            if let avatarImage {
                persistAvatarToDisk(avatarImage)
            } else {
                loadAvatarFromDisk()
            }
        }
    }

    private func clearSession(removeAvatarFiles: Bool) {
        avatarImage = nil
        if removeAvatarFiles {
            self.removeAvatarFiles()
        }
        token = nil
        userId = nil
        profile = UserProfile()
        UserDefaults.standard.removeObject(forKey: profileKey)
        UserDefaults.standard.removeObject(forKey: tokenKey)
        UserDefaults.standard.removeObject(forKey: userIdKey)
        PushNotificationService.shared.stopPolling()
    }
}
