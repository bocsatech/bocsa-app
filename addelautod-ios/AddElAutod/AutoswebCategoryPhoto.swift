import SwiftUI

/// Autosweb `/images/categories/*.png` — menüikon méretben (nem nagyobb, mint a régi kék kör / SF ikon).
enum AutoswebCategoryPhoto {
    /// Autó keresés / Autó hirdetés fejléc — max. a korábbi kék kör.
    static let headerSize: CGFloat = 44
    /// Alkategória sor (Személyautó, Leasing, …) — max. a korábbi SF ikon kerete.
    static let rowSize: CGFloat = 28

    /// Autó menüpont → asset név (`uj`, `leasing`, `berelheto`, …).
    static func assetName(forAutoItemId id: String) -> String {
        switch id {
        case "auto-szemelyauto":
            return QuickCategory.uj.imageName
        case "auto-leasing":
            return QuickCategory.leasing.imageName
        case "auto-berauto", "auto-berlakokocsi":
            return QuickCategory.berelheto.imageName
        default:
            return QuickCategory.uj.imageName
        }
    }
}

/// Ugyanaz a képstílus, mint a főoldali Autókeresés kategóriakártyákon (`scaledToFit` + fehér háttér).
struct AutoswebCategoryPhotoView: View {
    let imageName: String
    var size: CGFloat = AutoswebCategoryPhoto.rowSize
    var dimmed: Bool = false

    private var corner: CGFloat { max(4, size * 0.18) }

    var body: some View {
        Image(imageName)
            .resizable()
            .scaledToFit()
            .padding(size * 0.06)
            .frame(width: size, height: size)
            .background(Color.white)
            .clipShape(RoundedRectangle(cornerRadius: corner, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: corner, style: .continuous)
                    .stroke(AppTheme.border.opacity(0.85), lineWidth: 0.5)
            )
            .opacity(dimmed ? 0.45 : 1)
            .accessibilityHidden(true)
    }
}
