"use client";

import type { FirmaData } from "../../lib/firma";
import type { Rechnung, RechnungPosition } from "../../lib/types/rechnung";
import {
  formatEuro,
  formatKundeAddress,
  formatKundeLabel,
  formatRechnungDate,
} from "../../lib/rechnung";

type Props = {
  rechnung: Rechnung;
  firma: FirmaData;
};

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rechnungPrintMetaRow">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PositionRow({ row }: { row: RechnungPosition }) {
  if (row.pos_typ === "titel") {
    return (
      <tr className="rechnungPrintRowTitle">
        <td colSpan={7}>{row.bezeichnung}</td>
      </tr>
    );
  }

  return (
    <tr>
      <td>{row.position_nr || "—"}</td>
      <td>{row.menge}</td>
      <td>{row.einheit}</td>
      <td>{row.bezeichnung}</td>
      <td className="rechnungPrintNum">{formatEuro(row.einzelpreis_netto)}</td>
      <td className="rechnungPrintNum">{row.rabatt_prozent ? `${row.rabatt_prozent}%` : ""}</td>
      <td className="rechnungPrintNum">{formatEuro(row.positionspreis_netto)}</td>
    </tr>
  );
}

export default function RechnungPrintDocument({ rechnung, firma }: Props) {
  const kundeLines = formatKundeAddress(rechnung.kunde_snapshot);
  const fahrzeug = rechnung.fahrzeug_snapshot;

  return (
    <article className="rechnungPrintDocument">
      <header className="rechnungPrintHeader">
        <div>
          <h1>{firma.name || "Firma"}</h1>
          <p>
            {[firma.street, [firma.postalCode, firma.city].filter(Boolean).join(" ")]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <p>
            {[firma.contactPhone, firma.email, firma.website].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="rechnungPrintMetaBox">
          <MetaRow label="Datum" value={formatRechnungDate(rechnung.belegdatum)} />
          <MetaRow label="Re-Nr." value={rechnung.rechnungs_nr} />
          <MetaRow
            label="Kunden-Nr."
            value={rechnung.kunde_snapshot.kundennummer?.trim() || "—"}
          />
          <MetaRow label="UID" value={rechnung.kunde_snapshot.uid_nr?.trim() || "—"} />
          <MetaRow label="Fällig" value={formatRechnungDate(rechnung.faelligkeitsdatum)} />
          <MetaRow label="Bearbeiter" value={rechnung.bearbeiter?.trim() || "—"} />
        </div>
      </header>

      <section className="rechnungPrintAddresses">
        <div>
          <p className="rechnungPrintLabel">Rechnungsadresse</p>
          {kundeLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </section>

      <h2 className="rechnungPrintTitle">Rechnung-Nr.: {rechnung.rechnungs_nr}</h2>
      <p className="rechnungPrintLead">Vielen Dank für Ihren Auftrag!</p>

      {fahrzeug ? (
        <section className="rechnungPrintVehicle">
          <div>
            <span>Kennzeichen</span>
            <strong>{fahrzeug.kennzeichen || "—"}</strong>
          </div>
          <div>
            <span>Fahrzeug</span>
            <strong>{[fahrzeug.marke, fahrzeug.modell].filter(Boolean).join(" ") || "—"}</strong>
          </div>
          <div>
            <span>FIN</span>
            <strong>{fahrzeug.fin || "—"}</strong>
          </div>
          <div>
            <span>km-Stand</span>
            <strong>{fahrzeug.km_stand ?? "—"}</strong>
          </div>
          <div>
            <span>HU</span>
            <strong>{fahrzeug.paragraf_57a_gultig_bis || "—"}</strong>
          </div>
        </section>
      ) : null}

      <table className="rechnungPrintTable">
        <thead>
          <tr>
            <th>Pos.</th>
            <th>Menge</th>
            <th>Einh.</th>
            <th>Bezeichnung</th>
            <th>Einzel</th>
            <th>Rab.</th>
            <th>Netto</th>
          </tr>
        </thead>
        <tbody>
          {(rechnung.positionen ?? []).map((row) => (
            <PositionRow key={row.id} row={row} />
          ))}
        </tbody>
      </table>

      <div className="rechnungPrintTotals">
        <div>
          <span>Zwischensumme</span>
          <strong>{formatEuro(rechnung.zwischensumme_netto)}</strong>
        </div>
        {rechnung.abzug > 0 ? (
          <div>
            <span>Abzug</span>
            <strong>-{formatEuro(rechnung.abzug)}</strong>
          </div>
        ) : null}
        {rechnung.mwst_modus === "zuzueglich" ? (
          <>
            {rechnung.ust_19 > 0 ? (
              <div>
                <span>USt 19%</span>
                <strong>{formatEuro(rechnung.ust_19)}</strong>
              </div>
            ) : null}
            {rechnung.ust_7 > 0 ? (
              <div>
                <span>USt 7%</span>
                <strong>{formatEuro(rechnung.ust_7)}</strong>
              </div>
            ) : null}
          </>
        ) : null}
        <div className="rechnungPrintTotalFinal">
          <span>Rechnungsbetrag</span>
          <strong>{formatEuro(rechnung.rechnungsbetrag)}</strong>
        </div>
      </div>

      {rechnung.leistungsdatum ? (
        <p className="rechnungPrintNote">
          Die Ausführung der berechneten Leistungen erfolgte am{" "}
          {formatRechnungDate(rechnung.leistungsdatum)}.
        </p>
      ) : null}

      {rechnung.footer_hinweis ? (
        <p className="rechnungPrintNote rechnungPrintNoteStrong">{rechnung.footer_hinweis}</p>
      ) : null}

      {rechnung.zahlungshinweis ? (
        <p className="rechnungPrintNote">{rechnung.zahlungshinweis}</p>
      ) : (
        <p className="rechnungPrintNote">
          Zahlbar innerhalb der Frist auf {firma.iban || "—"} · Verwendungszweck:{" "}
          {rechnung.rechnungs_nr}
        </p>
      )}

      <p className="rechnungPrintClosing">Mit freundlichen Grüßen</p>
      <p>{formatKundeLabel(rechnung.kunde_snapshot) !== "—" ? firma.name : firma.name}</p>

      <footer className="rechnungPrintFooter">
        <span>
          {[firma.name, firma.street, firma.postalCode, firma.city].filter(Boolean).join(" · ")}
        </span>
        <span>
          {[firma.bankName, firma.iban, firma.bic].filter(Boolean).join(" · ")}
        </span>
        <span>
          {[firma.taxNumber && `St-Nr. ${firma.taxNumber}`, firma.companyRegisterNumber]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </footer>
    </article>
  );
}
