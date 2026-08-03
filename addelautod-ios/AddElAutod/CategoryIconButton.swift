import SwiftUI

/// Autosweb kategóriaikon — kb. a webes kártya 1/4 mérete (~30 pt)
struct CategoryIconButton: View {
    let category: QuickCategory
    let action: () -> Void

    private let iconSize: CGFloat = 30
    private let corner: CGFloat = 7

    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Image(category.imageName)
                    .resizable()
                    .scaledToFill()
                    .frame(width: iconSize, height: iconSize)
                    .clipShape(RoundedRectangle(cornerRadius: corner, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: corner, style: .continuous)
                            .stroke(AppTheme.border, lineWidth: 0.5)
                    )
                Text(category.title)
                    .font(.system(size: 9, weight: .medium))
                    .foregroundStyle(AppTheme.text)
                    .lineLimit(1)
            }
            .frame(width: 52)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(category.title)
        .accessibilityHint(category.subtitle)
    }
}
