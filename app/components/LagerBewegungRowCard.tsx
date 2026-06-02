"use client";

import Link from "next/link";
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
  const fahrzeugLabel = row.fahrzeug_kennzeichen
    ? `PKW ${row.fahrzeug_kennzeichen}`
    : row.machine_geraetenummer ?? "";

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
      <div className="lagerBewegungCardHead">
        <time dateTime={row.created_at}>{formatBewegungDatum(row.created_at)}</time>
        <span className="lagerBewegungCardTyp">{typ}</span>
      </div>
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
            <Link
              href={href}
              className="lagerBewegungReferenzLink"
              onClick={(event) => event.stopPropagation()}
            >
              {referenz}
            </Link>
          ) : (
            referenz
          )}
        </p>
      ) : null}
      {fahrzeugLabel ? <p className="lagerBewegungCardFahrzeug">{fahrzeugLabel}</p> : null}
      {row.bemerkung?.trim() ? (
        <p className="lagerBewegungCardBemerkung">{formatLagerValue(row.bemerkung)}</p>
      ) : null}
      {href ? <span className="lagerBewegungCardHint">Tippen zum Öffnen</span> : null}
    </article>
  );
}
