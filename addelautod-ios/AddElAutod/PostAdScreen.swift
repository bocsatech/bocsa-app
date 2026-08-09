import SwiftUI

/// Hirdetés feladás — kategória menük (űrlap később).
struct PostAdScreen: View {
    var onClose: () -> Void

    private enum TopSection: String {
        case auto, ingatlan
    }

    private enum SubPanel: Equatable {
        case list
        case tipus
        case kategoria
    }

    @State private var openTop: TopSection? = nil
    @State private var subPanel: SubPanel = .list
    @State private var selectedTipusok: Set<String> = []
    @State private var selectedKategoriak: Set<String> = []
    @State private var toast: String?

    var body: some View {
        VStack(spacing: 0) {
            switch subPanel {
            case .list:
                ScreenHeader(title: "Hirdetés feladás", subtitle: "Válassz kategóriát", onBack: onClose)
                mainList
            case .tipus:
                ScreenHeader(title: "Típus", onBack: { subPanel = .list }, rightLabel: "Kész", onRight: { subPanel = .list })
                multiSelectList(
                    sectionTitle: "Típus",
                    options: PostAdCatalog.ingatlanTipusok,
                    selection: $selectedTipusok
                )
            case .kategoria:
                ScreenHeader(title: "Kategória", onBack: { subPanel = .list }, rightLabel: "Kész", onRight: { subPanel = .list })
                multiSelectList(
                    sectionTitle: "Kategória",
                    options: PostAdCatalog.ingatlanKategoriak,
                    selection: $selectedKategoriak
                )
            }
        }
        .background(AppTheme.bgGrouped)
        .alert("Hirdetés feladás", isPresented: Binding(
            get: { toast != nil },
            set: { if !$0 { toast = nil } }
        )) {
            Button("OK", role: .cancel) { toast = nil }
        } message: {
            Text(toast ?? "")
        }
    }

    private var mainList: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                topAccordion(section: .auto, title: "Autó hirdetés") {
                    itemList(PostAdCatalog.autoItems)
                }

                topAccordion(section: .ingatlan, title: "Ingatlan hirdetések") {
                    VStack(spacing: 0) {
                        SettingsRow(title: "Típus", value: multiValue(selectedTipusok, from: PostAdCatalog.ingatlanTipusok)) {
                            subPanel = .tipus
                        }
                        Divider().padding(.leading, 16)
                        SettingsRow(title: "Kategória", value: multiValue(selectedKategoriak, from: PostAdCatalog.ingatlanKategoriak)) {
                            subPanel = .kategoria
                        }
                    }
                }
            }
            .padding(16)
            .padding(.bottom, 32)
        }
    }

    // MARK: - Top accordion

    private func topAccordion<Content: View>(
        section: TopSection,
        title: String,
        @ViewBuilder content: () -> Content
    ) -> some View {
        let isOpen = openTop == section
        return VStack(spacing: 0) {
            Button {
                withAnimation(.easeInOut(duration: 0.2)) {
                    openTop = isOpen ? nil : section
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
                    .padding(.bottom, 8)
            }
        }
        .background(AppTheme.bgElevated)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    // MARK: - Autó leaf items

    private func itemList(_ items: [PostAdCatalog.Item]) -> some View {
        VStack(spacing: 0) {
            ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                if index > 0 { Divider().padding(.leading, 16) }
                Button {
                    toast = "\(item.title) — hamarosan."
                } label: {
                    HStack {
                        Text(item.title)
                            .font(.body)
                            .foregroundStyle(AppTheme.text)
                        Spacer()
                        Text("›")
                            .foregroundStyle(AppTheme.textTertiary)
                            .font(.title2)
                    }
                    .padding(.horizontal, 16)
                    .frame(minHeight: 48)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
        }
    }

    // MARK: - Multi-select (mint a kereső)

    private func multiSelectList(
        sectionTitle: String,
        options: [PostAdCatalog.Item],
        selection: Binding<Set<String>>
    ) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 8) {
                SectionLabel(text: sectionTitle)
                Button {
                    selection.wrappedValue.removeAll()
                } label: {
                    Text("Összes kikapcsolása")
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(AppTheme.accent)
                        .padding(.leading, 4)
                }
                .buttonStyle(.plain)

                SettingsGroup {
                    ForEach(Array(options.enumerated()), id: \.element.id) { index, option in
                        if index > 0 { Divider().padding(.leading, 16) }
                        Toggle(option.title, isOn: Binding(
                            get: { selection.wrappedValue.contains(option.id) },
                            set: { on in
                                if on {
                                    selection.wrappedValue.insert(option.id)
                                } else {
                                    selection.wrappedValue.remove(option.id)
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

    private func multiValue(_ selected: Set<String>, from options: [PostAdCatalog.Item]) -> String {
        let titles = options.filter { selected.contains($0.id) }.map(\.title)
        if titles.isEmpty { return "Mindegy" }
        if titles.count == 1 { return titles[0] }
        if titles.count <= 3 { return titles.joined(separator: ", ") }
        return "\(titles.count) kiválasztva"
    }
}
