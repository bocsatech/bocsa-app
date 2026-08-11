import SwiftUI

/// Profilkép → teljes képernyős fiókmenü (bezárás után az előző oldalon marad).
struct AccountMenuScreen: View {
    @EnvironmentObject private var profile: ProfileStore
    @EnvironmentObject private var searchStore: SearchStore
    @EnvironmentObject private var pageLayout: PageLayoutStore

    var onClose: () -> Void
    /// Mentett keresés → főoldal kereső
    var onOpenSearch: (() -> Void)? = nil

    private enum Destination: Identifiable {
        case messages, savedSearches, favorites, myAds, settings, prints, reviews

        var id: String {
            switch self {
            case .messages: return "messages"
            case .savedSearches: return "saved"
            case .favorites: return "favorites"
            case .myAds: return "myAds"
            case .settings: return "settings"
            case .prints: return "prints"
            case .reviews: return "reviews"
            }
        }
    }

    @State private var destination: Destination?

    private let accentPurple = Color(red: 0.42, green: 0.28, blue: 0.72)

    var body: some View {
        Group {
            if let destination {
                destinationView(destination)
            } else {
                menuRoot
            }
        }
    }

    private var menuRoot: some View {
        VStack(spacing: 0) {
            ScreenHeader(title: "Fiók", subtitle: nil, onBack: onClose)

            ScrollView {
                VStack(spacing: 0) {
                    menuRow(icon: "bubble.left.and.bubble.right", title: "Üzenetek") {
                        destination = .messages
                    }
                    Divider().padding(.leading, 56)
                    menuRow(icon: "star", title: "Mentett kereséseim") {
                        destination = .savedSearches
                    }
                    Divider().padding(.leading, 56)
                    menuRow(icon: "heart", title: "Kedvencek") {
                        destination = .favorites
                    }
                    Divider().padding(.leading, 56)
                    menuRow(icon: "car.side", title: "Hirdetéseim") {
                        destination = .myAds
                    }
                    Divider().padding(.leading, 56)
                    menuRow(icon: "gearshape", title: "Beállítások") {
                        destination = .settings
                    }
                    Divider().padding(.leading, 56)
                    menuRow(icon: "printer", title: "Nyomtatások") {
                        destination = .prints
                    }
                    Divider().padding(.leading, 56)
                    menuRow(icon: "star.bubble", title: "Értékelések") {
                        destination = .reviews
                    }
                }
                .background(Color.white)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .stroke(AppTheme.border.opacity(0.85), lineWidth: 1)
                )
                .shadow(color: Color.black.opacity(0.06), radius: 10, x: 0, y: 3)
                .padding(16)

                VStack(spacing: 12) {
                    Text("Bejelentkezve mint \(displayName)")
                        .font(.footnote)
                        .foregroundStyle(AppTheme.textSecondary)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    Button {
                        Task {
                            await profile.logout()
                            onClose()
                        }
                    } label: {
                        Text("Kijelentkezés")
                            .font(.body.weight(.semibold))
                            .foregroundStyle(accentPurple)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Color.white)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12, style: .continuous)
                                    .stroke(accentPurple, lineWidth: 1.5)
                            )
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 32)
            }
        }
        .background(Color(red: 0.949, green: 0.957, blue: 0.969).ignoresSafeArea())
    }

    private var displayName: String {
        let name = profile.profile.displayName.trimmingCharacters(in: .whitespacesAndNewlines)
        if !name.isEmpty { return name }
        let email = profile.profile.email.trimmingCharacters(in: .whitespacesAndNewlines)
        return email.isEmpty ? "—" : email
    }

    private func menuRow(icon: String, title: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 14) {
                Image(systemName: icon)
                    .font(.system(size: 18, weight: .regular))
                    .foregroundStyle(AppTheme.text)
                    .frame(width: 28, alignment: .center)
                Text(title)
                    .font(.body)
                    .foregroundStyle(AppTheme.text)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(AppTheme.textTertiary)
            }
            .padding(.horizontal, 16)
            .frame(minHeight: 52)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private func destinationView(_ dest: Destination) -> some View {
        switch dest {
        case .messages:
            MessagesScreen(onClose: { destination = nil })
        case .savedSearches:
            SavedSearchesScreen(
                onOpenSearch: {
                    destination = nil
                    onClose()
                    onOpenSearch?()
                },
                onBack: { destination = nil }
            )
        case .settings:
            SettingsScreen(onClose: { destination = nil })
                .environmentObject(profile)
                .environmentObject(pageLayout)
        case .favorites:
            accountPlaceholder(title: "Kedvencek", message: "Itt jelennek meg a kedvenc hirdetéseid.")
        case .myAds:
            accountPlaceholder(title: "Hirdetéseim", message: "Itt jelennek meg a feladott hirdetéseid.")
        case .prints:
            accountPlaceholder(title: "Nyomtatások", message: "Nyomtatási előzmények és dokumentumok.")
        case .reviews:
            accountPlaceholder(title: "Értékelések", message: "Kapott és adott értékelések.")
        }
    }

    private func accountPlaceholder(title: String, message: String) -> some View {
        VStack(spacing: 0) {
            ScreenHeader(title: title, onBack: { destination = nil })
            VStack(spacing: 12) {
                Spacer()
                Text(message)
                    .font(.subheadline)
                    .foregroundStyle(AppTheme.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
                Spacer()
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(AppTheme.bgGrouped)
        }
    }
}
