import SwiftUI

struct PageDots: View {
    let count: Int
    let index: Int

    var body: some View {
        HStack(spacing: 8) {
            ForEach(0..<count, id: \.self) { i in
                Capsule()
                    .fill(i == index ? AppTheme.accent : AppTheme.pageDot)
                    .frame(width: i == index ? 18 : 8, height: 8)
            }
        }
        .animation(.easeInOut(duration: 0.2), value: index)
    }
}

struct ScreenHeader: View {
    let title: String
    var subtitle: String? = nil
    var onBack: (() -> Void)? = nil
    var rightLabel: String? = nil
    var onRight: (() -> Void)? = nil

    var body: some View {
        HStack {
            Group {
                if let onBack {
                    Button("‹ Vissza", action: onBack)
                        .foregroundStyle(AppTheme.accent)
                        .font(.body.weight(.medium))
                } else {
                    Color.clear.frame(width: 72, height: 1)
                }
            }
            .frame(width: 88, alignment: .leading)

            VStack(spacing: 2) {
                Text(title)
                    .font(.body.weight(.semibold))
                    .foregroundStyle(AppTheme.text)
                if let subtitle {
                    Text(subtitle)
                        .font(.caption)
                        .foregroundStyle(AppTheme.textSecondary)
                }
            }
            .frame(maxWidth: .infinity)

            Group {
                if let rightLabel, let onRight {
                    Button(rightLabel, action: onRight)
                        .foregroundStyle(AppTheme.accent)
                        .font(.body.weight(.medium))
                } else {
                    Color.clear.frame(width: 72, height: 1)
                }
            }
            .frame(width: 88, alignment: .trailing)
        }
        .padding(.horizontal, 8)
        .padding(.bottom, 8)
    }
}

struct SettingsRow: View {
    let title: String
    var value: String? = nil
    var showChevron: Bool = true
    var action: (() -> Void)? = nil

    var body: some View {
        Button {
            action?()
        } label: {
            HStack {
                Text(title)
                    .foregroundStyle(AppTheme.text)
                    .font(.body)
                Spacer()
                if let value {
                    Text(value)
                        .foregroundStyle(AppTheme.textSecondary)
                        .lineLimit(1)
                }
                if showChevron, action != nil {
                    Text("›")
                        .foregroundStyle(AppTheme.textTertiary)
                        .font(.title2)
                }
            }
            .padding(.horizontal, 16)
            .frame(minHeight: 52)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(action == nil)
    }
}

struct SettingsGroup<Content: View>: View {
    @ViewBuilder var content: () -> Content

    var body: some View {
        VStack(spacing: 0) {
            content()
        }
        .background(AppTheme.bgElevated)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

struct SectionLabel: View {
    let text: String
    var body: some View {
        Text(text.uppercased())
            .font(.caption.weight(.semibold))
            .foregroundStyle(AppTheme.textSecondary)
            .tracking(0.4)
            .padding(.leading, 4)
            .padding(.bottom, 6)
    }
}
