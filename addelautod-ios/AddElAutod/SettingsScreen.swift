import SwiftUI

/// Autosweb /beallitasok.html?szekcio=fiok — Fiók szerkesztése (személyes adatok)
struct SettingsScreen: View {
    @EnvironmentObject private var profile: ProfileStore
    var onClose: () -> Void

    @State private var toast: String?
    @State private var currentPassword = ""
    @State private var newPassword = ""
    @State private var newPasswordConfirm = ""

    var body: some View {
        VStack(spacing: 0) {
            ScreenHeader(title: "Beállítások", subtitle: "Fiók szerkesztése", onBack: onClose)
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    personalCard
                    passwordCard
                    notifyCard
                    dangerCard
                }
                .padding(16)
                .padding(.bottom, 32)
            }
        }
        .background(AppTheme.bgGrouped)
        .alert("Beállítások", isPresented: Binding(
            get: { toast != nil },
            set: { if !$0 { toast = nil } }
        )) {
            Button("OK", role: .cancel) { toast = nil }
        } message: {
            Text(toast ?? "")
        }
    }

    private var personalCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Személyes adatok")
                .font(.headline)

            HStack(spacing: 14) {
                ZStack {
                    Circle()
                        .fill(AppTheme.accent.opacity(0.15))
                        .frame(width: 64, height: 64)
                    Text(profile.profile.avatarLetter)
                        .font(.title.weight(.semibold))
                        .foregroundStyle(AppTheme.accent)
                }
                VStack(alignment: .leading, spacing: 4) {
                    Text(profile.profile.displayName)
                        .font(.body.weight(.semibold))
                    Text("Profilkép — később feltöltés")
                        .font(.caption)
                        .foregroundStyle(AppTheme.textSecondary)
                }
            }

            fieldLabel("Megszólítás")
            Picker("", selection: $profile.profile.salutation) {
                Text("—").tag("")
                Text("Úr").tag("ur")
                Text("Hölgy").tag("holgy")
                Text("Egyéb").tag("egyeb")
            }
            .pickerStyle(.menu)
            .frame(maxWidth: .infinity, alignment: .leading)

            HStack(spacing: 10) {
                VStack(alignment: .leading, spacing: 6) {
                    fieldLabel("Keresztnév")
                    TextField("", text: $profile.profile.firstName)
                        .textFieldStyle(.roundedBorder)
                        .textContentType(.givenName)
                }
                VStack(alignment: .leading, spacing: 6) {
                    fieldLabel("Vezetéknév")
                    TextField("", text: $profile.profile.lastName)
                        .textFieldStyle(.roundedBorder)
                        .textContentType(.familyName)
                }
            }

            fieldLabel("Utca, házszám")
            TextField("", text: $profile.profile.street)
                .textFieldStyle(.roundedBorder)
                .textContentType(.streetAddressLine1)

            HStack(spacing: 10) {
                VStack(alignment: .leading, spacing: 6) {
                    fieldLabel("Irányítószám")
                    TextField("", text: $profile.profile.postalCode)
                        .textFieldStyle(.roundedBorder)
                        .textContentType(.postalCode)
                        .keyboardType(.numberPad)
                }
                VStack(alignment: .leading, spacing: 6) {
                    fieldLabel("Város")
                    TextField("", text: $profile.profile.city)
                        .textFieldStyle(.roundedBorder)
                        .textContentType(.addressCity)
                }
            }

            fieldLabel("Ország")
            TextField("", text: $profile.profile.country)
                .textFieldStyle(.roundedBorder)
                .textContentType(.countryName)

            fieldLabel("Telefon")
            TextField("+36 …", text: $profile.profile.phone)
                .textFieldStyle(.roundedBorder)
                .keyboardType(.phonePad)
                .textContentType(.telephoneNumber)

            fieldLabel("Email")
            TextField("email@pelda.hu", text: $profile.profile.email)
                .textFieldStyle(.roundedBorder)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .textContentType(.emailAddress)

            fieldLabel("Fióktípus")
            Picker("", selection: $profile.profile.accountType) {
                Text("Magánszemély").tag("private")
                Text("Vállalkozás (nem kereskedő)").tag("business")
            }
            .pickerStyle(.menu)

            if profile.profile.accountType == "business" {
                fieldLabel("Cégnév")
                TextField("", text: $profile.profile.company)
                    .textFieldStyle(.roundedBorder)
                    .textContentType(.organizationName)
            }

            Button {
                profile.save()
                toast = "Adatok mentve."
            } label: {
                Text("Adatok mentése")
                    .font(.body.weight(.semibold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .foregroundStyle(.white)
                    .background(AppTheme.accent)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppTheme.bgElevated)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private var passwordCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Jelszó módosítása")
                .font(.headline)
            SecureField("Jelenlegi jelszó", text: $currentPassword)
                .textFieldStyle(.roundedBorder)
            SecureField("Új jelszó", text: $newPassword)
                .textFieldStyle(.roundedBorder)
            SecureField("Új jelszó mégegyszer", text: $newPasswordConfirm)
                .textFieldStyle(.roundedBorder)
            Button {
                if newPassword.count < 4 {
                    toast = "Az új jelszó legyen legalább 4 karakter."
                    return
                }
                if newPassword != newPasswordConfirm {
                    toast = "A két új jelszó nem egyezik."
                    return
                }
                currentPassword = ""
                newPassword = ""
                newPasswordConfirm = ""
                toast = "Jelszó mentve (helyi demó)."
            } label: {
                Text("Jelszó mentése")
                    .font(.body.weight(.semibold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .foregroundStyle(.white)
                    .background(AppTheme.accent)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppTheme.bgElevated)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private var notifyCard: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Hírlevél és értesítések")
                .font(.headline)
                .padding(.bottom, 8)

            Toggle("Üzenetek e-mailben", isOn: $profile.profile.notifyMessages)
                .tint(.green)
            Toggle("Parkoló: árváltozás", isOn: $profile.profile.notifyFavorites)
                .tint(.green)
            Toggle("Érdeklődések", isOn: $profile.profile.notifyInterests)
                .tint(.green)
            Toggle("Hírlevél / tippek (marketing)", isOn: $profile.profile.notifyNewsletter)
                .tint(.green)

            Button {
                profile.save()
                toast = "Értesítési beállítások mentve."
            } label: {
                Text("Értesítések mentése")
                    .font(.body.weight(.semibold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .foregroundStyle(.white)
                    .background(AppTheme.accent)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            }
            .padding(.top, 8)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppTheme.bgElevated)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private var dangerCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Fiók törlése")
                .font(.headline)
            Text("A fiók törlése végleges ezen a gépen (helyi demó-fiók).")
                .font(.subheadline)
                .foregroundStyle(AppTheme.textSecondary)
            Button(role: .destructive) {
                profile.reset()
                toast = "Fiók törölve (helyi demó)."
            } label: {
                Text("Fiók törlése")
                    .font(.body.weight(.semibold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppTheme.bgElevated)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private func fieldLabel(_ text: String) -> some View {
        Text(text)
            .font(.caption.weight(.semibold))
            .foregroundStyle(AppTheme.textSecondary)
    }
}
