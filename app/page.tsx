"use client";


<button
  onClick={() => {
    document.cookie =
      'bocsa_logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;'

    localStorage.removeItem('bocsa_user')

    window.location.href = '/login'
  }}
  style={{
    background: '#9a3f00',
    color: 'white',
    border: 'none',
    padding: '10px 18px',
    borderRadius: 10,
    fontWeight: 700,
    cursor: 'pointer'
  }}
>
  Abmelden
</button>





import { useState } from "react";
import { supabase } from "@/lib/supabase";

const checklist = {
  Servicematerial: [
    "Motorölfilter",
    "Kraftstofffilter",
    "Luftfilter außen",
    "Luftfilter innen",
    "Hydraulikfilter Rücklauf",
    "Hydraulikfilter Vorlauf",
    "Hydraulikfilter Verdichter",
    "Ölseparator / Feinabscheider",
    "Service & Wartung durchgeführt",
    "Prüfungsaktualisierung",
  ],
  Checkliste: [
    "Motorölstand kontrolliert",
    "Hydraulikölstand kontrolliert",
    "Bremsfunktion kontrolliert",
    "Kühlflüssigkeit kontrolliert",
    "Beleuchtung kontrolliert",
    "Reifendruck kontrolliert",
    "Maschine abgeschmiert",
    "Alle Filter kontrolliert",
    "Check und Funktionskontrolle",
  ],
  "Fenster & Türen": [
    "Frontscheibe oben",
    "Frontscheibe unten",
    "Türscheibe oben",
    "Türscheibe unten",
    "Heckscheibe",
    "Fahrertür komplett",
    "Kabinenfenster rechts",
    "Dachscheibe",
    "Gummiketten",
    "Reifen-Dichtmittel eingefüllt",
  ],
  "Diverse Ersatzteile": [
    "Arbeitsscheinwerfer Kabine",
    "Arbeitsscheinwerfer Arm",
    "Starter erneuert",
    "Lichtmaschine erneuert",
    "Kraftstoff Förderpumpe",
    "Kraftstoff Einspritzpumpe",
    "Spiegel / Drehlicht / SW-Stange",
    "Hydraulikzylinder",
    "Hydraulikschlauch",
    "Batterie getauscht",
  ],
};

export default function ServicePage() {
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const [form, setForm] = useState({
    protokoll_typ: "Check",
    techniker: "Borsos",
    maschine_nummer: "",
    maschine_type: "",
    serialnummer: "",
    baujahr: "",
    geraet_type: "",
    filiale: "Wien",
    stundenzaehlerstand: "",
    elektro_ove_gueltig_bis: "",
    intern_8_11_gueltig_bis: "",
    paragraf_57_gueltig_bis: "",
    kennzeichen: "",
    std_zaehler_getauscht_am: "",
    stundenzaehler_alt: "",
    letztes_service_am: "",
    frostschutz_geprueft_am: "",
    geraete_status: "Verfügbar",
    arbeitsstunden: "",
    beschreibung: "",
  });

  function updateField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleChecklist(item: string) {
    setSelected((prev) => {
      const updated = prev.includes(item)
        ? prev.filter((x) => x !== item)
        : [...prev, item];

      setForm((old) => ({
        ...old,
        beschreibung: updated.join(", "),
      }));

      return updated;
    });
  }

  async function speichern() {
    setSaving(true);

    const payload = {
      ...form,
      ausgewaehlte_punkte: selected,
      elektro_ove_gueltig_bis: form.elektro_ove_gueltig_bis || null,
      intern_8_11_gueltig_bis: form.intern_8_11_gueltig_bis || null,
      paragraf_57_gueltig_bis: form.paragraf_57_gueltig_bis || null,
      std_zaehler_getauscht_am: form.std_zaehler_getauscht_am || null,
      letztes_service_am: form.letztes_service_am || null,
      frostschutz_geprueft_am: form.frostschutz_geprueft_am || null,
    };

    const { error } = await supabase.from("service_orders").insert(payload);

    setSaving(false);

    if (error) {
      alert("Fehler: " + error.message);
      console.error(error);
      return;
    }

    alert("Serviceprotokoll gespeichert!");
  }

  const labelStyle = {
    color: "#000",
    fontWeight: 700,
    fontSize: 13,
    marginBottom: 4,
    display: "block",
  };

  const inputStyle = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid #aaa",
    fontSize: 14,
    color: "#000",
    background: "#fff",
    boxSizing: "border-box" as const,
  };

  function Field({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) {
    return (
      <div>
        <label style={labelStyle}>{label}</label>
        {children}
      </div>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "#f5f6f8",
        fontFamily: "Arial",
        color: "#000",
      }}
    >
      <aside
        style={{
          width: 230,
          background: "linear-gradient(180deg,#ff7a00,#ff4d00)",
          color: "white",
          padding: 24,
        }}
      >
        <h1 style={{ marginBottom: 35 }}>BOCSA TECH</h1>

        {[
          "Dashboard",
          "Maschinen",
          "Arbeitsaufträge",
          "Kalender",
          "Lager",
          "Kunden",
          "Berichte",
          "Einstellungen",
        ].map((item) => (
          <div
            key={item}
            style={{
              padding: 12,
              marginBottom: 10,
              borderRadius: 10,
              background:
                item === "Arbeitsaufträge"
                  ? "rgba(255,255,255,.25)"
                  : "transparent",
              color: "white",
            }}
          >
            {item}
          </div>
        ))}
      </aside>

      <section style={{ flex: 1, padding: 28 }}>
        <div
          style={{
            background: "white",
            borderRadius: 22,
            padding: 26,
          }}
        >
          <h1
            style={{
              letterSpacing: 6,
              color: "#6b1d1d",
              marginBottom: 24,
            }}
          >
            Reparaturdaten
          </h1>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 14,
            }}
          >
            <Field label="Protokoll Typ">
              <select
                style={inputStyle}
                value={form.protokoll_typ}
                onChange={(e) => updateField("protokoll_typ", e.target.value)}
              >
                <option>Check</option>
                <option>Service</option>
                <option>Reparatur</option>
              </select>
            </Field>

            <Field label="Techniker">
              <input
                style={inputStyle}
                value={form.techniker}
                onChange={(e) => updateField("techniker", e.target.value)}
              />
            </Field>

            <Field label="Filiale">
              <select
                style={inputStyle}
                value={form.filiale}
                onChange={(e) => updateField("filiale", e.target.value)}
              >
                <option>Wien</option>
                <option>Graz</option>
                <option>Horn</option>
                <option>Schwechat</option>
              </select>
            </Field>

            <Field label="Maschine Nummer">
              <input readOnly style={inputStyle} value={form.maschine_nummer} />
            </Field>

            <Field label="Maschine Type">
              <input readOnly style={inputStyle} value={form.maschine_type} />
            </Field>

            <Field label="Serialnummer">
              <input readOnly style={inputStyle} value={form.serialnummer} />
            </Field>

            <Field label="Baujahr">
              <input readOnly style={inputStyle} value={form.baujahr} />
            </Field>

            <Field label="Gerät Type">
              <input readOnly style={inputStyle} value={form.geraet_type} />
            </Field>

            <Field label="Kennzeichen">
              <input readOnly style={inputStyle} value={form.kennzeichen} />
            </Field>

            <Field label="Stundenzählerstand">
              <input
                style={inputStyle}
                value={form.stundenzaehlerstand}
                onChange={(e) =>
                  updateField("stundenzaehlerstand", e.target.value)
                }
              />
            </Field>

            <Field label="Elektro ÖVE gültig bis">
              <input
                type="date"
                style={inputStyle}
                value={form.elektro_ove_gueltig_bis}
                onChange={(e) =>
                  updateField("elektro_ove_gueltig_bis", e.target.value)
                }
              />
            </Field>

            <Field label="Intern §8/11 gültig bis">
              <input
                type="date"
                style={inputStyle}
                value={form.intern_8_11_gueltig_bis}
                onChange={(e) =>
                  updateField("intern_8_11_gueltig_bis", e.target.value)
                }
              />
            </Field>

            <Field label="§57 gültig bis">
              <input
                type="date"
                style={inputStyle}
                value={form.paragraf_57_gueltig_bis}
                onChange={(e) =>
                  updateField("paragraf_57_gueltig_bis", e.target.value)
                }
              />
            </Field>

            <Field label="Std. Zähler getauscht am">
              <input
                type="date"
                style={inputStyle}
                value={form.std_zaehler_getauscht_am}
                onChange={(e) =>
                  updateField("std_zaehler_getauscht_am", e.target.value)
                }
              />
            </Field>

            <Field label="Stundenzähler alt">
              <input
                style={inputStyle}
                value={form.stundenzaehler_alt}
                onChange={(e) =>
                  updateField("stundenzaehler_alt", e.target.value)
                }
              />
            </Field>

            <Field label="Letztes Service am">
              <input
                type="date"
                style={inputStyle}
                value={form.letztes_service_am}
                onChange={(e) =>
                  updateField("letztes_service_am", e.target.value)
                }
              />
            </Field>

            <Field label="Frostschutz geprüft am">
              <input
                type="date"
                style={inputStyle}
                value={form.frostschutz_geprueft_am}
                onChange={(e) =>
                  updateField("frostschutz_geprueft_am", e.target.value)
                }
              />
            </Field>

            <Field label="Arbeitsstunden">
              <input
                type="number"
                min="0"
                step="0.25"
                style={inputStyle}
                value={form.arbeitsstunden}
                onChange={(e) =>
                  updateField("arbeitsstunden", e.target.value)
                }
              />
            </Field>
          </div>

          <div style={{ marginTop: 24 }}>
            <label style={labelStyle}>Geräte Status</label>

            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              {["Verfügbar", "In Reparatur"].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => updateField("geraete_status", status)}
                  style={{
                    padding: "9px 18px",
                    borderRadius: 10,
                    border: "none",
                    color: "white",
                    cursor: "pointer",
                    opacity: form.geraete_status === status ? 1 : 0.35,
                    background: status === "Verfügbar" ? "green" : "red",
                  }}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: 22,
              marginTop: 32,
            }}
          >
            {Object.entries(checklist).map(([group, items]) => (
              <div key={group}>
                <h2 style={{ color: "#2c1790", fontSize: 20 }}>{group}:</h2>

                {items.map((item) => (
                  <label
                    key={item}
                    style={{
                      display: "block",
                      marginBottom: 8,
                      fontSize: 15,
                      color: "#000",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(item)}
                      onChange={() => toggleChecklist(item)}
                      style={{ marginRight: 8 }}
                    />
                    {item}
                  </label>
                ))}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 28 }}>
            <label style={labelStyle}>Reparaturbeschreibung</label>

            <textarea
              style={{
                ...inputStyle,
                minHeight: 120,
              }}
              value={form.beschreibung}
              onChange={(e) => updateField("beschreibung", e.target.value)}
            />
          </div>

          <button
            type="button"
            onClick={speichern}
            disabled={saving}
            style={{
              marginTop: 24,
              background: "#ff5e00",
              color: "white",
              border: "none",
              padding: "14px 34px",
              borderRadius: 14,
              fontSize: 17,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {saving ? "Speichern..." : "Speichern"}
          </button>
        </div>
      </section>
    </main>
  );
}
