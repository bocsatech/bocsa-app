import SwiftUI

struct SearchScreen: View {
    @EnvironmentObject private var store: SearchStore
    @State private var mode: Mode = .landing
    @State private var panel: Panel = .root
    @State private var brandQuery = ""
    @State private var toast: String?

    private enum Mode {
        case landing, search, settings
    }

    private enum Panel {
        case root, brand, model, fuel, price, year, km, extras
    }

    var body: some View {
        Group {
            switch mode {
            case .landing:
                searchLanding
            case .search:
                filterStack
            case .settings:
                SettingsScreen(onClose: { mode = .landing })
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

    /// Fehér oldal — kis iOS-méretű ikonok (nagyító + fogaskerék).
    private var searchLanding: some View {
        ZStack {
            Color.white.ignoresSafeArea()
            HStack(spacing: 28) {
                HomeIconButton(
                    systemName: "magnifyingglass",
                    label: "Keresés",
                    tint: AppTheme.accent
                ) {
                    panel = .root
                    mode = .search
                }
                HomeIconButton(
                    systemName: "gearshape.fill",
                    label: "Beállítások",
                    tint: Color(red: 0.55, green: 0.58, blue: 0.62)
                ) {
                    mode = .settings
                }
            }
        }
    }

    private var filterStack: some View {
        VStack(spacing: 0) {
            switch panel {
            case .root:
                rootHeader
                rootList
            case .brand:
                ScreenHeader(title: "Márka", onBack: goRoot, rightLabel: "Kész", onRight: goRoot)
                brandSearchField
                brandList
            case .model:
                ScreenHeader(
                    title: "Modell",
                    subtitle: store.filter.gyartmanyok.isEmpty ? "Válassz márkát" : store.filter.brandLabel,
                    onBack: goRoot
                )
                modelList
            case .fuel:
                ScreenHeader(title: "Üzemanyag", onBack: goRoot, rightLabel: "Kész", onRight: goRoot)
                fuelList
            case .price:
                ScreenHeader(title: "Ár", onBack: goRoot, rightLabel: "Kész", onRight: goRoot)
                priceWheels
            case .year:
                ScreenHeader(title: "Évjárat", onBack: goRoot)
                yearList
            case .km:
                ScreenHeader(title: "Futott km", onBack: goRoot)
                kmList
            case .extras:
                ScreenHeader(title: "Extrák", onBack: goRoot, rightLabel: "Kész", onRight: goRoot)
                extrasList
            }
        }
        .background(AppTheme.bgGrouped)
    }

    private var rootHeader: some View {
        ScreenHeader(
            title: "Keresés",
            onBack: {
                panel = .root
                mode = .landing
            },
            rightLabel: "Törlés",
            onRight: store.reset
        )
    }

    private var rootList: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                SectionLabel(text: "Jármű")
                SettingsGroup {
                    SettingsRow(title: "Márka", value: store.filter.brandLabel) {
                        panel = .brand
                    }
                    Divider().padding(.leading, 16)
                    SettingsRow(title: "Modell", value: store.filter.modell ?? "Mindegy") {
                        panel = .model
                    }
                }

                SectionLabel(text: "Feltételek")
                SettingsGroup {
                    SettingsRow(title: "Üzemanyag", value: store.filter.fuelLabel) {
                        panel = .fuel
                    }
                    Divider().padding(.leading, 16)
                    SettingsRow(title: "Ár", value: priceValue) { panel = .price }
                    Divider().padding(.leading, 16)
                    SettingsRow(title: "Évjárat", value: yearValue) { panel = .year }
                    Divider().padding(.leading, 16)
                    SettingsRow(title: "Futott km", value: kmValue) { panel = .km }
                    Divider().padding(.leading, 16)
                    SettingsRow(title: "Extrák", value: extrasValue) { panel = .extras }
                }

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

                Text("Márka: több is bekapcsolható. Extrák: kapcsoló.")
                    .font(.footnote)
                    .foregroundStyle(AppTheme.textTertiary)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity)
            }
            .padding(16)
        }
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
                    }
                }
            }
            .padding(16)
        }
    }

    private var availableModels: [String] {
        let brands = store.filter.gyartmanyok
        guard !brands.isEmpty else { return [] }
        var seen = Set<String>()
        var out: [String] = []
        for brand in brands {
            for model in Catalog.brands[brand] ?? [] {
                if seen.insert(model).inserted {
                    out.append(model)
                }
            }
        }
        return out.sorted()
    }

    private var modelList: some View {
        ScrollView {
            if store.filter.gyartmanyok.isEmpty {
                Text("Előbb kapcsolj be legalább egy márkát.")
                    .foregroundStyle(AppTheme.textSecondary)
                    .padding(.top, 40)
                    .frame(maxWidth: .infinity)
            } else {
                let models = availableModels
                SettingsGroup {
                    choiceRow("Mindegy", selected: store.filter.modell == nil) {
                        store.setModel(nil)
                        goRoot()
                    }
                    ForEach(models, id: \.self) { model in
                        Divider().padding(.leading, 16)
                        choiceRow(model, selected: store.filter.modell == model) {
                            store.setModel(model)
                            goRoot()
                        }
                    }
                }
                .padding(16)
            }
        }
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

    private var yearList: some View {
        ScrollView {
            SettingsGroup {
                ForEach(Array(Catalog.yearPresets.enumerated()), id: \.offset) { index, preset in
                    if index > 0 { Divider().padding(.leading, 16) }
                    let selected = store.filter.evTol == preset.tol && store.filter.evIg == preset.ig
                    choiceRow(preset.label, selected: selected) {
                        store.setYear(tol: preset.tol, ig: preset.ig)
                        goRoot()
                    }
                }
            }
            .padding(16)
        }
    }

    private var kmList: some View {
        ScrollView {
            SettingsGroup {
                ForEach(Array(Catalog.kmPresets.enumerated()), id: \.offset) { index, preset in
                    if index > 0 { Divider().padding(.leading, 16) }
                    let selected = store.filter.kmTol == preset.tol && store.filter.kmIg == preset.ig
                    choiceRow(preset.label, selected: selected) {
                        store.setKm(tol: preset.tol, ig: preset.ig)
                        goRoot()
                    }
                }
            }
            .padding(16)
        }
    }

    private var extrasList: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 8) {
                SectionLabel(text: "Kapcsolók — nem pipa")
                SettingsGroup {
                    ForEach(Array(ExtraKey.allCases.enumerated()), id: \.element.id) { index, key in
                        if index > 0 { Divider().padding(.leading, 16) }
                        Toggle(key.label, isOn: Binding(
                            get: { store.isExtraOn(key) },
                            set: { store.setExtra(key, on: $0) }
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

    private func choiceRow(_ title: String, selected: Bool, action: @escaping () -> Void) -> some View {
        SettingsRow(title: title, value: selected ? "✓" : nil, showChevron: false, action: action)
    }

    private func goRoot() {
        brandQuery = ""
        panel = .root
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
