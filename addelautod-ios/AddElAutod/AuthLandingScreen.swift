import SwiftUI

/// Vendég belépő — krém háttér, Bejelentkezés / Regisztráció + módszer gombok.
struct AuthLandingScreen: View {
    @EnvironmentObject private var profile: ProfileStore

    @State private var mode: AuthPage = .login
    @State private var path: AuthPath?
    @State private var toast: String?
    @State private var showServer = false
    @State private var serverNote: String?

    /// Krém háttér (Temu-stílusú belépő).
    private let cream = Color(red: 0.980, green: 0.965, blue: 0.945)

    private enum AuthPath: String, Identifiable, Hashable {
        case email
        case phone
        var id: String { rawValue }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                topBar

                ScrollView {
                    VStack(spacing: 18) {
                        modePicker
                            .padding(.top, 28)

                        Text(mode == .login ? "Bejelentkezés" : "Regisztráció")
                            .font(.system(size: 28, weight: .bold))
                            .foregroundStyle(Color(red: 0.35, green: 0.22, blue: 0.14))
                            .frame(maxWidth: .infinity, alignment: .center)
                            .padding(.top, 8)

                        Text(mode == .login
                             ? "Válaszd ki, hogyan lépsz be."
                             : "Válaszd ki, hogyan hozod létre a fiókot.")
                            .font(.subheadline)
                            .foregroundStyle(Color(red: 0.45, green: 0.40, blue: 0.36))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 24)

                        VStack(spacing: 12) {
                            methodButton(
                                title: mode == .login ? "Tovább Apple-lel" : "Regisztráció Apple-lel",
                                systemImage: "apple.logo",
                                tint: .white,
                                filled: true
                            ) {
                                toast = "Az Apple belépéshez fizetős Apple Developer fiók és „Sign in with Apple” kell. Addig használd az emailt vagy a telefont."
                            }
                            methodButton(
                                title: mode == .login ? "Tovább Google-lal" : "Regisztráció Google-lal",
                                systemImage: nil,
                                googleColors: true,
                                filled: false
                            ) {
                                toast = "A Google belépés hamarosan elérhető. Addig használd az emailt vagy a telefont."
                            }
                            methodButton(
                                title: mode == .login ? "Tovább Facebookkal" : "Regisztráció Facebookkal",
                                systemImage: "f.circle.fill",
                                tint: Color(red: 0.09, green: 0.47, blue: 0.95),
                                filled: false
                            ) {
                                toast = "A Facebook belépés hamarosan elérhető. Addig használd az emailt vagy a telefont."
                            }
                            methodButton(
                                title: mode == .login ? "Tovább e-maillel" : "Regisztráció e-maillel",
                                systemImage: "envelope",
                                tint: .primary,
                                filled: false
                            ) {
                                path = .email
                            }
                            methodButton(
                                title: mode == .login ? "Tovább telefonszámmal" : "Regisztráció telefonszámmal",
                                systemImage: "iphone",
                                tint: .primary,
                                filled: false
                            ) {
                                path = .phone
                            }
                        }
                        .padding(.horizontal, 28)
                        .padding(.top, 12)

                        Button("Probléma a bejelentkezéssel?") {
                            showServer = true
                        }
                        .font(.footnote)
                        .foregroundStyle(Color(red: 0.55, green: 0.52, blue: 0.48))
                        .padding(.top, 8)
                        .padding(.bottom, 32)
                    }
                }
            }
            .background(cream.ignoresSafeArea())
            .navigationDestination(item: $path) { route in
                AuthCredentialScreen(
                    mode: mode,
                    method: route == .email ? .email : .phone,
                    onBack: { path = nil },
                    onSwitchMode: { mode = $0 }
                )
                .environmentObject(profile)
            }
            .sheet(isPresented: $showServer) {
                NavigationStack {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 12) {
                            AutoswebServerSettingsCard(onMessage: { serverNote = $0 })
                            if let serverNote, !serverNote.isEmpty {
                                Text(serverNote)
                                    .font(.caption)
                                    .foregroundStyle(AppTheme.textSecondary)
                            }
                            Text("Ha a telefonon nem megy a belépés, add meg a Mac Autosweb Wi‑Fi IP-jét.")
                                .font(.footnote)
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                        .padding(16)
                    }
                    .navigationTitle("Szerver")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Kész") { showServer = false }
                        }
                    }
                }
                .presentationDetents([.medium, .large])
            }
            .alert("Belépés", isPresented: Binding(
                get: { toast != nil },
                set: { if !$0 { toast = nil } }
            )) {
                Button("OK", role: .cancel) { toast = nil }
            } message: {
                Text(toast ?? "")
            }
        }
        .onAppear { profile.authError = nil }
    }

    private var topBar: some View {
        HStack {
            Text("Add el autod.hu")
                .font(.subheadline.weight(.bold))
                .foregroundStyle(AppTheme.text)
            Spacer()
            Button {
                showServer = true
            } label: {
                Image(systemName: "gearshape")
                    .font(.body.weight(.medium))
                    .foregroundStyle(AppTheme.textSecondary)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Szerver beállítás")
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(cream.opacity(0.95))
    }

    private var modePicker: some View {
        HStack(spacing: 0) {
            modeChip("Bejelentkezés", .login)
            modeChip("Regisztráció", .register)
        }
        .padding(4)
        .background(Color.white.opacity(0.7))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(AppTheme.border.opacity(0.7), lineWidth: 1)
        )
        .padding(.horizontal, 28)
    }

    private func modeChip(_ title: String, _ value: AuthPage) -> some View {
        Button {
            withAnimation(.easeInOut(duration: 0.18)) { mode = value }
            profile.authError = nil
        } label: {
            Text(title)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(mode == value ? Color.white : Color(red: 0.2, green: 0.15, blue: 0.12))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 11)
                .background(
                    mode == value
                        ? Color(red: 0.067, green: 0.067, blue: 0.067)
                        : Color.clear
                )
                .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
        }
        .buttonStyle(.plain)
    }

    private func methodButton(
        title: String,
        systemImage: String?,
        tint: Color = .primary,
        googleColors: Bool = false,
        filled: Bool,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: 12) {
                if googleColors {
                    Text("G")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(
                            LinearGradient(
                                colors: [
                                    Color(red: 0.26, green: 0.52, blue: 0.96),
                                    Color(red: 0.22, green: 0.73, blue: 0.39),
                                    Color(red: 0.98, green: 0.74, blue: 0.02),
                                    Color(red: 0.92, green: 0.26, blue: 0.21),
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 28)
                } else if let systemImage {
                    Image(systemName: systemImage)
                        .font(.system(size: 18, weight: .medium))
                        .foregroundStyle(tint)
                        .frame(width: 28)
                }
                Text(title)
                    .font(.body.weight(.semibold))
                    .foregroundStyle(filled ? Color.white : Color(red: 0.12, green: 0.12, blue: 0.12))
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 18)
            .frame(maxWidth: .infinity)
            .frame(height: 52)
            .background(filled ? Color.black : Color.white)
            .overlay(
                RoundedRectangle(cornerRadius: 26, style: .continuous)
                    .stroke(Color.black.opacity(filled ? 0 : 0.18), lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 26, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Email / telefon űrlap

struct AuthCredentialScreen: View {
    @EnvironmentObject private var profile: ProfileStore

    enum Method {
        case email, phone
    }

    let mode: AuthPage
    let method: Method
    var onBack: () -> Void
    var onSwitchMode: (AuthPage) -> Void

    @State private var activeMode: AuthPage = .login
    @State private var email = ""
    @State private var phone = ""
    @State private var password = ""
    @State private var passwordConfirm = ""
    @State private var busy = false
    @State private var serverNote: String?

    private let cream = Color(red: 0.980, green: 0.965, blue: 0.945)

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                AutoswebServerSettingsCard(onMessage: { serverNote = $0 })

                if let serverNote, !serverNote.isEmpty {
                    Text(serverNote)
                        .font(.caption)
                        .foregroundStyle(AppTheme.textSecondary)
                }

                Text(title)
                    .font(.title2.weight(.bold))
                    .foregroundStyle(AppTheme.text)

                Text(subtitle)
                    .font(.subheadline)
                    .foregroundStyle(AppTheme.textSecondary)

                Text("Először állítsd be fent a Mac Autosweb címét (Wi‑Fi IP), majd jelentkezz be.")
                    .font(.footnote)
                    .foregroundStyle(AppTheme.textTertiary)

                if method == .email {
                    fieldLabel("Email")
                    TextField("pelda@email.hu", text: $email)
                        .textFieldStyle(.plain)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 11)
                        .background(Color.white)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8, style: .continuous)
                                .stroke(AppTheme.border, lineWidth: 1)
                        )
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                } else {
                    fieldLabel("Telefonszám")
                    TextField("+36 30 …", text: $phone)
                        .textFieldStyle(.plain)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 11)
                        .background(Color.white)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8, style: .continuous)
                                .stroke(AppTheme.border, lineWidth: 1)
                        )
                        .textContentType(.telephoneNumber)
                        .keyboardType(.phonePad)
                }

                fieldLabel("Jelszó")
                SecureField("", text: $password)
                    .textFieldStyle(.plain)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 11)
                    .background(Color.white)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8, style: .continuous)
                            .stroke(AppTheme.border, lineWidth: 1)
                    )
                    .textContentType(activeMode == .register ? .newPassword : .password)

                if activeMode == .register {
                    fieldLabel("Jelszó megerősítése")
                    SecureField("", text: $passwordConfirm)
                        .textFieldStyle(.plain)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 11)
                        .background(Color.white)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8, style: .continuous)
                                .stroke(AppTheme.border, lineWidth: 1)
                        )
                        .textContentType(.newPassword)
                }

                if let err = profile.authError, !err.isEmpty {
                    Text(err)
                        .font(.footnote)
                        .foregroundStyle(Color(red: 0.75, green: 0.12, blue: 0.12))
                }

                Button {
                    Task { await submit() }
                } label: {
                    Group {
                        if busy {
                            ProgressView().tint(.white)
                        } else {
                            Text(activeMode == .login ? "Belépés" : "Regisztráció")
                                .font(.body.weight(.semibold))
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 13)
                    .foregroundStyle(.white)
                    .background(Color(red: 0.067, green: 0.067, blue: 0.067))
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .disabled(busy || !canSubmit)
                .padding(.top, 4)

                HStack(spacing: 4) {
                    Text(activeMode == .login ? "Nincs még fiókod?" : "Már van fiókod?")
                        .foregroundStyle(AppTheme.textSecondary)
                    Button(activeMode == .login ? "Regisztráció" : "Belépés") {
                        profile.authError = nil
                        let next: AuthPage = activeMode == .login ? .register : .login
                        activeMode = next
                        onSwitchMode(next)
                    }
                    .fontWeight(.medium)
                    .foregroundStyle(AppTheme.accent)
                }
                .font(.footnote)
                .padding(.top, 8)
            }
            .padding(20)
            .background(Color.white)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(AppTheme.border, lineWidth: 1)
            )
            .padding(16)
        }
        .background(cream.ignoresSafeArea())
        .navigationTitle(method == .email ? "E-mail" : "Telefon")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Vissza", action: onBack)
            }
        }
        .onAppear {
            activeMode = mode
            profile.authError = nil
        }
    }

    private var title: String {
        switch (activeMode, method) {
        case (.login, .email): return "Belépés e-maillel"
        case (.register, .email): return "Regisztráció e-maillel"
        case (.login, .phone): return "Belépés telefonszámmal"
        case (.register, .phone): return "Regisztráció telefonszámmal"
        }
    }

    private var subtitle: String {
        method == .email
            ? "Az Autosweb fiókod email címe és jelszava."
            : "A telefonszám lesz a fiókod azonosítója (Autosweb)."
    }

    private var canSubmit: Bool {
        if password.isEmpty { return false }
        if activeMode == .register, passwordConfirm.isEmpty { return false }
        if method == .email {
            return !email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        }
        return phone.filter(\.isNumber).count >= 7
    }

    private func fieldLabel(_ text: String) -> some View {
        Text(text)
            .font(.caption.weight(.semibold))
            .foregroundStyle(AppTheme.textSecondary)
    }

    private func phoneAccountEmail(_ raw: String) -> String {
        let digits = raw.filter(\.isNumber)
        return "t\(digits)@phone.addelautod.local"
    }

    @MainActor
    private func submit() async {
        busy = true
        defer { busy = false }
        let accountEmail: String
        let phoneValue: String
        if method == .email {
            accountEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
            phoneValue = ""
        } else {
            phoneValue = phone.trimmingCharacters(in: .whitespacesAndNewlines)
            accountEmail = phoneAccountEmail(phoneValue)
        }

        let ok: Bool
        if activeMode == .login {
            ok = await profile.login(email: accountEmail, password: password)
        } else {
            ok = await profile.register(
                email: accountEmail,
                password: password,
                passwordConfirm: passwordConfirm
            )
            if ok, method == .phone, !phoneValue.isEmpty {
                profile.profile.phone = phoneValue
                profile.saveLocal()
                _ = await profile.saveProfileToServer()
            }
        }
        if ok {
            password = ""
            passwordConfirm = ""
        }
    }
}
