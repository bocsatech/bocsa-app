import SwiftUI

/// Autosweb header auth-sor: Belépés | Regisztráció (vagy Kijelentkezés).
struct SiteAuthBar: View {
    @EnvironmentObject private var profile: ProfileStore

    var onLogin: () -> Void
    var onRegister: () -> Void
    var onAccount: (() -> Void)? = nil

    var body: some View {
        HStack(spacing: 8) {
            Text("Add el autod.hu")
                .font(.subheadline.weight(.bold))
                .foregroundStyle(AppTheme.text)
                .lineLimit(1)

            Spacer(minLength: 8)

            if profile.isLoggedIn {
                Button {
                    onAccount?()
                } label: {
                    ZStack {
                        Circle()
                            .fill(AppTheme.accent.opacity(0.15))
                            .frame(width: 32, height: 32)
                        Text(profile.profile.avatarLetter)
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(AppTheme.accent)
                    }
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Fiók")

                Button {
                    Task { await profile.logout() }
                } label: {
                    Text("Kijelentkezés")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Color(red: 0.267, green: 0.267, blue: 0.267))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 7)
                        .background(Color.white)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8, style: .continuous)
                                .stroke(AppTheme.border, lineWidth: 1)
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                }
                .buttonStyle(.plain)
            } else {
                ghostButton("Belépés", action: onLogin)
                ghostButton("Regisztráció", action: onRegister)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Color.white)
        .overlay(alignment: .bottom) {
            Rectangle().fill(AppTheme.border).frame(height: 1)
        }
    }

    private func ghostButton(_ title: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.caption.weight(.semibold))
                .foregroundStyle(Color(red: 0.067, green: 0.067, blue: 0.067))
                .padding(.horizontal, 10)
                .padding(.vertical, 7)
                .background(Color.white)
                .overlay(
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .stroke(AppTheme.border, lineWidth: 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}
