"use client";

import { BUCHUNG_SOURCE_LABELS, BUCHUNG_STATUS_LABELS } from "../../lib/pkw";
import { formatLagerNumber, formatLagerValue } from "../../lib/lager";
import type { LagerPkwTerminPartRow } from "../../lib/lager-pkw-termine";

type Props = {
  row: LagerPkwTerminPartRow;
  onOpen: (buchungId: string) => void;
};

function formatTerminDatum(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LagerPkwTerminCard({ row, onOpen }: Props) {
  const { buchung, fahrzeug, part, teil, lagerstand, fehlmenge, emptyParts } = row;
  const kennzeichen = fahrzeug?.kennzeichen ?? buchung.kennzeichen;
  const sourceLabel =
    buchung.source === "portal"
      ? BUCHUNG_SOURCE_LABELS.portal ?? "Portal"
      : BUCHUNG_SOURCE_LABELS.buero ?? "Büro";
  const typLabel = `${sourceLabel}-Termin`;

  function openDetail() {
    onOpen(buchung.id);
  }

  return (
    <article
      className={[
        "lagerBewegungCard",
        "lagerPkwTerminCard",
        fehlmenge > 0 ? "lagerPkwTerminCardShortage" : "",
        "lagerBewegungCardTappable",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={openDetail}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openDetail();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <p className="lagerBewegungCardAsset">{kennzeichen}</p>
      <span className="lagerBewegungCardHint">Tippen zum Öffnen</span>
      <p className="lagerBewegungCardMeta">
        <time dateTime={buchung.slot_start}>{formatTerminDatum(buchung.slot_start)}</time>
        <span className="lagerBewegungCardTyp">{typLabel}</span>
      </p>

      {emptyParts ? (
        <p className="lagerPkwTerminEmptyParts">
          Noch keine Ersatzteile — tippen zum Hinzufügen
        </p>
      ) : part ? (
        <>
          <p className="lagerBewegungCardTeil">
            <strong>{formatLagerValue(part.herstellernummer || teil?.herstellernummer)}</strong>
            {(part.bezeichnung ?? teil?.bezeichnung)?.trim() ? (
              <span className="lagerBewegungCardBezeichnung">
                {" "}
                · {(part.bezeichnung ?? teil?.bezeichnung)?.trim()}
              </span>
            ) : null}
          </p>
          <p className="lagerBewegungCardMenge">
            Lagerstand: <strong>{formatLagerNumber(lagerstand)}</strong>
            {fehlmenge > 0 ? (
              <span className="lagerPkwTerminFehlmenge">
                {" "}
                · Fehlmenge: <strong>{formatLagerNumber(fehlmenge)}</strong>
              </span>
            ) : null}
          </p>
        </>
      ) : null}

      <p className="lagerBewegungCardReferenz">
        <span className="lagerPkwTerminStatus pillButton outline">
          {BUCHUNG_STATUS_LABELS[buchung.status] ?? buchung.status}
        </span>
      </p>
    </article>
  );
}
