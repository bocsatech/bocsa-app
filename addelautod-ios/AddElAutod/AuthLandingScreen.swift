import SwiftUI

/// Vendég belépő — krém háttér, belépési módszerek. A fiók automatikusan létrejön, ha még nincs.
struct AuthLandingScreen: View {
    @EnvironmentObject private var profile: ProfileStore

    @State private var path: AuthPath?
    @State private var toast: String?

    /// Krém háttér (Temu-stílusú belépő).
    private let cream = Color(red: 0.980, green: 0.965, blue: 0.945)

    private enum AuthPath: String, Identifiable, Hashable {
        case email
        case phone
        var id: String { rawValue }
    }

    var body: some View {
        NavigationStack {
            GeometryReader { geo in
                ScrollView(showsIndicators: false) {
                    VStack(spacing: 0) {
                        brandLogo
                            .padding(.top, 8)
                            .padding(.bottom, 12)

                        Spacer(minLength: max(32, geo.size.height * 0.12))

                        Text("Belépés")
                            .font(.system(size: 28, weight: .bold))
                            .foregroundStyle(Color(red: 0.35, green: 0.22, blue: 0.14))
                            .frame(maxWidth: .infinity, alignment: .center)

                        Text("Válaszd ki, hogyan lépsz be. Ha még nincs fiókod, létrehozzuk.")
                            .font(.subheadline)
                            .foregroundStyle(Color(red: 0.45, green: 0.40, blue: 0.36))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 24)
                            .padding(.top, 8)

                        VStack(spacing: 12) {
                            methodButton(
                                title: "Tovább Apple-lel",
                                systemImage: "apple.logo",
                                tint: .white,
                                filled: true
                            ) {
                                toast = "Az Apple belépéshez fizetős Apple Developer fiók és „Sign in with Apple” kell. Addig használd az emailt vagy a telefont."
                            }
                            methodButton(
                                title: "Tovább Google-lal",
                                systemImage: nil,
                                googleColors: true,
                                filled: false
                            ) {
                                toast = "A Google belépés hamarosan elérhető. Addig használd az emailt vagy a telefont."
                            }
                            methodButton(
                                title: "Tovább Facebookkal",
                                systemImage: "f.circle.fill",
                                tint: Color(red: 0.09, green: 0.47, blue: 0.95),
                                filled: false
                            ) {
                                toast = "A Facebook belépés hamarosan elérhető. Addig használd az emailt vagy a telefont."
                            }
                            methodButton(
                                title: "Tovább e-maillel",
                                systemImage: "envelope",
                                tint: .primary,
                                filled: false
                            ) {
                                path = .email
                            }
                            methodButton(
                                title: "Tovább telefonszámmal",
                                systemImage: "iphone",
                                tint: .primary,
                                filled: false
                            ) {
                                path = .phone
                            }
                        }
                        .padding(.horizontal, 28)
                        .padding(.top, 16)
                        .padding(.bottom, 28)
                    }
                    .frame(minHeight: geo.size.height, alignment: .top)
                }
            }
            .background(cream.ignoresSafeArea())
            .navigationDestination(item: $path) { route in
                AuthCredentialScreen(
                    method: route == .email ? .email : .phone,
                    onBack: { path = nil }
                )
                .environmentObject(profile)
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
        .onAppear {
            profile.authError = nil
        }
    }

    /// Teljes wordmark, scaledToFit — nem vágódik.
    private var brandLogo: some View {
        Image("BymyLogo")
            .resizable()
            .scaledToFit()
            .frame(maxWidth: .infinity)
            .padding(.horizontal, 28)
            .accessibilityLabel("Bymy")
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

    let method: Method
    var onBack: () -> Void

    @State private var email = ""
    @State private var phone = ""
    @State private var password = ""
    @State private var busy = false

    private let cream = Color(red: 0.980, green: 0.965, blue: 0.945)

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text(title)
                    .font(.title2.weight(.bold))
                    .foregroundStyle(AppTheme.text)

                Text(subtitle)
                    .font(.subheadline)
                    .foregroundStyle(AppTheme.textSecondary)

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
                    .textContentType(.password)

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
                            Text("Tovább")
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
            profile.authError = nil
        }
    }

    private var title: String {
        method == .email ? "Belépés e-maillel" : "Belépés telefonszámmal"
    }

    private var subtitle: String {
        method == .email
            ? "Add meg az email címed és a jelszavad. Ha még nincs fiókod, létrehozzuk."
            : "A telefonszám lesz a fiókod azonosítója. Ha még nincs fiókod, létrehozzuk."
    }

    private var canSubmit: Bool {
        if password.isEmpty { return false }
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
        return "t\(digits)@phone.bymy.local"
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

        let result = await profile.loginOrRegister(email: accountEmail, password: password)
        if result.ok {
            if result.created, method == .phone, !phoneValue.isEmpty {
                profile.profile.phone = phoneValue
                profile.saveLocal()
                _ = await profile.saveProfileToServer()
            }
            password = ""
        }
    }
}
