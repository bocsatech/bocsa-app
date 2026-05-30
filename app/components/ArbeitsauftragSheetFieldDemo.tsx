"use client";

/**
 * Statisches Layout-Demo — entspricht der Referenz (enge Label/Wert-Spalten).
 * Route: /arbeitsauftrag/sheet-demo
 */
export default function ArbeitsauftragSheetFieldDemo() {
  const rows: Array<{
    label: string;
    value: string;
    valueClass?: string;
  }> = [
    {
      label: "Gerätenummer",
      value: "GE 000029 — Bomag BRP 50 Stampfer",
      valueClass: "aaSheetFieldValueHero",
    },
    { label: "Gerättyp", value: "Kleingerät", valueClass: "aaSheetFieldValueMuted" },
    { label: "Seriennummer", value: "123456789" },
    { label: "Depot", value: "Schwehat" },
    { label: "Baujahr", value: "2020" },
    { label: "Stundenzählerstand", value: "100" },
    { label: "Elektro ÖVE E8701/E8001 gültig bis", value: "18.05.2026" },
    { label: "Intern §8/11 gültig bis", value: "27.05.2026" },
    { label: "Letztes Service am", value: "01.01.2026" },
    { label: "Gerätstatus", value: "Fertig", valueClass: "aaSheetFieldValueOk" },
    {
      label: "Meldung",
      value: "Meldung vorhanden",
      valueClass: "aaSheetFieldValueDanger",
    },
  ];

  return (
    <div className="aaSheetDemoCard card">
      <p className="aaSheetDemoHint">
        Layout-Demo — enge Spalten, eine Zeile pro Feld (Referenz)
      </p>
      <table className="aaSheetFieldTable" role="presentation">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="aaSheetFieldRow">
              <th className="aaSheetFieldLabel" scope="row">
                {row.label}
              </th>
              <td className={`aaSheetFieldValue ${row.valueClass ?? ""}`.trim()}>
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
