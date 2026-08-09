import SwiftUI

struct SearchScreen: View {
    @EnvironmentObject private var store: SearchStore
    /// Beállítások — auth-guard mint a weben
    var onOpenSettings: (() -> Void)? = nil

    @State private var mode: Mode = .landing
    @State private var panel: Panel = .simple
    @State private var listPanel: Panel = .simple
    @State private var openAccordion: AccordionSection? = nil
    @State private var brandQuery = ""
    @State private var toast: String?
    @State private var activeQuery: ListingQuery?
    @State private var messageTarget: ListingMessageTarget?
    @State private var messagesReturn: Mode = .landing

    private enum Mode {
        case landing, search, settings, messages, results, filterResults
    }

    private enum Panel {
        case simple, advanced, brand, model(String), fuel, price, year, km, allapot
    }

    private enum AccordionSection: String {
        case alap, muszaki, extrak
    }

    var body: some View {
        Group {
            switch mode {
            case .landing:
                searchLanding
            case .search:
                filterStack
            case .settings:
                SettingsScreen(onClose: {
                    if activeQuery != nil {
                        mode = .results
                    } else {
                        mode = .landing
                    }
                })
            case .messages:
                if let messageTarget {
                    // Hirdetés → Üzenet: egyből a chat, nem az inbox
                    StartChatScreen(
                        target: messageTarget,
                        onClose: {
                            self.messageTarget = nil
                            mode = messagesReturn
                        }
                    )
                } else {
                    MessagesScreen(
                        onClose: {
                            mode = messagesReturn
                        }
                    )
                }
            case .results:
                if let query = activeQuery {
                    CategoryResultsScreen(
                        query: query,
                        onBack: {
                            activeQuery = nil
                            mode = .landing
                        },
                        onOpenSettings: {
                            if let onOpenSettings {
                                onOpenSettings()
                            } else {
                                mode = .settings
                            }
                        }
                    )
                } else {
                    searchLanding
                }
            case .filterResults:
                FilterResultsScreen(
                    onBack: {
                        mode = .search
                        panel = listPanel
                    }
                )
            }
        }
        .alert("Mentés", isPresented: Binding(
            get: { toast != nil },
            set: { if !$0 { toast = nil } }
        )) {
            Button("OK", role: .cancel) { toast = nil }
        } message: {
            Text(toast ?? "")
        }
    }

    /// Felső sor: Keresés, Közelben, Új hirdetések → autóikonok → legalul Beállítások
    private var searchLanding: some View {
        ScrollView {
            VStack(spacing: 0) {
                HStack(spacing: 20) {
                    HomeIconButton(
                        systemName: "magnifyingglass",
                        label: "Keresés",
                        tint: AppTheme.accent
                    ) {
                        listPanel = .simple
                        panel = .simple
                        mode = .search
                    }
                    HomeIconButton(
                        systemName: "mappin.and.ellipse",
                        label: "Közelben",
                        tint: Color(red: 0.18, green: 0.55, blue: 0.34)
                    ) {
                        openListing(.nearby)
                    }
                    HomeIconButton(
                        systemName: "sparkles",
                        label: "Új hirdetések",
                        tint: Color(red: 0.85, green: 0.45, blue: 0.12)
                    ) {
                        openListing(.newListings)
                    }
                }
                .padding(.top, 12)
                .padding(.bottom, 22)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 14) {
                        ForEach(QuickCategory.allCases) { category in
                            CategoryIconButton(category: category) {
                                openListing(.category(category))
                            }
                        }
                    }
                    .padding(.horizontal, 16)
                }
                .padding(.bottom, 28)

                HStack(spacing: 20) {
                    HomeIconButton(
                        systemName: "bubble.left.and.bubble.right.fill",
                        label: "Üzenetek",
                        tint: Color(red: 0.20, green: 0.55, blue: 0.85)
                    ) {
                        openMessages(from: .landing, target: nil)
                    }
                    HomeIconButton(
                        systemName: "gearshape.fill",
                        label: "Beállítások",
                        tint: Color(red: 0.55, green: 0.58, blue: 0.62)
                    ) {
                        if let onOpenSettings {
                            onOpenSettings()
                        } else {
                            mode = .settings
                        }
                    }
                }
                .padding(.bottom, 24)
            }
            .frame(maxWidth: .infinity)
        }
        .background(Color.white.ignoresSafeArea())
    }

    private var filterStack: some View {
        VStack(spacing: 0) {
            switch panel {
            case .simple:
                simpleHeader
                simpleList
            case .advanced:
                advancedHeader
                advancedList
            case .brand:
                ScreenHeader(title: "Márka", onBack: goList, rightLabel: "Kész", onRight: goList)
                brandSearchField
                brandList
            case .model(let brand):
                ScreenHeader(
                    title: brand,
                    subtitle: "Modell — több is bekapcsolható",
                    onBack: { panel = .brand },
                    rightLabel: "Kész",
                    onRight: { panel = .brand }
                )
                modelList(for: brand)
            case .fuel:
                ScreenHeader(title: "Üzemanyag", onBack: goList, rightLabel: "Kész", onRight: goList)
                fuelList
            case .price:
                ScreenHeader(title: "Ár", onBack: goList, rightLabel: "Kész", onRight: goList)
                priceWheels
            case .year:
                ScreenHeader(title: "Évjárat", onBack: goList, rightLabel: "Kész", onRight: goList)
                yearWheels
            case .km:
                ScreenHeader(title: "Futott km", onBack: goList, rightLabel: "Kész", onRight: goList)
                kmWheels
            case .allapot:
                ScreenHeader(title: "Állapot", onBack: goList, rightLabel: "Kész", onRight: goList)
                allapotList
            }
        }
        .background(AppTheme.bgGrouped)
    }

    private var simpleHeader: some View {
        ScreenHeader(
            title: "Keresés",
            onBack: {
                panel = .simple
                listPanel = .simple
                mode = .landing
            },
            rightLabel: "Törlés",
            onRight: store.reset
        )
    }

    private var advancedHeader: some View {
        ScreenHeader(
            title: "Részletes keresés",
            onBack: {
                listPanel = .simple
                panel = .simple
            },
            rightLabel: "Törlés",
            onRight: store.reset
        )
    }

    /// Egyszerű: Márka/modell, évjárat, km, ár, üzemanyag
    private var simpleList: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                SettingsGroup {
                    SettingsRow(title: "Márka / Modell", value: brandModelRootValue) {
                        openSubpanel(.brand)
                    }
                    Divider().padding(.leading, 16)
                    SettingsRow(title: "Évjárat", value: yearValue) {
                        openSubpanel(.year)
                    }
                    Divider().padding(.leading, 16)
                    SettingsRow(title: "Futott km", value: kmValue) {
                        openSubpanel(.km)
                    }
                    Divider().padding(.leading, 16)
                    SettingsRow(title: "Ár", value: priceValue) {
                        openSubpanel(.price)
                    }
                    Divider().padding(.leading, 16)
                    SettingsRow(title: "Üzemanyag", value: store.filter.fuelLabel) {
                        openSubpanel(.fuel)
                    }
                }

                Button {
                    openAccordion = nil
                    listPanel = .advanced
                    panel = .advanced
                } label: {
                    HStack {
                        Text("Részletes keresés")
                            .font(.body.weight(.semibold))
                            .foregroundStyle(AppTheme.accent)
                        Spacer()
                        Text("›")
                            .font(.title2)
                            .foregroundStyle(AppTheme.textTertiary)
                    }
                    .padding(.horizontal, 16)
                    .frame(minHeight: 52)
                    .background(AppTheme.bgElevated)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .buttonStyle(.plain)

                activeFilterCard
                searchResultsButton
                saveButton
            }
            .padding(16)
        }
    }

    /// Részletes: Alap / Műszaki / Extrák — egyszerre egy accordion nyitva
    private var advancedList: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
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

                activeFilterCard
                searchResultsButton
                saveButton
            }
            .padding(16)
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

    private var alapAccordionBody: some View {
        VStack(spacing: 0) {
            SettingsRow(title: "Márka / Modell", value: brandModelRootValue) {
                openSubpanel(.brand)
            }
            Divider().padding(.leading, 16)
            SettingsRow(title: "Évjárat", value: yearValue) {
                openSubpanel(.year)
            }
            Divider().padding(.leading, 16)
            SettingsRow(title: "Futott km", value: kmValue) {
                openSubpanel(.km)
            }
            Divider().padding(.leading, 16)
            SettingsRow(title: "Állapot", value: allapotValue) {
                openSubpanel(.allapot)
            }
            Divider().padding(.leading, 16)
            multiToggleGroup(
                title: "Kivitel",
                options: DetailedSearchCatalog.kiviteles,
                keyPath: \.kiviteles
            )
            Divider().padding(.leading, 16)
            multiToggleGroup(
                title: "Ajtók száma",
                options: DetailedSearchCatalog.ajtok,
                keyPath: \.ajtok
            )
            Divider().padding(.leading, 16)
            multiToggleGroup(
                title: "Szállítható személyek",
                options: DetailedSearchCatalog.szemelyek,
                keyPath: \.szemelyek
            )
            Divider().padding(.leading, 16)
            multiToggleGroup(
                title: "Okmányok jellege",
                options: DetailedSearchCatalog.okmanyJellegek,
                keyPath: \.okmanyJellegek
            )
            Divider().padding(.leading, 16)
            multiToggleGroup(
                title: "Okmányok érvényessége",
                options: DetailedSearchCatalog.okmanyErvenyesseg,
                keyPath: \.okmanyErvenyesseg
            )
        }
    }

    private var muszakiAccordionBody: some View {
        VStack(spacing: 0) {
            SettingsRow(title: "Üzemanyag", value: store.filter.fuelLabel) {
                openSubpanel(.fuel)
            }
            Divider().padding(.leading, 16)
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
        n += store.filter.allapotok.isEmpty ? 0 : 1
        n += store.filter.kiviteles.isEmpty ? 0 : 1
        n += store.filter.ajtok.isEmpty ? 0 : 1
        n += store.filter.szemelyek.isEmpty ? 0 : 1
        n += store.filter.okmanyJellegek.isEmpty ? 0 : 1
        n += store.filter.okmanyErvenyesseg.isEmpty ? 0 : 1
        return n == 0 ? "Mindegy" : "\(n) feltétel"
    }

    private var muszakiSummary: String {
        var n = 0
        if !store.filter.fuels.isEmpty { n += 1 }
        n += store.filter.sebessegvaltok.isEmpty ? 0 : 1
        if store.filter.felezoValto { n += 1 }
        n += store.filter.hajtasok.isEmpty ? 0 : 1
        n += store.filter.szinek.isEmpty ? 0 : 1
        if store.filter.metalfeny { n += 1 }
        n += store.filter.toltoCsatlakozok.isEmpty ? 0 : 1
        return n == 0 ? "Mindegy" : "\(n) feltétel"
    }

    private var activeFilterCard: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("AKTÍV SZŰRŐ")
                .font(.caption.weight(.semibold))
                .foregroundStyle(AppTheme.textSecondary)
            Text(store.filter.summary)
                .font(.body)
                .foregroundStyle(AppTheme.text)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(AppTheme.bgElevated)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private var hitCount: Int {
        DemoListing.filtered(for: store.filter).count
    }

    private var searchResultsButton: some View {
        Button {
            mode = .filterResults
        } label: {
            Text("Keresés · \(hitCount)+ találat")
                .font(.body.weight(.semibold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .foregroundStyle(.white)
                .background(AppTheme.accent)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
    }

    private var saveButton: some View {
        Button {
            if let saved = store.saveCurrent() {
                toast = "Ikon a 4. oldalon: \(saved.icon) \(saved.name)"
            } else {
                toast = "Előbb állíts be legalább egy feltételt."
            }
        } label: {
            Text("Mentés ikonra (4. oldal)")
                .font(.body.weight(.semibold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .foregroundStyle(.white)
                .background(AppTheme.accent)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
    }

    private func openSubpanel(_ next: Panel) {
        panel = next
    }

    private func goList() {
        brandQuery = ""
        panel = listPanel
    }

    private var brandSearchField: some View {
        TextField("Keresés…", text: $brandQuery)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
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
                SectionLabel(text: "Kapcsolók — több is")
                Button {
                    store.clearMulti(\.allapotok)
                } label: {
                    Text("Összes kikapcsolása")
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(AppTheme.accent)
                        .padding(.leading, 4)
                }
                .buttonStyle(.plain)

                SettingsGroup {
                    ForEach(Array(DetailedSearchCatalog.allapotok.enumerated()), id: \.element) { index, option in
                        if index > 0 { Divider().padding(.leading, 16) }
                        Toggle(option, isOn: Binding(
                            get: { store.isMultiOn(\.allapotok, value: option) },
                            set: { store.toggleMulti(\.allapotok, value: option, on: $0) }
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

    private var fuelList: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 8) {
                SectionLabel(text: "Kapcsolók — több is")
                Button {
                    store.clearFuels()
                } label: {
                    Text("Összes kikapcsolása")
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(AppTheme.accent)
                        .padding(.leading, 4)
                }
                .buttonStyle(.plain)

                SettingsGroup {
                    ForEach(Array(FuelType.allCases.enumerated()), id: \.element.id) { index, fuel in
                        if index > 0 { Divider().padding(.leading, 16) }
                        Toggle(fuel.label, isOn: Binding(
                            get: { store.isFuelOn(fuel) },
                            set: { store.setFuel(fuel, on: $0) }
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

    /// Minimum + Maximum — mindkettő görgethető lista, 500 000 Ft lépésköz.
    private var priceWheels: some View {
        VStack(spacing: 0) {
            Text("Lépésköz: 500 000 Ft")
                .font(.caption.weight(.semibold))
                .foregroundStyle(AppTheme.textSecondary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 20)
                .padding(.top, 8)

            HStack(alignment: .top, spacing: 0) {
                priceWheelColumn(
                    title: "Minimum",
                    selection: Binding(
                        get: { store.filter.arTol ?? -1 },
                        set: { store.setPriceMin($0 < 0 ? nil : $0) }
                    )
                )
                Divider()
                priceWheelColumn(
                    title: "Maximum",
                    selection: Binding(
                        get: { store.filter.arIg ?? -1 },
                        set: { store.setPriceMax($0 < 0 ? nil : $0) }
                    )
                )
            }
            .frame(maxHeight: .infinity)

            Button {
                store.setPrice(tol: nil, ig: nil)
            } label: {
                Text("Ár szűrő törlése")
                    .font(.body.weight(.medium))
                    .foregroundStyle(AppTheme.accent)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
            }
            .buttonStyle(.plain)
        }
        .background(AppTheme.bgGrouped)
    }

    private func priceWheelColumn(title: String, selection: Binding<Int>) -> some View {
        VStack(spacing: 4) {
            Text(title)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(AppTheme.text)
                .padding(.top, 8)
            Picker(title, selection: selection) {
                Text("Mindegy").tag(-1)
                ForEach(Catalog.priceSteps, id: \.self) { value in
                    Text(Catalog.priceStepLabel(value)).tag(value)
                }
            }
            .pickerStyle(.wheel)
            .labelsHidden()
        }
        .frame(maxWidth: .infinity)
    }

    private var yearWheels: some View {
        VStack(spacing: 0) {
            Text("Évjárat — tól / ig")
                .font(.caption.weight(.semibold))
                .foregroundStyle(AppTheme.textSecondary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 20)
                .padding(.top, 8)

            HStack(alignment: .top, spacing: 0) {
                yearWheelColumn(
                    title: "Tól",
                    selection: Binding(
                        get: { store.filter.evTol ?? -1 },
                        set: { store.setYearMin($0 < 0 ? nil : $0) }
                    )
                )
                Divider()
                yearWheelColumn(
                    title: "Ig",
                    selection: Binding(
                        get: { store.filter.evIg ?? -1 },
                        set: { store.setYearMax($0 < 0 ? nil : $0) }
                    )
                )
            }
            .frame(maxHeight: .infinity)

            Button {
                store.setYear(tol: nil, ig: nil)
            } label: {
                Text("Évjárat szűrő törlése")
                    .font(.body.weight(.medium))
                    .foregroundStyle(AppTheme.accent)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
            }
            .buttonStyle(.plain)
        }
        .background(AppTheme.bgGrouped)
    }

    private func yearWheelColumn(title: String, selection: Binding<Int>) -> some View {
        VStack(spacing: 4) {
            Text(title)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(AppTheme.text)
                .padding(.top, 8)
            Picker(title, selection: selection) {
                Text("Mindegy").tag(-1)
                ForEach(Catalog.yearSteps, id: \.self) { year in
                    Text(String(year)).tag(year)
                }
            }
            .pickerStyle(.wheel)
            .labelsHidden()
        }
        .frame(maxWidth: .infinity)
    }

    private var kmWheels: some View {
        VStack(spacing: 0) {
            Text("Lépésköz: 10 000 km")
                .font(.caption.weight(.semibold))
                .foregroundStyle(AppTheme.textSecondary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 20)
                .padding(.top, 8)

            HStack(alignment: .top, spacing: 0) {
                kmWheelColumn(
                    title: "Tól",
                    selection: Binding(
                        get: { store.filter.kmTol ?? -1 },
                        set: { store.setKmMin($0 < 0 ? nil : $0) }
                    )
                )
                Divider()
                kmWheelColumn(
                    title: "Ig",
                    selection: Binding(
                        get: { store.filter.kmIg ?? -1 },
                        set: { store.setKmMax($0 < 0 ? nil : $0) }
                    )
                )
            }
            .frame(maxHeight: .infinity)

            Button {
                store.setKm(tol: nil, ig: nil)
            } label: {
                Text("Km szűrő törlése")
                    .font(.body.weight(.medium))
                    .foregroundStyle(AppTheme.accent)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
            }
            .buttonStyle(.plain)
        }
        .background(AppTheme.bgGrouped)
    }

    private func kmWheelColumn(title: String, selection: Binding<Int>) -> some View {
        VStack(spacing: 4) {
            Text(title)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(AppTheme.text)
                .padding(.top, 8)
            Picker(title, selection: selection) {
                Text("Mindegy").tag(-1)
                ForEach(Catalog.kmSteps, id: \.self) { value in
                    Text(Catalog.kmStepLabel(value)).tag(value)
                }
            }
            .pickerStyle(.wheel)
            .labelsHidden()
        }
        .frame(maxWidth: .infinity)
    }

    private func openListing(_ query: ListingQuery) {
        store.applyListingQuery(query)
        activeQuery = query
        mode = .results
    }

    private func openMessages(from returnMode: Mode, target: ListingMessageTarget?) {
        messagesReturn = returnMode
        messageTarget = target
        mode = .messages
    }

    private var priceValue: String {
        if store.filter.arTol == nil && store.filter.arIg == nil { return "Mindegy" }
        if let tol = store.filter.arTol, let ig = store.filter.arIg {
            return "\(SearchFilter.formatPrice(tol)) – \(SearchFilter.formatPrice(ig))"
        }
        if let ig = store.filter.arIg { return "– \(SearchFilter.formatPrice(ig))" }
        return "\(SearchFilter.formatPrice(store.filter.arTol!)) –"
    }

    private var yearValue: String {
        if store.filter.evTol == nil && store.filter.evIg == nil { return "Mindegy" }
        if let tol = store.filter.evTol, let ig = store.filter.evIg { return "\(tol) – \(ig)" }
        if let tol = store.filter.evTol { return "\(tol) –" }
        return "– \(store.filter.evIg!)"
    }

    private var kmValue: String {
        if store.filter.kmTol == nil && store.filter.kmIg == nil { return "Mindegy" }
        if let ig = store.filter.kmIg, store.filter.kmTol == nil {
            return "– \(ig.formatted()) km"
        }
        if let tol = store.filter.kmTol, store.filter.kmIg == nil {
            return "\(tol.formatted()) km –"
        }
        return "\(store.filter.kmTol!.formatted()) – \(store.filter.kmIg!.formatted())"
    }

    private var extrasValue: String {
        let n = store.filter.activeExtrasCount
        return n > 0 ? "\(n) bekapcsolva" : "Mindegy"
    }
}
