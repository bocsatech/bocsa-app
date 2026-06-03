"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { formatGermanDate } from "../../lib/dates";
import { formatKundeName } from "../../lib/pkw";
import { buildPkwBuchungenByFahrzeug } from "../../lib/pkw-status";
import { formatPkwReifenSatzKurz, getPkwReifenSaetze } from "../../lib/pkw-reifen";
import type { PkwBuchung, PkwFahrzeug } from "../../lib/types/pkw";
import PkwStatusIndicators from "./PkwStatusIndicators";

type Props = {
  fahrzeuge: PkwFahrzeug[];
  buchungen?: PkwBuchung[];
};

function Field({
  label,
  value,
  className = "machineResultTitle",
  strong = false,
}: {
  label: string;
  value: string | null | undefined;
  className?: string;
  strong?: boolean;
}) {
  const text = value?.trim();
  if (!text) return null;
  return (
    <span className={className}>
      <strong>{label}</strong>
      {strong ? <b>{text}</b> : <span>{text}</span>}
    </span>
  );
}

export default function PkwFahrzeugList({ fahrzeuge, buchungen = [] }: Props) {
  const router = useRouter();
  const buchungenByFahrzeug = useMemo(() => buildPkwBuchungenByFahrzeug(buchungen), [buchungen]);

  const sorted = useMemo(() => {
    return [...fahrzeuge].sort((a, b) => a.kennzeichen.localeCompare(b.kennzeichen, "de"));
  }, [fahrzeuge]);

  if (sorted.length === 0) {
    return (
      <article className="card">
        <p style={{ margin: 0, color: "#6b7280" }}>
          Keine Treffer. Kennzeichen, Marke oder Kunde anpassen.
        </p>
      </article>
    );
  }

  return (
    <article className="card machineResultCard">
      <div className="machineResultList">
        {sorted.map((fz) => {
          const kundeLabel = fz.kunde != null ? formatKundeName(fz.kunde) : "Firmenfahrzeug";
          const reifenSaetze = getPkwReifenSaetze(fz);
          const reifenKurz =
            reifenSaetze.length > 0
              ? reifenSaetze.map((satz) => formatPkwReifenSatzKurz(satz)).filter(Boolean).join(" · ")
              : null;

          return (
            <button
              key={fz.id}
              type="button"
              className="machineResultRow"
              onClick={() => router.push(`/pkw/fahrzeuge/${fz.id}`)}
            >
              <PkwStatusIndicators
                fahrzeug={fz}
                buchungenByFahrzeug={buchungenByFahrzeug}
                className="machineResultStatus"
                fixedSlots
              />

              <span className="machineThumb" aria-label="Bild">
                {fz.bild ? <img src={fz.bild} alt="" /> : <span>Bild</span>}
              </span>

              <span className="machineResultMain">
                <Field label="Kennzeichen" value={fz.kennzeichen} strong />
                <Field
                  label="Marke / Modell"
                  value={[fz.marke, fz.modell].filter(Boolean).join(" ")}
                  strong
                />
                <Field label="FIN" value={fz.fin} className="machineResultDetail" />
              </span>

              <span className="machineResultMeta">
                <Field label="PKW-Gruppe" value={fz.gruppe} />
                <Field label="§57a gültig bis" value={formatGermanDate(fz.paragraf_57a_gultig_bis)} />
                <Field label="Kunde" value={kundeLabel} />
              </span>

              <span className="machineResultMeta">
                <Field
                  label="Km-Stand"
                  value={fz.km_stand != null ? `${fz.km_stand} km` : null}
                />
                <Field label="Kraftstoff" value={fz.kraftstoff} />
                <Field label="Reifen" value={reifenKurz} className="machineResultDetail" />
              </span>
            </button>
          );
        })}
      </div>
    </article>
  );
}
