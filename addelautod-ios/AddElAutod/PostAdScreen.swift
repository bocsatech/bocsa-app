import SwiftUI

/// Hirdetés feladás — kategória menük (űrlap később).
struct PostAdScreen: View {
    var onClose: () -> Void

    private enum TopSection: String {
        case auto, ingatlan
    }

    @State private var openTop: TopSection? = nil
    @State private var openIngatlanGroup: String? = nil
    @State private var toast: String?

    var body: some View {
        VStack(spacing: 0) {
            ScreenHeader(title: "Hirdetés feladás", subtitle: "Válassz kategóriát", onBack: onClose)
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    topAccordion(
                        section: .auto,
                        title: "Autó hirdetés"
                    ) {
                        itemList(PostAdCatalog.autoItems)
                    }

                    topAccordion(
                        section: .ingatlan,
                        title: "Ingatlan hirdetések"
                    ) {
                        VStack(spacing: 8) {
                            ForEach(PostAdCatalog.ingatlanGroups) { group in
                                ingatlanGroupBlock(group)
                            }
                        }
                    }
                }
                .padding(16)
                .padding(.bottom, 32)
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

    // MARK: - Top accordion (Autó / Ingatlan)

    private func topAccordion<Content: View>(
        section: TopSection,
        title: String,
        @ViewBuilder content: () -> Content
    ) -> some View {
        let isOpen = openTop == section
        return VStack(spacing: 0) {
            Button {
                withAnimation(.easeInOut(duration: 0.2)) {
                    if isOpen {
                        openTop = nil
                        openIngatlanGroup = nil
                    } else {
                        openTop = section
                        if section != .ingatlan { openIngatlanGroup = nil }
                    }
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
                    .padding(.vertical, 8)
                    .padding(.horizontal, 8)
            }
        }
        .background(AppTheme.bgElevated)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    // MARK: - Ingatlan alcsoport (Eladó / Kiadó / Bérelhető)

    private func ingatlanGroupBlock(_ group: PostAdCatalog.Group) -> some View {
        let isOpen = openIngatlanGroup == group.id
        return VStack(spacing: 0) {
            Button {
                withAnimation(.easeInOut(duration: 0.2)) {
                    openIngatlanGroup = isOpen ? nil : group.id
                }
            } label: {
                HStack {
                    Text(group.title)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(AppTheme.text)
                    Spacer()
                    if group.items.isEmpty {
                        Text("Hamarosan")
                            .font(.caption)
                            .foregroundStyle(AppTheme.textTertiary)
                    }
                    Image(systemName: isOpen ? "chevron.up" : "chevron.down")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(AppTheme.textTertiary)
                }
                .padding(.horizontal, 12)
                .frame(minHeight: 44)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            if isOpen {
                if group.items.isEmpty {
                    Text("Ehhez a menühöz később kerülnek a típusok.")
                        .font(.footnote)
                        .foregroundStyle(AppTheme.textSecondary)
                        .padding(.horizontal, 12)
                        .padding(.bottom, 10)
                        .frame(maxWidth: .infinity, alignment: .leading)
                } else {
                    itemList(group.items)
                        .padding(.bottom, 6)
                }
            }
        }
        .background(AppTheme.bgGrouped.opacity(0.65))
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }

    // MARK: - Leaf items

    private func itemList(_ items: [PostAdCatalog.Item]) -> some View {
        SettingsGroup {
            ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                if index > 0 { Divider().padding(.leading, 16) }
                Button {
                    // Űrlap / funkció később
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
}
