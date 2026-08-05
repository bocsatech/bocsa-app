import SwiftUI

/// Autosweb kategóriaikon — nagyobb, 3 / sor; kép nem vágódik (fit)
struct CategoryIconButton: View {
    let category: QuickCategory
    let action: () -> Void

    /// Nagyobb ikon; a rács 3 oszlopos, így elfér
    private let iconSize: CGFloat = 100
    private let corner: CGFloat = 16

    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(category.imageName)
                    .resizable()
                    .scaledToFit()
                    .frame(width: iconSize, height: iconSize)
                    .background(Color.white)
                    .clipShape(RoundedRectangle(cornerRadius: corner, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: corner, style: .continuous)
                            .stroke(AppTheme.border, lineWidth: 0.5)
                    )
                    .shadow(color: .black.opacity(0.12), radius: 3, y: 1)
                Text(category.title)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(AppTheme.text)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(category.title)
        .accessibilityHint(category.subtitle)
    }
}
