import SwiftUI

struct InboxMessage: Identifiable, Equatable {
    let id: String
    var from: String
    var subject: String
    var preview: String
    var dateLabel: String
    var isRead: Bool
}

/// Autosweb Fiókom → Üzenetek mintára
struct MessagesScreen: View {
    var onClose: () -> Void

    @State private var messages: [InboxMessage] = MessagesScreen.demoMessages
    @State private var selected: InboxMessage?

    var body: some View {
        VStack(spacing: 0) {
            ScreenHeader(
                title: "Üzenetek",
                subtitle: unreadCount == 0 ? "Nincs olvasatlan" : "\(unreadCount) olvasatlan",
                onBack: onClose
            )

            if messages.isEmpty {
                VStack(spacing: 10) {
                    Image(systemName: "envelope.open")
                        .font(.system(size: 40))
                        .foregroundStyle(AppTheme.textTertiary)
                    Text("Nincs üzeneted.")
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.textSecondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List {
                    ForEach($messages) { $msg in
                        Button {
                            msg.isRead = true
                            selected = msg
                        } label: {
                            HStack(alignment: .top, spacing: 12) {
                                Circle()
                                    .fill(msg.isRead ? AppTheme.border : AppTheme.accent)
                                    .frame(width: 10, height: 10)
                                    .padding(.top, 6)

                                VStack(alignment: .leading, spacing: 4) {
                                    HStack {
                                        Text(msg.from)
                                            .font(.subheadline.weight(msg.isRead ? .regular : .semibold))
                                            .foregroundStyle(AppTheme.text)
                                        Spacer()
                                        Text(msg.dateLabel)
                                            .font(.caption2)
                                            .foregroundStyle(AppTheme.textTertiary)
                                    }
                                    Text(msg.subject)
                                        .font(.subheadline.weight(msg.isRead ? .regular : .medium))
                                        .foregroundStyle(AppTheme.text)
                                    Text(msg.preview)
                                        .font(.caption)
                                        .foregroundStyle(AppTheme.textSecondary)
                                        .lineLimit(2)
                                }
                            }
                            .padding(.vertical, 4)
                        }
                        .buttonStyle(.plain)
                    }
                    .onDelete { indexSet in
                        messages.remove(atOffsets: indexSet)
                    }
                }
                .listStyle(.plain)
            }
        }
        .background(AppTheme.bgGrouped)
        .sheet(item: $selected) { msg in
            NavigationStack {
                VStack(alignment: .leading, spacing: 12) {
                    Text(msg.subject)
                        .font(.title3.weight(.semibold))
                    Text("Feladó: \(msg.from)")
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.textSecondary)
                    Text(msg.dateLabel)
                        .font(.caption)
                        .foregroundStyle(AppTheme.textTertiary)
                    Divider()
                    Text(msg.preview)
                        .font(.body)
                        .foregroundStyle(AppTheme.text)
                    Spacer()
                }
                .padding(20)
                .navigationTitle("Üzenet")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Bezárás") { selected = nil }
                    }
                }
            }
            .presentationDetents([.medium, .large])
        }
    }

    private var unreadCount: Int {
        messages.filter { !$0.isRead }.count
    }

    private static let demoMessages: [InboxMessage] = [
        InboxMessage(
            id: "1",
            from: "Kiss Péter",
            subject: "Érdeklődés: VW Golf",
            preview: "Szia! Érdekelne az autó, mikor lehet megnézni? Budapesten vagyok.",
            dateLabel: "Ma",
            isRead: false
        ),
        InboxMessage(
            id: "2",
            from: "Add el autod",
            subject: "Üdv a fiókodban",
            preview: "Köszönjük a regisztrációt. Itt jelennek meg a hirdetéseidhez érkező üzenetek.",
            dateLabel: "Tegnap",
            isRead: true
        ),
        InboxMessage(
            id: "3",
            from: "Nagy Anna",
            subject: "Árajánlat kérés",
            preview: "Szeretnék érdeklődni, van-e mozgástér az árban, illetve benne van-e a szervizkönyv.",
            dateLabel: "Hétfő",
            isRead: false
        ),
    ]
}

#Preview {
    MessagesScreen(onClose: {})
}
