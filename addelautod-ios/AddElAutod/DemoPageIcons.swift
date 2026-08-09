import SwiftUI

/// Demo ikonok a fő 7 laphoz (Assets: demo-*). Csak vizuális placeholder.
enum DemoPageIcons {
    case hirfolyam, facebook, youtube, ajanlasok, kiemeltek, foOldal, mentettKeresesek

    var assetName: String {
        switch self {
        case .hirfolyam: return "demo-hirfolyam"
        case .facebook: return "demo-facebook"
        case .youtube: return "demo-youtube"
        case .ajanlasok: return "demo-ajanlasok"
        case .kiemeltek: return "demo-kiemeltek"
        case .foOldal: return "demo-fo-oldal"
        case .mentettKeresesek: return "demo-mentett-keresesek"
        }
    }

    var title: String {
        switch self {
        case .hirfolyam: return "Hírfolyam"
        case .facebook: return "Facebook"
        case .youtube: return "YouTube"
        case .ajanlasok: return "Ajánlások"
        case .kiemeltek: return "Kiemeltek"
        case .foOldal: return "Fő oldal"
        case .mentettKeresesek: return "Mentett"
        }
    }

    static let all: [DemoPageIcons] = [
        .hirfolyam, .facebook, .youtube, .ajanlasok, .kiemeltek, .foOldal, .mentettKeresesek
    ]
}
