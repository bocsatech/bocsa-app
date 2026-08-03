import SwiftUI
import UIKit

struct FeedScreen: View {
    var body: some View {
        VStack(spacing: 0) {
            ScreenHeader(title: "Hírfolyam", subtitle: "Hírek · YouTube")
            ScrollView {
                LazyVStack(spacing: 12) {
                    ForEach(SampleContent.feed) { item in
                        FeedCard(item: item)
                    }
                    Text("Demo tartalom — később Autosweb + YouTube.")
                        .font(.footnote)
                        .foregroundStyle(AppTheme.textTertiary)
                        .multilineTextAlignment(.center)
                        .padding(.top, 8)
                }
                .padding(16)
            }
        }
        .background(AppTheme.bg)
    }
}

private struct FeedCard: View {
    let item: FeedItem

    var body: some View {
        Button {
            if let url = item.url {
                UIApplication.shared.open(url)
            }
        } label: {
            VStack(alignment: .leading, spacing: 8) {
                Text(item.kind == .youtube ? "YouTube" : item.source)
                    .font(.caption.weight(.semibold))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(item.kind == .youtube ? Color.red.opacity(0.12) : AppTheme.accent.opacity(0.12))
                    .foregroundStyle(item.kind == .youtube ? Color.red.opacity(0.85) : AppTheme.accent)
                    .clipShape(Capsule())

                Text(item.title)
                    .font(.headline)
                    .foregroundStyle(AppTheme.text)
                    .multilineTextAlignment(.leading)
                Text(item.subtitle)
                    .font(.subheadline)
                    .foregroundStyle(AppTheme.textSecondary)
                    .multilineTextAlignment(.leading)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
            .background(AppTheme.bgElevated)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(AppTheme.border, lineWidth: 0.5)
            )
        }
        .buttonStyle(.plain)
    }
}

struct FeaturedScreen: View {
    var body: some View {
        VStack(spacing: 0) {
            ScreenHeader(title: "Kiemeltek", subtitle: "Autós oldal hirdetései")
            ScrollView {
                LazyVStack(spacing: 12) {
                    ForEach(SampleContent.featured) { ad in
                        VStack(alignment: .leading, spacing: 6) {
                            HStack(alignment: .top) {
                                Text(ad.title)
                                    .font(.headline)
                                    .foregroundStyle(AppTheme.text)
                                Spacer()
                                if let badge = ad.badge {
                                    Text(badge)
                                        .font(.caption2.weight(.bold))
                                        .foregroundStyle(AppTheme.accent)
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 3)
                                        .background(AppTheme.accent.opacity(0.12))
                                        .clipShape(Capsule())
                                }
                            }
                            Text(ad.priceLabel)
                                .font(.title2.weight(.bold))
                                .foregroundStyle(AppTheme.text)
                            Text(ad.meta)
                                .font(.subheadline)
                                .foregroundStyle(AppTheme.textSecondary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(16)
                        .background(AppTheme.bgElevated)
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .stroke(AppTheme.border, lineWidth: 0.5)
                        )
                    }
                    Text("Demo lista — később Autosweb kiemeltek.")
                        .font(.footnote)
                        .foregroundStyle(AppTheme.textTertiary)
                        .padding(.top, 8)
                }
                .padding(16)
            }
        }
        .background(AppTheme.bg)
    }
}
