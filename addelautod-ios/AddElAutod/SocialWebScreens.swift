import SwiftUI
import WebKit

/// Facebook Reel oldal (swipe)
struct FacebookReelScreen: View {
    private let url = URL(string: "https://www.facebook.com/reel/1514194393830438")!

    var body: some View {
        VStack(spacing: 0) {
            ScreenHeader(title: "Facebook", subtitle: "Reel")
            SocialWebView(url: url)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .background(AppTheme.bg)
    }
}

/// YouTube oldal (swipe)
struct YouTubeScreen: View {
    private let url = URL(string: "https://www.youtube.com")!

    var body: some View {
        VStack(spacing: 0) {
            ScreenHeader(title: "YouTube", subtitle: "Videók")
            SocialWebView(url: url)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .background(AppTheme.bg)
    }
}

private struct SocialWebView: UIViewRepresentable {
    let url: URL

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        let web = WKWebView(frame: .zero, configuration: config)
        web.allowsBackForwardNavigationGestures = true
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.load(URLRequest(url: url))
        return web
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}
}

#Preview {
    FacebookReelScreen()
}
