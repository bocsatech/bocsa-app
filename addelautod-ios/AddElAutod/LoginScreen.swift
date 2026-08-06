import SwiftUI

/// Közös Autosweb fiók — ugyanaz a belépés, mint a weben.
struct LoginScreen: View {
    @EnvironmentObject private var profile: ProfileStore

    @State private var mode: Mode = .login
    @State private var email = ""
    @State private var password = ""
    @State private var passwordConfirm = ""
    @State private var busy = false

    private enum Mode {
        case login, register
    }

    var body: some View {
        VStack(spacing: 0) {
            Spacer(minLength: 24)

            VStack(alignment: .leading, spacing: 8) {
                Text("Add el autod")
                    .font(.largeTitle.weight(.bold))
                    .foregroundStyle(AppTheme.textPrimary)
                Text(mode == .login
                     ? "Jelentkezz be a közös fiókkal (web + app)."
                     : "Regisztrálj — ugyanaz a fiók működik az autós oldalon is.")
                    .font(.subheadline)
                    .foregroundStyle(AppTheme.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 24)

            VStack(spacing: 14) {
                TextField("Email", text: $email)
                    .textFieldStyle(.roundedBorder)
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()

                SecureField("Jelszó", text: $password)
                    .textFieldStyle(.roundedBorder)
                    .textContentType(mode == .register ? .newPassword : .password)

                if mode == .register {
                    SecureField("Jelszó mégegyszer", text: $passwordConfirm)
                        .textFieldStyle(.roundedBorder)
                        .textContentType(.newPassword)
                }

                if let err = profile.authError, !err.isEmpty {
                    Text(err)
                        .font(.footnote)
                        .foregroundStyle(.red)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                Button {
                    Task { await submit() }
                } label: {
                    Group {
                        if busy {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Text(mode == .login ? "Belépés" : "Regisztráció")
                                .font(.body.weight(.semibold))
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .foregroundStyle(.white)
                    .background(AppTheme.accent)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                }
                .disabled(busy || email.trimmingCharacters(in: .whitespaces).isEmpty || password.isEmpty)

                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        mode = mode == .login ? .register : .login
                        profile.authError = nil
                    }
                } label: {
                    Text(mode == .login
                         ? "Nincs fiókod? Regisztráció"
                         : "Van már fiókod? Belépés")
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(AppTheme.accent)
                }
            }
            .padding(24)

            Text("Autosweb kell futnia (3456), hogy a fiók a webbel közös legyen.")
                .font(.caption)
                .foregroundStyle(AppTheme.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 28)

            Spacer()
        }
        .background(AppTheme.bg.ignoresSafeArea())
    }

    private func submit() async {
        busy = true
        defer { busy = false }
        let ok: Bool
        if mode == .login {
            ok = await profile.login(email: email, password: password)
        } else {
            ok = await profile.register(
                email: email,
                password: password,
                passwordConfirm: passwordConfirm
            )
        }
        if ok {
            password = ""
            passwordConfirm = ""
        }
    }
}

#Preview {
    LoginScreen()
        .environmentObject(ProfileStore())
}
