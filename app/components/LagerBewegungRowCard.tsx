"use client";

import { useRouter } from "next/navigation";
import {
  bewegungTypLabel,
  formatBewegungDatum,
  resolveLagerBewegungHref,
  type LagerBewegung,
} from "../../lib/lager-bewegungen";
import { formatLagerNumber, formatLagerValue } from "../../lib/lager";

type Props = {
  row: LagerBewegung;
};

export default function LagerBewegungRowCard({ row }: Props) {
  const router = useRouter();
  const href = resolveLagerBewegungHref(row);
  const typ = bewegungTypLabel(row.typ, row.richtung);
  const referenz = row.referenz?.trim() ?? "";
  const assetLabel =
    row.machine_geraetenummer?.trim() ||
    row.fahrzeug_kennzeichen?.trim() ||
    null;

  function openDetail() {
    if (href) router.push(href);
  }

  return (
    <article
      className={[
        "lagerBewegungCard",
        row.richtung === "ein" ? "lagerBewegungEin" : "lagerBewegungAus",
        href ? "lagerBewegungCardTappable" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={href ? openDetail : undefined}
      onKeyDown={
        href
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openDetail();
              }
            }
          : undefined
      }
      role={href ? "link" : undefined}
      tabIndex={href ? 0 : undefined}
    >
      {assetLabel ? <p className="lagerBewegungCardAsset">{assetLabel}</p> : null}
      {href ? <span className="lagerBewegungCardHint">Tippen zum Öffnen</span> : null}
      <p className="lagerBewegungCardMeta">
        <time dateTime={row.created_at}>{formatBewegungDatum(row.created_at)}</time>
        <span className="lagerBewegungCardTyp">{typ}</span>
      </p>
      <p className="lagerBewegungCardTeil">
        <strong>{formatLagerValue(row.teil?.herstellernummer)}</strong>
        {row.teil?.bezeichnung?.trim() ? (
          <span className="lagerBewegungCardBezeichnung"> · {row.teil.bezeichnung.trim()}</span>
        ) : null}
      </p>
      <p className="lagerBewegungCardMenge">
        Menge: <strong>{formatLagerNumber(row.menge)}</strong>
      </p>
      {referenz ? (
        <p className="lagerBewegungCardReferenz">
          {href ? (
            <button
              type="button"
              className="lagerBewegungReferenzBtn pillButton outline"
              onClick={(event) => {
                event.stopPropagation();
                router.push(href);
              }}
            >
              {referenz}
            </button>
          ) : (
            <span className="lagerBewegungReferenzPlain">{referenz}</span>
          )}
        </p>
      ) : null}
      {row.bemerkung?.trim() ? (
        <p className="lagerBewegungCardBemerkung">{formatLagerValue(row.bemerkung)}</p>
      ) : null}
    </article>
  );
}
