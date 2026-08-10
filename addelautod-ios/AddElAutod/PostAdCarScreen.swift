import SwiftUI
import PhotosUI
import UIKit

/// Személyautó hirdetés feladás — kezdő: Képek + Alap / Műszaki / Extrák, legalul Leírás + Feladás.
struct PostAdCarScreen: View {
    @StateObject private var store = SearchStore(persistSavedSearches: false)
    @StateObject private var photoStore = PostAdPhotoStore()
    var onClose: () -> Void

    @State private var panel: Panel = .simple
    @State private var listPanel: Panel = .simple
    @State private var openAccordion: AccordionSection? = .kepek
    @State private var brandQuery = ""
    @State private var toast: String?
    @State private var leiras: String = ""
    @State private var posting = false
    @State private var libraryItems: [PhotosPickerItem] = []
    @State private var showCamera = false
    @FocusState private var focusedField: FormFocus?

    private enum Panel: Equatable {
        case simple, advanced, brand, model(String), fuel, allapot, kivitel
        case ajtok, szemelyek, okmanyok, hirdeto
    }

    private enum AccordionSection: String {
        case kepek, alap, muszaki, extrak
    }

    private enum FormFocus: Hashable {
        case year, km, price, henger, leiras, brandSearch
    }

    var body: some View {
        filterStack
            .background(AppTheme.bgGrouped)
            .alert("Személyautó", isPresented: Binding(
                get: { toast != nil },
                set: { if !$0 { toast = nil } }
            )) {
                Button("OK", role: .cancel) { toast = nil }
            } message: {
                Text(toast ?? "")
            }
            .fullScreenCover(isPresented: $showCamera) {
                CameraPicker(
                    onImage: { image in
                        showCamera = false
                        do {
                            try photoStore.addImage(image)
                        } catch {
                            toast = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
                        }
                    },
                    onCancel: { showCamera = false }
                )
                .ignoresSafeArea()
            }
            .onChange(of: libraryItems) { _, items in
                guard !items.isEmpty else { return }
                Task { await importLibraryItems(items) }
            }
    }

    /// Fő űrlap a háttérben marad → almenüből vissza a scroll pozíció megmarad.
    private var isShowingMainForm: Bool {
        switch panel {
        case .simple, .advanced: return true
        default: return false
        }
    }

    private var filterStack: some View {
        ZStack {
            VStack(spacing: 0) {
                if panel == .advanced || listPanel == .advanced {
                    advancedHeader
                    advancedList
                } else {
                    simpleHeader
                    simpleList
                }
            }
            .opacity(isShowingMainForm ? 1 : 0)
            .allowsHitTesting(isShowingMainForm)
            .disabled(!isShowingMainForm) // fókusz/billentyűzet elengedése almenünél
            .accessibilityHidden(!isShowingMainForm)

            if !isShowingMainForm {
                VStack(spacing: 0) {
                    subpanelStack
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                .background(AppTheme.bgGrouped)
                .onAppear { dismissKeyboard() }
            }
        }
        .background(AppTheme.bgGrouped)
    }

    @ViewBuilder
    private var subpanelStack: some View {
        switch panel {
        case .simple, .advanced:
            EmptyView()
        case .brand:
            ScreenHeader(title: "Márka", onBack: goList, rightLabel: "Kész", onRight: finishBrandModelSelection)
            brandSearchField
            brandList
        case .model(let brand):
            ScreenHeader(
                title: brand,
                subtitle: "Modell — több is bekapcsolható",
                onBack: { panel = .brand },
                rightLabel: "Kész",
                onRight: finishBrandModelSelection
            )
            modelList(for: brand)
        case .fuel:
            ScreenHeader(title: "Üzemanyag", onBack: goList, rightLabel: "Kész", onRight: goList)
            fuelList
        case .allapot:
            ScreenHeader(title: "Állapot", onBack: goList, rightLabel: "Kész", onRight: goList)
            allapotList
        case .kivitel:
            ScreenHeader(title: "Kivitel", onBack: goList, rightLabel: "Kész", onRight: goList)
            singleSelectList(
                sectionTitle: "Kivitel",
                options: DetailedSearchCatalog.kiviteles,
                keyPath: \.kiviteles
            )
        case .ajtok:
            ScreenHeader(title: "Ajtók száma", onBack: goList, rightLabel: "Kész", onRight: goList)
            singleSelectList(
                sectionTitle: "Ajtók száma",
                options: DetailedSearchCatalog.ajtok,
                keyPath: \.ajtok
            )
        case .szemelyek:
            ScreenHeader(title: "Szállítható személyek", onBack: goList, rightLabel: "Kész", onRight: goList)
            singleSelectList(
                sectionTitle: "Szállítható személyek",
                options: DetailedSearchCatalog.szemelyek,
                keyPath: \.szemelyek
            )
        case .okmanyok:
            ScreenHeader(title: "Okmányok", onBack: goList, rightLabel: "Kész", onRight: goList)
            singleSelectList(
                sectionTitle: "Okmányok",
                options: DetailedSearchCatalog.okmanyok,
                keyPath: \.okmanyErvenyesseg
            )
        case .hirdeto:
            ScreenHeader(title: "Hirdető", onBack: goList, rightLabel: "Kész", onRight: goList)
            singleSelectList(
                sectionTitle: "Hirdető",
                options: DetailedSearchCatalog.hirdetok,
                keyPath: \.hirdetok
            )
        }
    }

    private var simpleHeader: some View {
        ScreenHeader(
            title: "Személyautó",
            subtitle: "Hirdetés feladás",
            onBack: onClose,
            rightLabel: "Törlés",
            onRight: resetDraft
        )
    }

    private var advancedHeader: some View {
        ScreenHeader(
            title: "Részletes adatok",
            onBack: {
                listPanel = .simple
                panel = .simple
            },
            rightLabel: "Törlés",
            onRight: resetDraft
        )
    }

    private func resetDraft() {
        store.reset()
        photoStore.clear()
        leiras = ""
    }

    /// Kezdőoldal: Képek → Alap / Műszaki / Extrák → Leírás + Feladás.
    private var simpleList: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                accordionBlock(
                    section: .kepek,
                    title: "Képek",
                    summary: photoStore.summary
                ) {
                    photosAccordionBody
                }

                accordionBlock(
                    section: .alap,
                    title: "Alap adatok",
                    summary: alapSummary
                ) {
                    alapAccordionBody
                }

                accordionBlock(
                    section: .muszaki,
                    title: "Műszaki adatok",
                    summary: muszakiSummary
                ) {
                    muszakiAccordionBody
                }

                accordionBlock(
                    section: .extrak,
                    title: "Extrák",
                    summary: extrasValue
                ) {
                    extrakAccordionBody
                }

                leirasAndPostSection
            }
            .padding(16)
        }
        .scrollDismissesKeyboard(.immediately)
    }

    /// Gyors mezők (részletes Alap adatok tetején is) — évjárat / km / ár: sima számmező.
    @ViewBuilder
    private var quickSearchRows: some View {
        SettingsRow(title: "Márka / Modell", value: brandModelRootValue) {
            openSubpanel(.brand)
        }
        Divider().padding(.leading, 16)
        numberFieldRow(title: "Évjárat", placeholder: "pl. 2018", binding: yearTextBinding, focus: .year)
        Divider().padding(.leading, 16)
        numberFieldRow(title: "Futott km", placeholder: "pl. 125 000", binding: kmTextBinding, focus: .km)
        Divider().padding(.leading, 16)
        numberFieldRow(title: "Vételár", placeholder: "pl. 2 500 000", binding: priceTextBinding, focus: .price)
        Divider().padding(.leading, 16)
        SettingsRow(title: "Üzemanyag", value: store.filter.fuelLabel) {
            openSubpanel(.fuel)
        }
    }

    /// Részletes: Képek / Alap / Műszaki / Extrák — egyszerre egy accordion nyitva
    private var advancedList: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                accordionBlock(
                    section: .kepek,
                    title: "Képek",
                    summary: photoStore.summary
                ) {
                    photosAccordionBody
                }

                accordionBlock(
                    section: .alap,
                    title: "Alap adatok",
                    summary: alapSummary
                ) {
                    alapAccordionBody
                }

                accordionBlock(
                    section: .muszaki,
                    title: "Műszaki adatok",
                    summary: muszakiSummary
                ) {
                    muszakiAccordionBody
                }

                accordionBlock(
                    section: .extrak,
                    title: "Extrák",
                    summary: extrasValue
                ) {
                    extrakAccordionBody
                }

                leirasAndPostSection
            }
            .padding(16)
        }
    }

    private var photosAccordionBody: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Max. \(PostAdPhotoRules.maxCount) kép · max. 5 MB · min. \(PostAdPhotoRules.minWidth)×\(PostAdPhotoRules.minHeight) px. Az első a főkép.")
                .font(.caption)
                .foregroundStyle(AppTheme.textSecondary)
                .padding(.horizontal, 16)
                .padding(.top, 10)

            HStack(spacing: 10) {
                Button {
                    guard UIImagePickerController.isSourceTypeAvailable(.camera) else {
                        toast = PostAdPhotoError.cameraUnavailable.errorDescription
                        return
                    }
                    guard photoStore.remainingSlots > 0 else {
                        toast = PostAdPhotoError.tooMany.errorDescription
                        return
                    }
                    showCamera = true
                } label: {
                    Label("Kamera", systemImage: "camera.fill")
                        .font(.subheadline.weight(.semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .foregroundStyle(AppTheme.accent)
                        .background(AppTheme.bg)
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                }
                .buttonStyle(.plain)

                PhotosPicker(
                    selection: $libraryItems,
                    maxSelectionCount: max(photoStore.remainingSlots, 1),
                    matching: .images,
                    photoLibrary: .shared()
                ) {
                    Label("Fotókönyvtár", systemImage: "photo.on.rectangle")
                        .font(.subheadline.weight(.semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .foregroundStyle(AppTheme.accent)
                        .background(AppTheme.bg)
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                }
                .disabled(photoStore.remainingSlots == 0)
            }
            .padding(.horizontal, 16)

            if photoStore.photos.isEmpty {
                Text("Még nincs feltöltött fénykép.")
                    .font(.footnote)
                    .foregroundStyle(AppTheme.textTertiary)
                    .padding(.horizontal, 16)
                    .padding(.bottom, 12)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(Array(photoStore.photos.enumerated()), id: \.element.id) { index, photo in
                            photoThumb(photo, index: index)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 12)
                }
            }
        }
    }

    private func photoThumb(_ photo: PostAdPhoto, index: Int) -> some View {
        VStack(spacing: 6) {
            ZStack(alignment: .topLeading) {
                Image(uiImage: photo.image)
                    .resizable()
                    .scaledToFill()
                    .frame(width: 112, height: 84)
                    .clipped()
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .stroke(index == 0 ? AppTheme.accent : AppTheme.border, lineWidth: index == 0 ? 2 : 1)
                    )

                if index == 0 {
                    Text("Főkép")
                        .font(.caption2.weight(.bold))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 3)
                        .foregroundStyle(.white)
                        .background(AppTheme.accent)
                        .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
                        .padding(6)
                }

                Button {
                    photoStore.remove(id: photo.id)
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .symbolRenderingMode(.palette)
                        .foregroundStyle(.white, .black.opacity(0.55))
                        .font(.title3)
                }
                .buttonStyle(.plain)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
                .padding(4)
            }

            HStack(spacing: 8) {
                Button {
                    photoStore.moveUp(id: photo.id)
                } label: {
                    Image(systemName: "chevron.left")
                        .font(.caption.weight(.semibold))
                }
                .disabled(index == 0)

                if index != 0 {
                    Button("Főkép") {
                        photoStore.makePrimary(id: photo.id)
                    }
                    .font(.caption2.weight(.semibold))
                } else {
                    Text("\(index + 1).")
                        .font(.caption2)
                        .foregroundStyle(AppTheme.textSecondary)
                }

                Button {
                    photoStore.moveDown(id: photo.id)
                } label: {
                    Image(systemName: "chevron.right")
                        .font(.caption.weight(.semibold))
                }
                .disabled(index >= photoStore.photos.count - 1)
            }
            .foregroundStyle(AppTheme.accent)
        }
        .frame(width: 112)
    }

    private func importLibraryItems(_ items: [PhotosPickerItem]) async {
        defer { libraryItems = [] }
        var errors: [String] = []
        for item in items {
            guard photoStore.remainingSlots > 0 else {
                errors.append(PostAdPhotoError.tooMany.errorDescription ?? "")
                break
            }
            do {
                guard let data = try await item.loadTransferable(type: Data.self) else {
                    errors.append(PostAdPhotoError.invalid.errorDescription ?? "")
                    continue
                }
                guard let image = UIImage(data: data) else {
                    errors.append(PostAdPhotoError.invalid.errorDescription ?? "")
                    continue
                }
                try photoStore.addImage(image, sourceByteCount: data.count)
            } catch {
                errors.append((error as? LocalizedError)?.errorDescription ?? error.localizedDescription)
            }
        }
        if let first = errors.first(where: { !$0.isEmpty }) {
            toast = first
        }
    }

    private func accordionBlock<Content: View>(
        section: AccordionSection,
        title: String,
        summary: String,
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
                    if !isOpen, summary != "Mindegy", !summary.isEmpty {
                        Text(summary)
                            .font(.footnote)
                            .foregroundStyle(AppTheme.textSecondary)
                            .lineLimit(1)
                    }
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
                    .padding(.bottom, 8)
            }
        }
        .background(AppTheme.bgElevated)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    /// Részletes Alap adatok: gyors mezők + Hengerűrtartalom + Állapot / …
    private var alapAccordionBody: some View {
        VStack(spacing: 0) {
            quickSearchRows
            Divider().padding(.leading, 16)
            numberFieldRow(title: "Hengerűrtartalom", placeholder: "cm³", binding: hengerTextBinding, focus: .henger)
            Divider().padding(.leading, 16)
            SettingsRow(title: "Állapot", value: allapotValue) {
                openSubpanel(.allapot)
            }
            Divider().padding(.leading, 16)
            SettingsRow(title: "Kivitel", value: kivitelValue) {
                openSubpanel(.kivitel)
            }
            Divider().padding(.leading, 16)
            SettingsRow(title: "Ajtók száma", value: ajtokValue) {
                openSubpanel(.ajtok)
            }
            Divider().padding(.leading, 16)
            SettingsRow(title: "Szállítható személyek", value: szemelyekValue) {
                openSubpanel(.szemelyek)
            }
            Divider().padding(.leading, 16)
            SettingsRow(title: "Okmányok", value: okmanyokValue) {
                openSubpanel(.okmanyok)
            }
            Divider().padding(.leading, 16)
            SettingsRow(title: "Hirdető", value: hirdetoValue) {
                openSubpanel(.hirdeto)
            }
        }
    }

    /// Üzemanyag fent már megvan — itt csak a többi műszaki szűrő.
    private var muszakiAccordionBody: some View {
        VStack(spacing: 0) {
            multiToggleGroup(
                title: "Sebességváltó",
                options: DetailedSearchCatalog.sebessegvaltok,
                keyPath: \.sebessegvaltok
            )
            Divider().padding(.leading, 16)
            Toggle("Felező váltó", isOn: Binding(
                get: { store.filter.felezoValto },
                set: { store.setFelezoValto($0) }
            ))
            .tint(Color.green)
            .padding(.horizontal, 16)
            .frame(minHeight: 48)
            Divider().padding(.leading, 16)
            multiToggleGroup(
                title: "Hajtás",
                options: DetailedSearchCatalog.hajtasok,
                keyPath: \.hajtasok
            )
            Divider().padding(.leading, 16)
            multiToggleGroup(
                title: "Szín",
                options: DetailedSearchCatalog.szinek,
                keyPath: \.szinek
            )
            Divider().padding(.leading, 16)
            Toggle("Metál fényezés", isOn: Binding(
                get: { store.filter.metalfeny },
                set: { store.setMetalfeny($0) }
            ))
            .tint(Color.green)
            .padding(.horizontal, 16)
            .frame(minHeight: 48)
            Divider().padding(.leading, 16)
            multiToggleGroup(
                title: "Töltőcsatlakozó",
                options: DetailedSearchCatalog.toltoCsatlakozok,
                keyPath: \.toltoCsatlakozok
            )
        }
    }

    private var extrakAccordionBody: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionLabel(text: "Klíma")
                .padding(.horizontal, 16)
                .padding(.top, 8)
            ForEach(DetailedSearchCatalog.klimaOptions, id: \.self) { option in
                Toggle(option, isOn: Binding(
                    get: { store.filter.klima == option },
                    set: { on in store.setKlima(on ? option : nil) }
                ))
                .tint(Color.green)
                .padding(.horizontal, 16)
                .frame(minHeight: 44)
            }

            Divider().padding(.leading, 16)

            Toggle("Nem dohányzó autó", isOn: Binding(
                get: { store.filter.nemDohanyzo },
                set: { store.setNemDohanyzo($0) }
            ))
            .tint(Color.green)
            .padding(.horizontal, 16)
            .frame(minHeight: 48)

            Toggle("Hölgy tulajdonostól", isOn: Binding(
                get: { store.filter.holgyTulajdonos },
                set: { store.setHolgyTulajdonos($0) }
            ))
            .tint(Color.green)
            .padding(.horizontal, 16)
            .frame(minHeight: 48)

            ForEach(DetailedSearchCatalog.equipmentSections, id: \.id) { section in
                Divider().padding(.leading, 16)
                SectionLabel(text: section.title)
                    .padding(.horizontal, 16)
                    .padding(.top, 6)
                ForEach(section.items, id: \.self) { item in
                    Toggle(item, isOn: Binding(
                        get: { store.isExtraOn(item) },
                        set: { store.setExtra(item, on: $0) }
                    ))
                    .tint(Color.green)
                    .padding(.horizontal, 16)
                    .frame(minHeight: 44)
                }
            }
        }
    }

    /// Legalul: leírás, alatta Hirdetés feladás.
    private var leirasAndPostSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            VStack(alignment: .leading, spacing: 8) {
                SectionLabel(text: "Leírás")
                TextEditor(text: Binding(
                    get: { leiras },
                    set: { leiras = String($0.prefix(PostAdListingMapper.maxLeirasLength)) }
                ))
                .focused($focusedField, equals: .leiras)
                .frame(minHeight: 120)
                .padding(8)
                .background(AppTheme.bgElevated)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .stroke(AppTheme.border, lineWidth: 1)
                )
                Text("\(leiras.count) / \(PostAdListingMapper.maxLeirasLength)")
                    .font(.caption)
                    .foregroundStyle(AppTheme.textTertiary)
                    .frame(maxWidth: .infinity, alignment: .trailing)
            }

            if !missingAlapFields.isEmpty {
                Text("Az Alap adatok minden mezője kötelező (\(missingAlapFields.count) hiányzik).")
                    .font(.footnote)
                    .foregroundStyle(AppTheme.textSecondary)
            }

            postAdButton
        }
    }

    /// Kötelező Alap adatok — hiánylisták megjelenítéshez / gomb tiltáshoz.
    private var missingAlapFields: [String] {
        var missing: [String] = []
        let f = store.filter
        if f.gyartmanyok.isEmpty { missing.append("Márka") }
        if f.modellek.isEmpty { missing.append("Modell") }
        if f.evTol == nil && f.evIg == nil { missing.append("Évjárat") }
        if f.kmTol == nil && f.kmIg == nil { missing.append("Futott km") }
        if f.arTol == nil && f.arIg == nil { missing.append("Vételár") }
        if f.fuels.isEmpty { missing.append("Üzemanyag") }
        if f.hengerCm3Tol == nil && f.hengerCm3Ig == nil { missing.append("Hengerűrtartalom") }
        if f.allapotok.isEmpty { missing.append("Állapot") }
        if f.kiviteles.isEmpty { missing.append("Kivitel") }
        if f.ajtok.isEmpty { missing.append("Ajtók száma") }
        if f.szemelyek.isEmpty { missing.append("Szállítható személyek") }
        if f.okmanyErvenyesseg.isEmpty { missing.append("Okmányok") }
        if f.hirdetok.isEmpty { missing.append("Hirdető") }
        return missing
    }

    private var canSubmitListing: Bool {
        missingAlapFields.isEmpty
    }

    private var postAdButton: some View {
        Button {
            Task { await submitListing() }
        } label: {
            HStack {
                if posting { ProgressView().tint(.white) }
                Text(posting ? "Mentés…" : "Hirdetés feladás")
                    .font(.body.weight(.semibold))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .foregroundStyle(.white)
            .background(
                (!canSubmitListing || posting)
                    ? AppTheme.accent.opacity(0.45)
                    : AppTheme.accent
            )
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
        .buttonStyle(.plain)
        .disabled(posting || !canSubmitListing)
    }

    private func submitListing() async {
        guard !posting else { return }
        let missing = missingAlapFields
        if !missing.isEmpty {
            openAccordion = .alap
            toast = "Kötelező Alap adatok: \(missing.joined(separator: ", "))."
            return
        }
        posting = true
        defer { posting = false }
        let form = PostAdListingMapper.formData(from: store.filter, leiras: leiras)
        let photos = photoStore.base64Payloads()
        do {
            let id = try await ListingsAPI.saveListing(form: form, status: "feladott", photos: photos)
            toast = "Hirdetés feladva (#\(id)). Megjelenik a Kiemeltek között és kereshető."
            store.reset()
            photoStore.clear()
            leiras = ""
            openAccordion = .kepek
        } catch {
            toast = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    private func multiToggleGroup(
        title: String,
        options: [String],
        keyPath: WritableKeyPath<SearchFilter, [String]>
    ) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption.weight(.semibold))
                .foregroundStyle(AppTheme.textSecondary)
                .padding(.horizontal, 16)
                .padding(.top, 10)
            ForEach(options, id: \.self) { option in
                Toggle(option, isOn: Binding(
                    get: { store.isMultiOn(keyPath, value: option) },
                    set: { store.toggleMulti(keyPath, value: option, on: $0) }
                ))
                .tint(Color.green)
                .padding(.horizontal, 16)
                .frame(minHeight: 44)
            }
        }
    }

    private var alapSummary: String {
        var n = 0
        if !store.filter.gyartmanyok.isEmpty { n += 1 }
        if store.filter.evTol != nil || store.filter.evIg != nil { n += 1 }
        if store.filter.kmTol != nil || store.filter.kmIg != nil { n += 1 }
        if store.filter.arTol != nil || store.filter.arIg != nil { n += 1 }
        if !store.filter.fuels.isEmpty { n += 1 }
        if store.filter.hengerCm3Tol != nil || store.filter.hengerCm3Ig != nil { n += 1 }
        n += store.filter.allapotok.isEmpty ? 0 : 1
        n += store.filter.kiviteles.isEmpty ? 0 : 1
        n += store.filter.ajtok.isEmpty ? 0 : 1
        n += store.filter.szemelyek.isEmpty ? 0 : 1
        n += store.filter.okmanyErvenyesseg.isEmpty ? 0 : 1
        n += store.filter.hirdetok.isEmpty ? 0 : 1
        return n == 0 ? "Mindegy" : "\(n) feltétel"
    }

    private var muszakiSummary: String {
        var n = 0
        n += store.filter.sebessegvaltok.isEmpty ? 0 : 1
        if store.filter.felezoValto { n += 1 }
        n += store.filter.hajtasok.isEmpty ? 0 : 1
        n += store.filter.szinek.isEmpty ? 0 : 1
        if store.filter.metalfeny { n += 1 }
        n += store.filter.toltoCsatlakozok.isEmpty ? 0 : 1
        return n == 0 ? "Mindegy" : "\(n) feltétel"
    }





    private func dismissKeyboard() {
        focusedField = nil
        UIApplication.shared.sendAction(
            #selector(UIResponder.resignFirstResponder),
            to: nil,
            from: nil,
            for: nil
        )
    }

    private func openSubpanel(_ next: Panel) {
        dismissKeyboard()
        panel = next
    }

    private func goList() {
        dismissKeyboard()
        brandQuery = ""
        panel = listPanel
    }

    /// Márka / modell Kész → fő feladás oldal, Alap adatok nyitva.
    private func finishBrandModelSelection() {
        dismissKeyboard()
        brandQuery = ""
        openAccordion = .alap
        panel = listPanel
    }

    private var brandSearchField: some View {
        TextField("Keresés…", text: $brandQuery)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
            .focused($focusedField, equals: .brandSearch)
            .padding(12)
            .background(AppTheme.bgElevated)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .padding(.horizontal, 16)
            .padding(.bottom, 8)
    }

    private var filteredBrands: [String] {
        let q = brandQuery.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if q.isEmpty { return Catalog.brandNames }
        return Catalog.brandNames.filter { $0.lowercased().contains(q) }
    }

    private var brandList: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 8) {
                SectionLabel(text: "Kapcsolók — több márka is")
                Button {
                    store.clearBrands()
                } label: {
                    Text("Összes kikapcsolása")
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(AppTheme.accent)
                        .padding(.leading, 4)
                }
                .buttonStyle(.plain)

                SettingsGroup {
                    ForEach(Array(filteredBrands.enumerated()), id: \.element) { index, brand in
                        if index > 0 { Divider().padding(.leading, 16) }
                        Toggle(brand, isOn: Binding(
                            get: { store.isBrandOn(brand) },
                            set: { store.setBrand(brand, on: $0) }
                        ))
                        .tint(Color.green)
                        .padding(.horizontal, 16)
                        .frame(minHeight: 52)

                        if store.isBrandOn(brand) {
                            Divider().padding(.leading, 32)
                            SettingsRow(
                                title: "\(brand) modell választása",
                                value: store.modelLabel(for: brand)
                            ) {
                                panel = .model(brand)
                            }
                            .padding(.leading, 16)
                        }
                    }
                }
            }
            .padding(16)
        }
    }

    private var allapotList: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 8) {
                SectionLabel(text: "Csak egy választható")
                if !store.filter.allapotok.isEmpty {
                    Button {
                        store.clearMulti(\.allapotok)
                    } label: {
                        Text("Kiválasztás törlése")
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(AppTheme.accent)
                            .padding(.leading, 4)
                    }
                    .buttonStyle(.plain)
                }

                SettingsGroup {
                    ForEach(Array(DetailedSearchCatalog.allapotok.enumerated()), id: \.element) { index, option in
                        if index > 0 { Divider().padding(.leading, 16) }
                        Toggle(option, isOn: Binding(
                            get: { store.isMultiOn(\.allapotok, value: option) },
                            set: { on in
                                if on {
                                    store.clearMulti(\.allapotok)
                                    store.toggleMulti(\.allapotok, value: option, on: true)
                                } else {
                                    store.toggleMulti(\.allapotok, value: option, on: false)
                                }
                            }
                        ))
                        .tint(Color.green)
                        .padding(.horizontal, 16)
                        .frame(minHeight: 52)
                    }
                }
            }
            .padding(16)
        }
    }

    /// Feladás: egy választás (kivitel, ajtók, személyek, okmányok, hirdető).
    private func singleSelectList(
        sectionTitle: String,
        options: [String],
        keyPath: WritableKeyPath<SearchFilter, [String]>
    ) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 8) {
                SectionLabel(text: "Csak egy választható")
                if !store.filter[keyPath: keyPath].isEmpty {
                    Button {
                        store.clearMulti(keyPath)
                    } label: {
                        Text("Kiválasztás törlése")
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(AppTheme.accent)
                            .padding(.leading, 4)
                    }
                    .buttonStyle(.plain)
                }

                SettingsGroup {
                    ForEach(Array(options.enumerated()), id: \.element) { index, option in
                        if index > 0 { Divider().padding(.leading, 16) }
                        Toggle(option, isOn: Binding(
                            get: { store.isMultiOn(keyPath, value: option) },
                            set: { on in
                                if on {
                                    store.clearMulti(keyPath)
                                    store.toggleMulti(keyPath, value: option, on: true)
                                } else {
                                    store.toggleMulti(keyPath, value: option, on: false)
                                }
                            }
                        ))
                        .tint(Color.green)
                        .padding(.horizontal, 16)
                        .frame(minHeight: 52)
                    }
                }
            }
            .padding(16)
        }
    }

    private func modelList(for brand: String) -> some View {
        let models = Catalog.brands[brand] ?? []
        return ScrollView {
            VStack(alignment: .leading, spacing: 8) {
                SectionLabel(text: "Kapcsolók — több modell is")
                Button {
                    store.clearModels(for: brand)
                } label: {
                    Text("Összes kikapcsolása")
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(AppTheme.accent)
                        .padding(.leading, 4)
                }
                .buttonStyle(.plain)

                if models.isEmpty {
                    Text("Nincs modell ehhez a márkához.")
                        .foregroundStyle(AppTheme.textSecondary)
                        .padding(.top, 24)
                        .frame(maxWidth: .infinity)
                } else {
                    SettingsGroup {
                        ForEach(Array(models.enumerated()), id: \.element) { index, model in
                            if index > 0 { Divider().padding(.leading, 16) }
                            Toggle(model, isOn: Binding(
                                get: { store.isModelOn(model) },
                                set: { store.setModel(model, on: $0) }
                            ))
                            .tint(Color.green)
                            .padding(.horizontal, 16)
                            .frame(minHeight: 52)
                        }
                    }
                }
            }
            .padding(16)
        }
    }

    private var brandModelRootValue: String {
        let brands = store.filter.gyartmanyok
        let models = store.filter.modellek
        if brands.isEmpty { return "Mindegy" }
        if models.isEmpty { return store.filter.brandLabel }
        return "\(store.filter.brandLabel) · \(store.filter.modelLabel)"
    }

    private var allapotValue: String {
        let list = store.filter.allapotok
        if list.isEmpty { return "Mindegy" }
        if list.count == 1 { return list[0] }
        if list.count <= 3 { return list.joined(separator: ", ") }
        return "\(list.count) állapot"
    }

    private var kivitelValue: String {
        multiSelectValue(store.filter.kiviteles, singular: "kivitel")
    }

    private var ajtokValue: String {
        multiSelectValue(store.filter.ajtok, singular: "ajtószám")
    }

    private var szemelyekValue: String {
        multiSelectValue(store.filter.szemelyek, singular: "létszám")
    }

    private var okmanyokValue: String {
        multiSelectValue(store.filter.okmanyErvenyesseg, singular: "okmány")
    }

    private var hirdetoValue: String {
        multiSelectValue(store.filter.hirdetok, singular: "hirdető")
    }

    private func multiSelectValue(_ list: [String], singular: String) -> String {
        if list.isEmpty { return "Mindegy" }
        if list.count == 1 { return list[0] }
        if list.count <= 3 { return list.joined(separator: ", ") }
        return "\(list.count) \(singular)"
    }

    private var fuelList: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 8) {
                SectionLabel(text: "Csak egy választható")
                if !store.filter.fuels.isEmpty {
                    Button {
                        store.clearFuels()
                    } label: {
                        Text("Kiválasztás törlése")
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(AppTheme.accent)
                            .padding(.leading, 4)
                    }
                    .buttonStyle(.plain)
                }

                SettingsGroup {
                    ForEach(Array(FuelType.allCases.enumerated()), id: \.element.id) { index, fuel in
                        if index > 0 { Divider().padding(.leading, 16) }
                        Toggle(fuel.label, isOn: Binding(
                            get: { store.isFuelOn(fuel) },
                            set: { on in
                                if on {
                                    store.clearFuels()
                                    store.setFuel(fuel, on: true)
                                } else {
                                    store.setFuel(fuel, on: false)
                                }
                            }
                        ))
                        .tint(Color.green)
                        .padding(.horizontal, 16)
                        .frame(minHeight: 52)
                    }
                }
            }
            .padding(16)
        }
    }

    private var extrasValue: String {
        let n = store.filter.activeExtrasCount
        return n > 0 ? "\(n) bekapcsolva" : "Mindegy"
    }

    // MARK: - Egyértékű számmezők (feladás)

    private func numberFieldRow(
        title: String,
        placeholder: String,
        binding: Binding<String>,
        focus: FormFocus
    ) -> some View {
        HStack(spacing: 12) {
            Text(title)
                .foregroundStyle(AppTheme.text)
                .font(.body)
            TextField(placeholder, text: binding)
                .keyboardType(.numberPad)
                .focused($focusedField, equals: focus)
                .multilineTextAlignment(.trailing)
                .foregroundStyle(AppTheme.textSecondary)
        }
        .padding(.horizontal, 16)
        .frame(minHeight: 52)
    }

    /// Egy érték mindkét filter mezőbe (a mapper `tol ?? ig`-et olvas).
    /// `grouped`: ezres elválasztó szóközzel (pl. 22 366 500) — pont/vessző nélkül.
    private func singleIntBinding(
        get: @escaping () -> Int?,
        set: @escaping (Int?) -> Void,
        grouped: Bool = false
    ) -> Binding<String> {
        Binding(
            get: {
                guard let value = get() else { return "" }
                return grouped ? Self.formatGrouped(value) : String(value)
            },
            set: { raw in
                let digits = raw.filter(\.isNumber)
                if digits.isEmpty {
                    set(nil)
                } else {
                    set(Int(digits))
                }
            }
        )
    }

    /// Jobbról hármasával szóköz: 22366500 → "22 366 500"
    private static func formatGrouped(_ value: Int) -> String {
        let digits = String(value)
        var parts: [String] = []
        var i = digits.endIndex
        while i > digits.startIndex {
            let start = digits.index(i, offsetBy: -3, limitedBy: digits.startIndex) ?? digits.startIndex
            parts.insert(String(digits[start..<i]), at: 0)
            i = start
        }
        return parts.joined(separator: " ")
    }

    private var yearTextBinding: Binding<String> {
        singleIntBinding(
            get: { store.filter.evTol ?? store.filter.evIg },
            set: { store.setYear(tol: $0, ig: $0) }
        )
    }

    private var kmTextBinding: Binding<String> {
        singleIntBinding(
            get: { store.filter.kmTol ?? store.filter.kmIg },
            set: { store.setKm(tol: $0, ig: $0) },
            grouped: true
        )
    }

    private var priceTextBinding: Binding<String> {
        singleIntBinding(
            get: { store.filter.arTol ?? store.filter.arIg },
            set: { store.setPrice(tol: $0, ig: $0) },
            grouped: true
        )
    }

    private var hengerTextBinding: Binding<String> {
        singleIntBinding(
            get: { store.filter.hengerCm3Tol ?? store.filter.hengerCm3Ig },
            set: { store.setHengerCm3(tol: $0, ig: $0) },
            grouped: true
        )
    }
}
