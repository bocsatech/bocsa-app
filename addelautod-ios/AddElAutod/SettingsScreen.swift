import SwiftUI
import PhotosUI
import UIKit

/// Autosweb /beallitasok.html?szekcio=fiok — Fiók szerkesztése
struct SettingsScreen: View {
    @EnvironmentObject private var profile: ProfileStore
    @EnvironmentObject private var pageLayout: PageLayoutStore
    var onClose: () -> Void

    private enum Accordion: String {
        case personal, searchArea, password, notify, pages, autosweb
    }

    @State private var openAccordion: Accordion? = nil
    @State private var toast: String?
    @State private var currentPassword = ""
    @State private var newPassword = ""
    @State private var newPasswordConfirm = ""
    @State private var cityLookupBusy = false
    @State private var lastLookedUpPostal = ""
    @State private var photoItem: PhotosPickerItem?
    @State private var autoswebURLText = AutoswebBaseURL.currentString()
    @State private var autoswebTestBusy = false

    var body: some View {
        VStack(spacing: 0) {
            ScreenHeader(title: "Beállítások", subtitle: "Fiók szerkesztése", onBack: onClose)
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    profileHeader

                    accordion(.personal, title: "Személyes adatok") {
                        personalFields
                    }
                    accordion(.searchArea, title: "Keresési körzet") {
                        searchAreaFields
                    }
                    accordion(.password, title: "Jelszó módosítása") {
                        passwordFields
                    }
                    accordion(.notify, title: "Hírlevél és értesítések") {
                        notifyFields
                    }
                    accordion(.pages, title: "Oldalak szerkesztése") {
                        pagesEditor
                    }
                    accordion(.autosweb, title: "Autosweb (Wi‑Fi)") {
                        autoswebFields
                    }

                    logoutCard
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

    // MARK: - Profil fejléc (mindig látszik)

    private var profileHeader: some View {
        HStack(alignment: .center, spacing: 14) {
            ProfileAvatarView(
                image: profile.avatarImage,
                letter: profile.profile.avatarLetter,
                size: 72
            )

            VStack(alignment: .leading, spacing: 8) {
                Text(profile.profile.displayName)
                    .font(.body.weight(.semibold))

                HStack(spacing: 8) {
                    PhotosPicker(selection: $photoItem, matching: .images, photoLibrary: .shared()) {
                        Text(profile.avatarImage == nil ? "Feltöltés" : "Csere")
                            .font(.caption.weight(.semibold))
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .foregroundStyle(.white)
                            .background(AppTheme.accent)
                            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                    }
                    if profile.avatarImage != nil {
                        Button("Törlés") {
                            profile.clearAvatar()
                            toast = "Profilkép törölve."
                        }
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.red)
                    }
                }
            }

            Spacer(minLength: 8)

            VStack(spacing: 4) {
                ProfileQRView(profile: profile.profile, size: 72)
                Text("Profil QR")
                    .font(.caption2)
                    .foregroundStyle(AppTheme.textSecondary)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppTheme.bgElevated)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .onChange(of: photoItem) { _, item in
            guard let item else { return }
            Task {
                if let data = try? await item.loadTransferable(type: Data.self),
                   let image = UIImage(data: data) {
                    profile.setAvatar(image)
                    toast = "Profilkép mentve."
                } else {
                    toast = "A kép betöltése sikertelen."
                }
                photoItem = nil
            }
        }
    }

    // MARK: - Accordion

    private func accordion<Content: View>(
        _ section: Accordion,
        title: String,
        @ViewBuilder content: () -> Content
    ) -> some View {
        let isOpen = openAccordion == section
        return VStack(spacing: 0) {
            Button {
                withAnimation(.easeInOut(duration: 0.2)) {
                    openAccordion = isOpen ? nil : section
                }
            } label: {
                HStack {
                    Text(title)
                        .font(.body.weight(.semibold))
                        .foregroundStyle(AppTheme.text)
                    Spacer()
                    Image(systemName: isOpen ? "chevron.up" : "chevron.down")
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(AppTheme.textTertiary)
                }
                .padding(.horizontal, 16)
                .frame(minHeight: 52)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            if isOpen {
                Divider().padding(.leading, 16)
                content()
                    .padding(16)
            }
        }
        .background(AppTheme.bgElevated)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    // MARK: - Személyes adatok

    private var personalFields: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 10) {
                VStack(alignment: .leading, spacing: 6) {
                    fieldLabel("Vezetéknév")
                    TextField("", text: $profile.profile.lastName)
                        .textFieldStyle(.roundedBorder)
                        .textContentType(.familyName)
                }
                VStack(alignment: .leading, spacing: 6) {
                    fieldLabel("Keresztnév")
                    TextField("", text: $profile.profile.firstName)
                        .textFieldStyle(.roundedBorder)
                        .textContentType(.givenName)
                }
            }

            fieldLabel("Utca, házszám")
            TextField("", text: $profile.profile.street)
                .textFieldStyle(.roundedBorder)
                .textContentType(.streetAddressLine1)

            postalAndCityRow

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
                .disabled(true)

            fieldLabel("Fióktípus")
            Picker("", selection: $profile.profile.accountType) {
                Text("Magánszemély").tag("private")
                Text("Vállalkozás (nem kereskedő)").tag("business")
                Text("Autókereskedő").tag("dealer")
            }
            .pickerStyle(.menu)

            if profile.profile.accountType == "business" || profile.profile.accountType == "dealer" {
                fieldLabel(profile.profile.accountType == "dealer" ? "Kereskedés neve" : "Cégnév")
                TextField("", text: $profile.profile.company)
                    .textFieldStyle(.roundedBorder)
                    .textContentType(.organizationName)
            }

            Button {
                Task {
                    if let err = await profile.saveProfileToServer() {
                        toast = err
                    } else {
                        toast = "Adatok mentve (web + app)."
                    }
                }
            } label: {
                Text("Adatok mentése")
                    .font(.body.weight(.semibold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .foregroundStyle(.white)
                    .background(AppTheme.accent)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            }

            Button(role: .destructive) {
                Task {
                    if let err = await profile.deleteAccount() {
                        toast = err
                    } else {
                        onClose()
                    }
                }
            } label: {
                Text("Fiók törlése")
                    .font(.body.weight(.semibold))
                    .foregroundStyle(.red)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.top, 8)
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: - Keresési körzet

    private var searchAreaFields: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("A gyorsikonok (Diesel, Benzin…) ezzel az irányítószámmal és km-sugárral szűrnek.")
                .font(.footnote)
                .foregroundStyle(AppTheme.textSecondary)

            postalAndCityRow

            fieldLabel("Sugár (km)")
            Picker("Sugár", selection: $profile.profile.searchRadiusKm) {
                ForEach([5, 10, 15, 20, 30, 50, 75, 100], id: \.self) { km in
                    Text("\(km) km").tag(km)
                }
            }
            .pickerStyle(.wheel)
            .frame(height: 120)

            Button {
                profile.save()
                toast = "Keresési körzet mentve."
            } label: {
                Text("Körzet mentése")
                    .font(.body.weight(.semibold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .foregroundStyle(.white)
                    .background(AppTheme.accent)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            }
        }
    }

    // MARK: - Jelszó

    private var passwordFields: some View {
        VStack(alignment: .leading, spacing: 12) {
            SecureField("Jelenlegi jelszó", text: $currentPassword)
                .textFieldStyle(.roundedBorder)
            SecureField("Új jelszó", text: $newPassword)
                .textFieldStyle(.roundedBorder)
            SecureField("Új jelszó mégegyszer", text: $newPasswordConfirm)
                .textFieldStyle(.roundedBorder)
            Button {
                Task {
                    if let err = await profile.changePassword(
                        current: currentPassword,
                        newPassword: newPassword,
                        confirm: newPasswordConfirm
                    ) {
                        toast = err
                        return
                    }
                    currentPassword = ""
                    newPassword = ""
                    newPasswordConfirm = ""
                    toast = "Jelszó mentve (web + app)."
                }
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
    }

    // MARK: - Hírlevél

    private var notifyFields: some View {
        VStack(alignment: .leading, spacing: 4) {
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
    }

    // MARK: - Oldalak szerkesztése

    private var pagesEditor: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Kapcsold be/ki a lapokat, és húzd a sorrendet. A Fő oldal mindig látszik. Azonnal mentődik.")
                .font(.footnote)
                .foregroundStyle(AppTheme.textSecondary)

            List {
                ForEach(pageLayout.order) { id in
                    HStack(spacing: 12) {
                        Image(systemName: "line.3.horizontal")
                            .foregroundStyle(AppTheme.textTertiary)
                        Image(id.assetName)
                            .resizable()
                            .scaledToFit()
                            .frame(width: 28, height: 28)
                        Text(id.title)
                            .font(.body)
                        Spacer()
                        if id.canDisable {
                            Toggle("", isOn: Binding(
                                get: { pageLayout.isEnabled(id) },
                                set: { pageLayout.setEnabled(id, $0) }
                            ))
                            .labelsHidden()
                            .tint(AppTheme.accent)
                        } else {
                            Text("Mindig")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(AppTheme.accent)
                        }
                    }
                    .listRowInsets(EdgeInsets(top: 6, leading: 0, bottom: 6, trailing: 0))
                    .listRowBackground(Color.clear)
                    .listRowSeparator(.hidden)
                }
                .onMove(perform: pageLayout.move)
                .deleteDisabled(true)
            }
            .listStyle(.plain)
            .scrollDisabled(true)
            .environment(\.editMode, .constant(.active))
            .frame(height: CGFloat(pageLayout.order.count) * 52)
        }
    }

    // MARK: - Autosweb LAN

    private var autoswebFields: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Telefonon a Mac Wi‑Fi IP-jét add meg (nem localhost). Ugyanazon a Wi‑Fi-n kell lenniük.")
                .font(.footnote)
                .foregroundStyle(AppTheme.textSecondary)
            TextField("http://192.168.0.12:3456", text: $autoswebURLText)
                .textFieldStyle(.roundedBorder)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .keyboardType(.URL)
            HStack(spacing: 10) {
                Button("Mentés") {
                    if let url = AutoswebBaseURL.set(autoswebURLText) {
                        autoswebURLText = url.absoluteString
                        toast = "Autosweb cím: \(url.absoluteString)"
                    } else {
                        toast = "Érvénytelen cím."
                    }
                }
                .font(.body.weight(.semibold))
                Button("Teszt") {
                    Task { await testAutosweb() }
                }
                .font(.body.weight(.semibold))
                .disabled(autoswebTestBusy)
                if autoswebTestBusy { ProgressView().scaleEffect(0.8) }
                Spacer()
                Button("Localhost") {
                    autoswebURLText = AutoswebBaseURL.defaultSimulator
                    _ = AutoswebBaseURL.set(AutoswebBaseURL.defaultSimulator)
                    toast = "Visszaállítva: localhost (Simulator)."
                }
                .font(.footnote)
            }
            .foregroundStyle(AppTheme.accent)
        }
        .padding(16)
    }

    private func testAutosweb() async {
        _ = AutoswebBaseURL.set(autoswebURLText)
        autoswebTestBusy = true
        defer { autoswebTestBusy = false }
        let url = PartnerRecommendationsClient.baseURL.appendingPathComponent("api/db/stats")
        var req = URLRequest(url: url)
        req.timeoutInterval = 4
        do {
            let (_, response) = try await URLSession.shared.data(for: req)
            let code = (response as? HTTPURLResponse)?.statusCode ?? 0
            if (200..<500).contains(code) {
                toast = "Elérhető: \(PartnerRecommendationsClient.baseURL.absoluteString)"
            } else {
                toast = "Válasz: HTTP \(code)"
            }
        } catch {
            toast = "Nem elérhető. Macen fusson az Autosweb, ugyanaz a Wi‑Fi, helyes IP."
        }
    }

    // MARK: - Kijelentkezés

    private var logoutCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Kijelentkezés")
                .font(.headline)
            Button {
                Task { await profile.logout() }
            } label: {
                Text("Kijelentkezés")
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

    // MARK: - Shared

    private var postalAndCityRow: some View {
        HStack(alignment: .top, spacing: 10) {
            VStack(alignment: .leading, spacing: 6) {
                fieldLabel("Irányítószám")
                TextField("7083", text: $profile.profile.postalCode)
                    .textFieldStyle(.roundedBorder)
                    .textContentType(.postalCode)
                    .keyboardType(.numberPad)
                    .frame(width: 96)
                    .onChange(of: profile.profile.postalCode) { _, newValue in
                        let digits = String(newValue.filter(\.isNumber).prefix(4))
                        if digits != newValue {
                            profile.profile.postalCode = digits
                            return
                        }
                        Task { await lookupCityFromPostal() }
                    }
            }

            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 6) {
                    fieldLabel("Település")
                    if cityLookupBusy {
                        ProgressView()
                            .scaleEffect(0.7)
                    }
                }
                TextField("automatikus", text: $profile.profile.city)
                    .textFieldStyle(.roundedBorder)
                    .textContentType(.addressCity)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .task {
            await lookupCityFromPostal()
        }
    }

    private func lookupCityFromPostal() async {
        let digits = String(profile.profile.postalCode.filter(\.isNumber).prefix(4))
        guard digits.count == 4 else { return }
        guard digits != lastLookedUpPostal else { return }
        cityLookupBusy = true
        defer { cityLookupBusy = false }
        if let city = await PartnerRecommendationsClient.lookupCity(postalCode: digits) {
            lastLookedUpPostal = digits
            profile.profile.city = city
            profile.profile.postalCode = digits
        }
    }

    private func fieldLabel(_ text: String) -> some View {
        Text(text)
            .font(.caption.weight(.semibold))
            .foregroundStyle(AppTheme.textSecondary)
    }
}
