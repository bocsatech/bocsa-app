import Foundation

/// Hirdetésfeladás → részletes keresés opciók / extrák (Autosweb equipment-data)
enum DetailedSearchCatalog {
    static let allapotok = ["Normál", "Újszerű", "Sérülésmentes", "Sérült"]

    static let kiviteles = [
        "Szedán", "Ferdehátú", "Kombi", "SUV / Crossover", "Egyterű", "Kupé", "Cabrio",
    ]

    static let ajtok = ["2", "3", "4", "5"]

    static let szemelyek = ["2", "3", "4", "5", "6", "7", "8", "9"]

    static let okmanyJellegek = [
        "Érvényes magyar okmányokkal",
        "Érvényes külföldi okmányokkal",
    ]

    static let okmanyErvenyesseg = ["Érvényes", "Lejárt"]

    static let sebessegvaltok = [
        "Manuális",
        "Automata",
    ]

    static let hajtasok = ["Első kerék", "Hátsó kerék", "Összkerék"]

    static let hengerElrendezesek = ["Sor", "V", "Boxer", "W"]

    static let szinek = [
        "Fehér", "Fekete", "Szürke", "Ezüst", "Kék", "Piros", "Zöld", "Barna", "Sárga", "Egyéb",
    ]

    static let klimaOptions = [
        "nincs",
        "manuális klíma",
        "automata klíma",
        "digitális klíma",
        "digitális kétzónás klíma",
        "digitális többzónás klíma",
        "hőszivattyús klíma",
    ]

    static let toltoCsatlakozok = ["Type 2", "CCS", "CHAdeMO", "Schuko / hálózati"]

    static let equipmentSections: [(id: String, title: String, items: [String])] = [
        (
            "muszaki",
            "Műszaki felszereltség",
            [
                "4WS (összkerékkormányzás)",
                "állítható felfüggesztés",
                "állítható kormány",
                "automatikus hengerlekapcsolás",
                "centrálzár",
                "chiptuning",
                "EDC (elektronikus lengéscsillapítás vezérlés)",
                "elektromos ablak elöl",
                "elektromos ablak hátul",
                "elektromos tükör",
                "fedélzeti komputer",
                "fűthető tükör",
                "HUD / Head-Up Display",
                "kerámia féktárcsák",
                "kétoldali tolóajtó",
                "könnyűfém felni",
                "kormányváltó",
                "króm felni",
                "részecskeszűrő",
                "riasztó",
                "sebességfüggő szervokormány",
                "sperr differenciálmű",
                "sportfutómű",
                "sportülések",
                "start-stop/motormegállító rendszer",
                "szervokormány",
                "színezett üveg",
                "tolóajtó",
                "tolótető - elektromos",
                "tolótető (napfénytető)",
                "vonóhorog",
            ]
        ),
        (
            "kenyelem",
            "Kényelmi felszereltség",
            [
                "full extra",
                "állófűtés",
                "fűthető első ülés",
                "fűthető kormány",
                "álló helyzeti klíma",
                "bőr belső",
                "műbőr-kárpit",
                "360 fokos kamerarendszer",
                "Alcantara kárpit",
                "bőrkormány",
                "digitális műszeregység",
                "elektromos csomagtérajtó-mozgatás",
                "kulcs nélküli indítás",
                "masszírozós ülés",
                "multifunkciós kormánykerék",
                "tolatókamera",
                "tolatóradar",
                "távolsági fényszóró asszisztens",
            ]
        ),
        (
            "biztonsag",
            "Biztonsági felszereltség",
            [
                "függönylégzsák",
                "oldallégzsák",
                "vezetőoldali légzsák",
                "utasoldali légzsák",
                "automata fényszórókapcsolás",
                "LED fényszóró",
                "xenon fényszóró",
                "koccanásgátló",
                "sávtartó rendszer",
                "tempomat",
                "ABS (blokkolásgátló)",
                "ESP (menetstabilizátor)",
                "indításgátló (immobiliser)",
                "ISOFIX rendszer",
                "defekttűrő abroncsok",
            ]
        ),
        (
            "hifi",
            "HiFi és multimédia",
            [
                "GPS (navigáció)",
                "bluetooth-os kihangosító",
                "USB csatlakozó",
                "Android Auto",
                "Apple CarPlay",
                "érintőkijelző",
                "vezeték nélküli telefontöltés",
                "WiFi Hotspot",
            ]
        ),
        (
            "kiegeszito",
            "Kiegészítő felszereltség",
            [
                "defektjavító készlet",
                "otthoni hálózati töltő",
                "pótkerék",
                "tetőcsomagtartó",
                "Type2 töltőkábel",
            ]
        ),
        (
            "egyeb",
            "Egyéb információk",
            [
                "garanciális",
                "azonnal elvihető",
                "első tulajdonostól",
                "garázsban tartott",
                "keveset futott",
                "nem dohányzó",
                "rendszeresen karbantartott",
                "vezetett szervizkönyv",
                "ÁFA visszaigényelhető",
                "autóbeszámítás lehetséges",
            ]
        ),
    ]
}
