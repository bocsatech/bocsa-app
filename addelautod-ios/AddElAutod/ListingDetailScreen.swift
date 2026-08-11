import SwiftUI
import UIKit

/// Willhaben-szerű hirdetésnézet — magyar feliratok, fix Üzenet alul.
struct ListingDetailScreen: View {
  @EnvironmentObject private var profile: ProfileStore
  let detail: ListingDetail
  var onClose: () -> Void

  @State private var showMessages = false
  @State private var photoIndex = 0
  @State private var favorited = false
  @State private var backDragX: CGFloat = 0

  /// Status bar / Dynamic Island magasság (ignoresSafeArea után is stabil).
  private var topSafeInset: CGFloat {
    let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
    let window = scenes.flatMap(\.windows).first(where: \.isKeyWindow) ?? scenes.flatMap(\.windows).first
    return window?.safeAreaInsets.top ?? 59
  }

  var body: some View {
    VStack(spacing: 0) {
      ScrollView {
        VStack(alignment: .leading, spacing: 0) {
          gallery(topInset: topSafeInset)
          VStack(alignment: .leading, spacing: 0) {
            titleBlock
            Divider().padding(.horizontal, 16)
            vehicleSection
            sellerSection
            equipmentSection
            descriptionSection
            Color.clear.frame(height: 24)
          }
          .simultaneousGesture(backSwipeGesture)
        }
      }

      messageBar
    }
    .offset(x: backDragX)
    .background(Color.white.ignoresSafeArea())
    // Fotó a status bar / Dynamic Island alá is — nincs fehér sáv felül
    .ignoresSafeArea(edges: .top)
    .fullScreenCover(isPresented: $showMessages) {
      StartChatScreen(
        target: detail.messageTarget,
        onClose: { showMessages = false }
      )
      .environmentObject(profile)
    }
  }

  /// Balról jobbra húzás a szöveges részen → vissza (a képen fotó lapozás marad).
  private var backSwipeGesture: some Gesture {
    DragGesture(minimumDistance: 24, coordinateSpace: .local)
      .onChanged { value in
        let dx = value.translation.width
        let dy = value.translation.height
        guard abs(dx) > abs(dy) * 1.15 else {
          if backDragX != 0 { backDragX = 0 }
          return
        }
        // Jobbra = pozitív dx (balról jobbra)
        if dx > 0 {
          backDragX = min(dx * 0.45, 120)
        } else {
          backDragX = 0
        }
      }
      .onEnded { value in
        let dx = value.translation.width
        let dy = value.translation.height
        let goBack = dx > 90 && abs(dx) > abs(dy) * 1.15
        withAnimation(.easeOut(duration: 0.2)) {
          backDragX = 0
        }
        if goBack {
          onClose()
        }
      }
  }

  // MARK: - Gallery

  private func gallery(topInset: CGFloat) -> some View {
    let photoHeight: CGFloat = 280
    return ZStack(alignment: .top) {
      TabView(selection: $photoIndex) {
        if detail.imageURLs.isEmpty {
          ForEach(0..<3, id: \.self) { i in
            placeholderSlide(index: i)
              .tag(i)
          }
        } else {
          ForEach(Array(detail.imageURLs.enumerated()), id: \.offset) { i, url in
            ListingRemoteImage(url: url)
              .frame(maxWidth: .infinity, maxHeight: .infinity)
              .clipped()
              .tag(i)
          }
        }
      }
      .tabViewStyle(.page(indexDisplayMode: .automatic))
      .frame(height: photoHeight + topInset)
      .background(Color(.tertiarySystemFill))

      // Enyhe sötétítés felül, hogy az óra / jelzők olvashatók legyenek a képen
      LinearGradient(
        colors: [Color.black.opacity(0.35), Color.black.opacity(0)],
        startPoint: .top,
        endPoint: .bottom
      )
      .frame(height: topInset + 56)
      .allowsHitTesting(false)

      HStack {
        circleBtn(system: "chevron.left", action: onClose)
        Spacer()
        HStack(spacing: 10) {
          circleBtn(system: "square.and.arrow.up") {
            share()
          }
          circleBtn(system: favorited ? "star.fill" : "star") {
            favorited.toggle()
          }
        }
      }
      .padding(.horizontal, 12)
      .padding(.top, topInset + 8)
    }
  }

  private func placeholderSlide(index: Int) -> some View {
    ZStack {
      Color(.tertiarySystemFill)
      VStack(spacing: 8) {
        Image(systemName: "car.fill")
          .font(.system(size: 48))
          .foregroundStyle(.secondary)
        Text(detail.imageURLs.isEmpty ? "Nincs még kép (\(index + 1)/3)" : "Kép betöltése…")
          .font(.caption)
          .foregroundStyle(.secondary)
      }
    }
  }

  private func circleBtn(system: String, action: @escaping () -> Void) -> some View {
    Button(action: action) {
      Image(systemName: system)
        .font(.body.weight(.semibold))
        .foregroundStyle(.primary)
        .frame(width: 36, height: 36)
        .background(.ultraThinMaterial, in: Circle())
    }
    .buttonStyle(.plain)
  }

  // MARK: - Title + stats

  private var titleBlock: some View {
    VStack(alignment: .leading, spacing: 14) {
      Text(detail.title)
        .font(.title3.weight(.bold))
        .foregroundStyle(AppTheme.text)
        .fixedSize(horizontal: false, vertical: true)

      HStack(spacing: 0) {
        statCell(value: detail.priceLabel, label: "Eladási ár")
        Rectangle().fill(AppTheme.border).frame(width: 1, height: 36)
        statCell(value: detail.kmLabel, label: "Futásteljesítmény")
        Rectangle().fill(AppTheme.border).frame(width: 1, height: 36)
        statCell(value: detail.registrationLabel, label: "Első forgalomba helyezés")
      }
    }
    .padding(16)
  }

  private func statCell(value: String, label: String) -> some View {
    VStack(spacing: 4) {
      Text(value)
        .font(.subheadline.weight(.bold))
        .foregroundStyle(AppTheme.accent)
        .lineLimit(2)
        .minimumScaleFactor(0.8)
        .multilineTextAlignment(.center)
      Text(label)
        .font(.caption2)
        .foregroundStyle(AppTheme.textSecondary)
        .multilineTextAlignment(.center)
        .lineLimit(2)
        .minimumScaleFactor(0.85)
    }
    .frame(maxWidth: .infinity)
  }

  // MARK: - Sections

  private var vehicleSection: some View {
    VStack(alignment: .leading, spacing: 10) {
      Text("Járműadatok")
        .font(.headline)
      ForEach(detail.vehicleRows) { row in
        HStack(alignment: .top) {
          Text(row.label)
            .font(.subheadline)
            .foregroundStyle(AppTheme.textSecondary)
            .frame(width: 150, alignment: .leading)
          Text(row.value)
            .font(.subheadline)
            .foregroundStyle(AppTheme.text)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
      }
    }
    .padding(16)
  }

  private var sellerSection: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack(spacing: 12) {
        Circle()
          .fill(AppTheme.accent)
          .frame(width: 48, height: 48)
          .overlay {
            Image(systemName: "person.fill")
              .foregroundStyle(.white)
          }
        VStack(alignment: .leading, spacing: 2) {
          Text(detail.sellerName)
            .font(.headline)
          if let phone = detail.sellerPhone {
            Link(phone, destination: URL(string: "tel:\(phone.filter { $0.isNumber || $0 == "+" })") ?? URL(string: "tel://")!)
              .font(.subheadline)
              .foregroundStyle(AppTheme.accent)
          }
        }
      }

      if !detail.addressLines.isEmpty {
        VStack(alignment: .leading, spacing: 2) {
          ForEach(detail.addressLines, id: \.self) { line in
            Text(line)
              .font(.subheadline)
              .foregroundStyle(AppTheme.text)
          }
        }
      }

      if let query = detail.mapQuery {
        Button {
          openMaps(query)
        } label: {
          ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 12, style: .continuous)
              .fill(Color(.tertiarySystemFill))
              .frame(height: 140)
              .overlay {
                VStack(spacing: 6) {
                  Image(systemName: "map.fill")
                    .font(.title)
                    .foregroundStyle(AppTheme.accent)
                  Text(query)
                    .font(.caption)
                    .foregroundStyle(AppTheme.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
                }
              }
            Label("Térkép nagyítása", systemImage: "magnifyingglass")
              .font(.caption.weight(.medium))
              .padding(8)
              .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 8))
              .padding(8)
          }
        }
        .buttonStyle(.plain)
      }
    }
    .padding(16)
  }

  private var equipmentSection: some View {
    Group {
      if !detail.equipment.isEmpty {
        VStack(alignment: .leading, spacing: 10) {
          Text("Felszereltség")
            .font(.headline)
          let cols = Array(repeating: GridItem(.flexible(), alignment: .leading), count: 2)
          LazyVGrid(columns: cols, alignment: .leading, spacing: 8) {
            ForEach(detail.equipment, id: \.self) { item in
              Text(item)
                .font(.subheadline)
                .foregroundStyle(AppTheme.text)
            }
          }
        }
        .padding(16)
      }
    }
  }

  private var descriptionSection: some View {
    Group {
      if !detail.description.isEmpty {
        VStack(alignment: .leading, spacing: 8) {
          Text("Leírás")
            .font(.headline)
          Text(detail.description)
            .font(.subheadline)
            .foregroundStyle(AppTheme.text)
            .fixedSize(horizontal: false, vertical: true)
        }
        .padding(16)
      }
    }
  }

  // MARK: - Fixed message

  private var messageBar: some View {
    VStack(spacing: 0) {
      Divider()
      Button {
        showMessages = true
      } label: {
        HStack(spacing: 10) {
          Image(systemName: "bubble.left.fill")
          Text("Üzenet")
            .fontWeight(.semibold)
        }
        .foregroundStyle(.white)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .background(AppTheme.accent)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
      }
      .buttonStyle(.plain)
      .padding(.horizontal, 16)
      .padding(.vertical, 10)
      .background(Color.white)
    }
  }

  private func share() {
    let text = "\(detail.title) — \(detail.priceLabel)"
    let av = UIActivityViewController(activityItems: [text], applicationActivities: nil)
    guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
          let root = scene.windows.first?.rootViewController else { return }
    root.present(av, animated: true)
  }

  private func openMaps(_ query: String) {
    let q = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
    if let url = URL(string: "http://maps.apple.com/?q=\(q)") {
      UIApplication.shared.open(url)
    }
  }
}

// MARK: - List card with swipeable photos

struct ListingFeedCard: View {
  let detail: ListingDetail
  var onOpen: () -> Void

  @State private var photoIndex = 0

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      ZStack(alignment: .bottom) {
        TabView(selection: $photoIndex) {
          if detail.imageURLs.isEmpty {
            ForEach(0..<2, id: \.self) { i in
              listingImagePlaceholder
                .tag(i)
            }
          } else {
            ForEach(Array(detail.imageURLs.enumerated()), id: \.offset) { i, url in
              ListingRemoteImage(url: url)
                .clipped()
                .tag(i)
            }
          }
        }
        .tabViewStyle(.page(indexDisplayMode: .automatic))
        .frame(height: 160)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
      }
      .padding(.bottom, 10)

      Button(action: onOpen) {
        VStack(alignment: .leading, spacing: 6) {
          HStack(alignment: .top) {
            Text(detail.title)
              .font(.headline)
              .foregroundStyle(AppTheme.text)
              .multilineTextAlignment(.leading)
            Spacer(minLength: 8)
            if let badge = detail.badge {
              Text(badge)
                .font(.caption2.weight(.bold))
                .foregroundStyle(AppTheme.accent)
                .padding(.horizontal, 8)
                .padding(.vertical, 3)
                .background(AppTheme.accent.opacity(0.12))
                .clipShape(Capsule())
            }
          }
          Text(detail.priceLabel)
            .font(.title3.weight(.bold))
            .foregroundStyle(AppTheme.text)
          Text(detail.meta)
            .font(.subheadline)
            .foregroundStyle(AppTheme.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }
      .buttonStyle(.plain)
    }
    .padding(14)
    .background(AppTheme.bgElevated)
    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    .overlay(
      RoundedRectangle(cornerRadius: 16, style: .continuous)
        .stroke(AppTheme.border, lineWidth: 0.5)
    )
  }

  private var listingImagePlaceholder: some View {
    ZStack {
      Color(.tertiarySystemFill)
      Image(systemName: "car.fill")
        .font(.largeTitle)
        .foregroundStyle(.secondary)
    }
  }
}

/// TabView-barát képbetöltő (AsyncImage TabView-ban gyakran üresen marad).
struct ListingRemoteImage: View {
  let url: URL
  @State private var image: UIImage?
  @State private var failed = false

  var body: some View {
    Group {
      if let image {
        Image(uiImage: image)
          .resizable()
          .scaledToFill()
      } else if failed {
        ZStack {
          Color(.tertiarySystemFill)
          Image(systemName: "car.fill")
            .font(.largeTitle)
            .foregroundStyle(.secondary)
        }
      } else {
        ZStack {
          Color(.tertiarySystemFill)
          ProgressView()
        }
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .task(id: url.absoluteString) {
      await load()
    }
  }

  private func load() async {
    failed = false
    image = nil
    do {
      var req = URLRequest(url: url)
      req.timeoutInterval = 20
      req.cachePolicy = .returnCacheDataElseLoad
      let (data, response) = try await URLSession.shared.data(for: req)
      let code = (response as? HTTPURLResponse)?.statusCode ?? 0
      guard (200..<300).contains(code), let ui = UIImage(data: data) else {
        failed = true
        return
      }
      image = ui
    } catch {
      failed = true
    }
  }
}

/// Lista → részletes: élő id vagy demo.
enum ListingOpenRequest: Identifiable, Equatable {
  case remote(id: String)
  case demo(DemoListing)

  var id: String {
    switch self {
    case .remote(let id): return "r-\(id)"
    case .demo(let d): return "d-\(d.id)"
    }
  }
}

struct ListingDetailLoader: View {
  @EnvironmentObject private var profile: ProfileStore
  let request: ListingOpenRequest
  var onClose: () -> Void

  @State private var detail: ListingDetail?
  @State private var errorText: String?
  @State private var loading = true

  var body: some View {
    Group {
      if let detail {
        ListingDetailScreen(detail: detail, onClose: onClose)
      } else if loading {
        ProgressView("Hirdetés…")
          .frame(maxWidth: .infinity, maxHeight: .infinity)
          .background(Color.white)
      } else {
        VStack(spacing: 12) {
          Text(errorText ?? "Nem található.")
            .foregroundStyle(.red)
            .multilineTextAlignment(.center)
          Button("Vissza", action: onClose)
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.white)
      }
    }
    .task { await load() }
  }

  private func load() async {
    loading = true
    defer { loading = false }
    switch request {
    case .demo(let car):
      detail = car.asDetail
    case .remote(let id):
      do {
        detail = try await ListingsAPI.fetchDetail(id: id)
      } catch {
        errorText = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
      }
    }
  }
}
