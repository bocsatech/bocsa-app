import SwiftUI

/// Autosweb kategóriaikon — ugyanakkora, mint Keresés / Beállítások
struct CategoryIconButton: View {
    let category: QuickCategory
    let action: () -> Void

    private let iconSize: CGFloat = 60
    private let corner: CGFloat = 14

    var body: some View {
        Button(action: action) {
            VStack(spacing: 6) {
                Image(category.imageName)
                    .resizable()
                    .scaledToFill()
                    .frame(width: iconSize, height: iconSize)
                    .clipShape(RoundedRectangle(cornerRadius: corner, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: corner, style: .continuous)
                            .stroke(AppTheme.border, lineWidth: 0.5)
                    )
                    .shadow(color: .black.opacity(0.12), radius: 3, y: 1)
                Text(category.title)
                    .font(.system(size: 11))
                    .foregroundStyle(AppTheme.text)
                    .lineLimit(1)
            }
            .frame(width: 76)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(category.title)
        .accessibilityHint(category.subtitle)
    }
}
