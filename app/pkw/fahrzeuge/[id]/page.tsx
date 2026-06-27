"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import AppPageShell from "../../../components/AppPageShell";
import MaintenanceLagerParts from "../../../components/MaintenanceLagerParts";
import PkwBuchungenTable from "../../../components/PkwBuchungenTable";
import PkwFahrzeugLocalhostSectionPanels, {
  createEmptyPkwDocumentationData,
} from "../../../components/PkwFahrzeugLocalhostSectionPanels";
import PkwReifenEditor from "../../../components/PkwReifenEditor";
import PkwStammdatenPanelContent from "../../../components/PkwStammdatenPanelContent";
import { PKW_STAMMDATEN_STATUS_KEY } from "../../../../lib/pkw-stammdaten";
import { formatGermanDate } from "../../../../lib/dates";
import { getPkwErsatzteile, serializePkwErsatzteile } from "../../../../lib/pkw-ersatzteile";
import { getPkwReifenSaetze, serializePkwReifenSaetze } from "../../../../lib/pkw-reifen";
import {
  confirmDeletePkwFahrzeug,
  deletePkwFahrzeug,
  FAHRZEUG_FORM_SECTIONS,
  fetchKunden,
  fetchPkwFahrzeugBuchungen,
  fetchPkwFahrzeugById,
  fetchPkwGruppeVorlage,
  fetchPkwServicearten,
  formatKundeName,
  getPkwPortalBuchungsUrl,
  savePkwFahrzeug,
} from "../../../../lib/pkw";
import PkwWorkOrdersTable from "../../../components/PkwWorkOrdersTable";
import { buildPkwArbeitsauftragDetailHref } from "../../../../lib/pkw-arbeitsauftrag-routes";
import { getPkwWorkOrders } from "../../../../lib/pkw-work-orders";
import type { Kunde, PkwBuchung, PkwFahrzeug, PkwReifenSatz } from "../../../../lib/types/pkw";
import { hasPkwKundenRead, hasPkwKundenWrite } from "../../../../lib/pkw-permissions";
import type { MaintenanceLagerLink } from "../../../../lib/types/maintenance";
import { hasExtendedAppFeatures } from "../../../../lib/local-host";
import {
  buildPkwFahrzeugTabHref,
  isPkwFahrzeugLocalhostSection,
  PKW_FAHRZEUG_LOCALHOST_SECTIONS,
  readPkwFahrzeugTabParam,
  type PkwFahrzeugLocalhostSection,
} from "../../../../lib/pkw-fahrzeug-tabs";
import {
  INITIAL_MOTOR_DATA,
  INITIAL_TECHNICAL_DATA,
  objectFromTabData,
  type DocumentationFormData,
  type MotorFormData,
  type TechnicalFormData,
} from "../../../../lib/machine-tab-forms";

const ARBEITSAUFTRAG_TYPES = ["Service", "Check", "Reparatur"] as const;

const BASE_TABS = [
  "Stammdaten",
  "Bild & QR",
  "Ersatzteile",
  "Reifen & Einlagerung",
  "Sonstiges",
] as const;

const LOCALHOST_BASE_TABS = [
  "Stammdaten",
  "Bild & QR",
  "Reifen & Einlagerung",
  "Sonstiges",
] as const;

type BaseTab = (typeof BASE_TABS)[number];

function PkwFahrzeugDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fahrzeugId = params.id as string;
  const isLocalhost = hasExtendedAppFeatures();
  const urlTab = isLocalhost ? readPkwFahrzeugTabParam(searchParams) : null;
  const localhostSection = isPkwFahrzeugLocalhostSection(urlTab) ? urlTab : null;
  const tabs = isLocalhost ? LOCALHOST_BASE_TABS : BASE_TABS;

  const [fahrzeug, setFahrzeug] = useState<PkwFahrzeug | null>(null);
  const [kunden, setKunden] = useState<Kunde[]>([]);
  const [buchungen, setBuchungen] = useState<PkwBuchung[]>([]);
  const [serviceLabels, setServiceLabels] = useState<Record<string, string>>({});
  const [form, setForm] = useState<Record<string, string>>({});
  const [reifenSaetze, setReifenSaetze] = useState<PkwReifenSatz[]>([]);
  const [ersatzteile, setErsatzteile] = useState<MaintenanceLagerLink[]>([]);
  const [motorData, setMotorData] = useState<MotorFormData>({ ...INITIAL_MOTOR_DATA });
  const [technicalData, setTechnicalData] = useState<TechnicalFormData>({ ...INITIAL_TECHNICAL_DATA });
  const [documentationData, setDocumentationData] = useState<DocumentationFormData>(
    createEmptyPkwDocumentationData()
  );
  const [kundeId, setKundeId] = useState("");
  const [activeTab, setActiveTab] = useState<BaseTab>("Stammdaten");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [copyHint, setCopyHint] = useState<string | null>(null);
  const [canRead, setCanRead] = useState(false);
  const [canWrite, setCanWrite] = useState(false);
  const sessionAuth = useMemo(
    () => ({
      permissions: canWrite ? ["pkw.kunden.write"] : canRead ? ["pkw.kunden.read"] : [],
      groups: [] as string[],
      username: undefined as string | undefined,
    }),
    [canRead, canWrite]
  );

  const fahrzeugFields =
    FAHRZEUG_FORM_SECTIONS.find((s) => s.title === "Fahrzeugdaten")?.fields ?? [];
  const sonstigesFields =
    FAHRZEUG_FORM_SECTIONS.find((s) => s.title === "Sonstiges")?.fields ?? [];

  const portalUrl = useMemo(
    () => (fahrzeug?.qr_token ? getPkwPortalBuchungsUrl(fahrzeug.qr_token) : ""),
    [fahrzeug?.qr_token]
  );

  const qrImageUrl = fahrzeug?.id
    ? `/api/pkw/fahrzeuge/${fahrzeug.id}/qr?ts=${fahrzeug.updated_at ?? ""}`
    : null;

  const kundeDisplay = useMemo(() => {
    if (fahrzeug?.kunde) return formatKundeName(fahrzeug.kunde);
    const selected = kunden.find((k) => k.id === kundeId);
    if (selected) return formatKundeName(selected);
    return "Firmenfahrzeug";
  }, [fahrzeug?.kunde, kunden, kundeId]);

  const applyFahrzeug = useCallback((source: PkwFahrzeug) => {
    setFahrzeug(source);
    const initial: Record<string, string> = {};
    for (const section of FAHRZEUG_FORM_SECTIONS) {
      for (const field of section.fields) {
        const { key, type } = field;
        const v = source[key];
        initial[key] = v != null ? (type === "date" ? formatGermanDate(v) : String(v)) : "";
      }
    }
    setForm({
      ...initial,
      [PKW_STAMMDATEN_STATUS_KEY]: source.aktiv !== false ? "aktiv" : "inaktiv",
    });
    setReifenSaetze(getPkwReifenSaetze(source));
    setErsatzteile(getPkwErsatzteile(source));
    setKundeId(source.kunde_id ?? "");
    const tabData =
      source.tab_data && typeof source.tab_data === "object" ? source.tab_data : undefined;
    setMotorData(objectFromTabData(tabData, "motor", INITIAL_MOTOR_DATA));
    setTechnicalData(objectFromTabData(tabData, "technical", INITIAL_TECHNICAL_DATA));
    setDocumentationData(objectFromTabData(tabData, "documentation", createEmptyPkwDocumentationData()));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const [fRes, bRes, kRes, sRes] = await Promise.all([
      fetchPkwFahrzeugById(fahrzeugId),
      fetchPkwFahrzeugBuchungen(fahrzeugId),
      fetchKunden(),
      fetchPkwServicearten(),
    ]);

    if (fRes.error || !fRes.data) {
      setLoadError(fRes.error ?? "Fahrzeug nicht gefunden.");
      setFahrzeug(null);
    } else {
      applyFahrzeug(fRes.data);
    }

    setBuchungen(bRes.data ?? []);
    if (!kRes.error) setKunden(kRes.data ?? []);
    if (sRes.data) {
      const map: Record<string, string> = {};
      for (const entry of sRes.data) map[entry.key] = entry.label;
      setServiceLabels(map);
    }
    setLoading(false);
  }, [applyFahrzeug, fahrzeugId]);

  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((result) => {
        const perms = result.permissions ?? [];
        const groups = result.groups ?? [];
        const username = result.username ?? result.user?.username;
        setCanRead(hasPkwKundenRead(perms, groups, username));
        setCanWrite(hasPkwKundenWrite(perms, groups, username));
      });
  }, []);

  useEffect(() => {
    if (canRead) void load();
    else setLoading(false);
  }, [canRead, load]);

  function update(key: string, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function buildTabDataPatch() {
    const existing =
      fahrzeug?.tab_data && typeof fahrzeug.tab_data === "object" ? fahrzeug.tab_data : {};
    return {
      ...existing,
      motor: motorData,
      technical: technicalData,
      documentation: documentationData,
    };
  }

  function selectBaseTab(tab: BaseTab) {
    setActiveTab(tab);
    if (isLocalhost && urlTab) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("tab");
      const query = params.toString();
      router.replace(query ? `/pkw/fahrzeuge/${fahrzeugId}?${query}` : `/pkw/fahrzeuge/${fahrzeugId}`);
    }
  }

  function selectLocalhostSection(section: PkwFahrzeugLocalhostSection) {
    router.replace(buildPkwFahrzeugTabHref(`/pkw/fahrzeuge/${fahrzeugId}`, section));
  }

  async function handleSave() {
    if (!canWrite) {
      setSaveError("Keine Berechtigung: pkw.kunden.write");
      return;
    }

    setSaving(true);
    setSaveError(null);
    setMessage(null);

    const { [PKW_STAMMDATEN_STATUS_KEY]: aktivForm, ...formFields } = form;
    const payload = {
      ...formFields,
      aktiv: aktivForm !== "inaktiv",
      kunde_id: kundeId || null,
      km_stand: form.km_stand ? Number(form.km_stand) : null,
      leistung_kw: form.leistung_kw ? Number(form.leistung_kw) : null,
      reifen: serializePkwReifenSaetze(reifenSaetze),
      ersatzteile: serializePkwErsatzteile(ersatzteile),
      tab_data: buildTabDataPatch(),
    };

    const { data, error } = await savePkwFahrzeug(payload, fahrzeugId);
    setSaving(false);

    if (error || !data) {
      setSaveError(error ?? "Speichern fehlgeschlagen.");
      return;
    }

    applyFahrzeug(data);
    setMessage("Fahrzeug gespeichert.");
    setIsEditing(false);
  }

  async function handleDelete() {
    if (!fahrzeug || !confirmDeletePkwFahrzeug(fahrzeug.kennzeichen)) return;
    setDeleting(true);
    const { error } = await deletePkwFahrzeug(fahrzeug.id);
    setDeleting(false);
    if (error) {
      setSaveError(error);
      return;
    }
    router.push("/pkw/fahrzeuge");
  }

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !fahrzeug?.id) return;

    setUploadingImage(true);
    setSaveError(null);
    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(`/api/pkw/fahrzeuge/${fahrzeug.id}/image`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });
    const result = await response.json().catch(() => ({}));
    setUploadingImage(false);

    if (!response.ok) {
      setSaveError(result.error ?? "Bild konnte nicht hochgeladen werden.");
      return;
    }

    applyFahrzeug(result as PkwFahrzeug);
    setMessage("Fahrzeugbild gespeichert.");
  }

  async function loadGruppenVorlage() {
    const gruppe = form.gruppe?.trim();
    if (!gruppe) {
      setSaveError("Zuerst PKW-Gruppe in Stammdaten eintragen.");
      return;
    }
    const { data, error } = await fetchPkwGruppeVorlage(gruppe);
    if (error) {
      setSaveError(error);
      return;
    }
    setErsatzteile(getPkwErsatzteile({ ersatzteile: data?.ersatzteile ?? [] } as PkwFahrzeug));
    setMessage(`Ersatzteile aus Gruppe „${gruppe}" geladen.`);
  }

  async function copyPortalLink() {
    if (!portalUrl) return;
    try {
      await navigator.clipboard.writeText(portalUrl);
      setCopyHint("Link kopiert.");
    } catch {
      setCopyHint("Kopieren fehlgeschlagen.");
    }
  }

  if (!canRead && !loading) {
    return (
      <AppPageShell activeHref="/pkw/fahrzeuge" subtitle="PKW">
        <p className="errorText">Keine Berechtigung: pkw.kunden.read</p>
      </AppPageShell>
    );
  }

  return (
    <AppPageShell
      activeHref="/pkw/fahrzeuge"
      subtitle="PKW"
      contentClassName="machineDetailPage"
      top={
        !loading && fahrzeug ? (
          <div className="detailTopBar">
            <h1>PKW-Daten</h1>
            <div className="detailTopActions">
              <Link className="pillButton outline" href="/pkw/fahrzeuge">
                Zur Fahrzeugliste
              </Link>
              <label className="workStatusSelect workStatusSelectCompact">
                <span>Arbeitsauftrag</span>
                <select
                  defaultValue=""
                  aria-label="Arbeitsauftrag: Service, Check oder Reparatur"
                  onChange={(event) => {
                    const value = event.target.value;
                    if (
                      value === "Service" ||
                      value === "Check" ||
                      value === "Reparatur"
                    ) {
                      router.push(
                        buildPkwArbeitsauftragDetailHref({
                          fahrzeugId,
                          status: value,
                        })
                      );
                      event.target.value = "";
                    }
                  }}
                >
                  <option value="" disabled>
                    — wählen —
                  </option>
                  {ARBEITSAUFTRAG_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="pillButton outline"
                onClick={() => setIsEditing((value) => !value)}
                disabled={!canWrite}
              >
                {isEditing ? "Bearbeitung beenden" : "Bearbeiten"}
              </button>
              <button
                type="button"
                className="pillButton primary"
                onClick={() => void handleSave()}
                disabled={saving || deleting || !canWrite}
              >
                {saving ? "Speichern…" : "Speichern"}
              </button>
              {canWrite ? (
                <button
                  type="button"
                  className="pillButton outline linkBtnDanger"
                  onClick={() => void handleDelete()}
                  disabled={saving || deleting}
                >
                  {deleting ? "Löschen…" : "Fahrzeug löschen"}
                </button>
              ) : null}
            </div>
          </div>
        ) : undefined
      }
    >
      {loading ? (
        <div className="welcomeCard">
          <h1>Fahrzeug wird geladen…</h1>
        </div>
      ) : loadError || !fahrzeug ? (
        <div className="welcomeCard">
          <h1>Fahrzeug nicht gefunden</h1>
          <p>{loadError ?? "Dieses Fahrzeug ist nicht vorhanden."}</p>
          <Link className="backButton" href="/pkw/fahrzeuge">
            ← Zur Liste
          </Link>
        </div>
      ) : (
        <div className="machineDetailBody" data-pkw-detail-layout="maschinen-stammdaten">
          {isLocalhost && localhostSection ? (
            <div className="tabSection">
              <div className="pkwFahrzeugTabLayout">
                <nav className="pkwFahrzeugSideNav" aria-label="Fahrzeug-Bereiche">
                  {PKW_FAHRZEUG_LOCALHOST_SECTIONS.map((section) => (
                    <Link
                      key={section}
                      href={buildPkwFahrzeugTabHref(`/pkw/fahrzeuge/${fahrzeugId}`, section)}
                      className={localhostSection === section ? "active" : undefined}
                      onClick={(event) => {
                        event.preventDefault();
                        selectLocalhostSection(section);
                      }}
                    >
                      {section}
                    </Link>
                  ))}
                </nav>
                <div className={`pkwFahrzeugTabContent tabPanel ${isEditing ? "" : "readOnlyPanel"}`}>
                  <h2>{localhostSection}</h2>
                  <PkwFahrzeugLocalhostSectionPanels
                    section={localhostSection}
                    isEditing={isEditing}
                    canWrite={canWrite}
                    sessionAuth={sessionAuth}
                    motorData={motorData}
                    setMotorData={setMotorData}
                    technicalData={technicalData}
                    setTechnicalData={setTechnicalData}
                    documentationData={documentationData}
                    setDocumentationData={setDocumentationData}
                    ersatzteile={ersatzteile}
                    setErsatzteile={setErsatzteile}
                    onLoadGruppenVorlage={() => void loadGruppenVorlage()}
                    gruppenHref="/pkw/gruppen"
                  />
                </div>
              </div>
            </div>
          ) : null}

          <div className="tabSection">
            <div className="tabList">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`tabButton ${!localhostSection && activeTab === tab ? "active" : ""}`}
                  onClick={() => selectBaseTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            {!localhostSection ? (
            <div className={`tabPanel ${isEditing ? "" : "readOnlyPanel"}`}>
              {activeTab !== "Stammdaten" ? <h2>{activeTab}</h2> : null}
              {activeTab === "Stammdaten" ? (
                <PkwStammdatenPanelContent
                  fields={fahrzeugFields}
                  form={form}
                  isEditing={isEditing}
                  canWrite={canWrite}
                  kundeId={kundeId}
                  kunden={kunden}
                  kundeDisplay={kundeDisplay}
                  aktiv={
                    isEditing
                      ? (form[PKW_STAMMDATEN_STATUS_KEY] ?? "aktiv") !== "inaktiv"
                      : fahrzeug.aktiv !== false
                  }
                  bild={fahrzeug.bild}
                  qrImageUrl={qrImageUrl}
                  kennzeichen={fahrzeug.kennzeichen}
                  onUpdate={update}
                  onKundeChange={setKundeId}
                  saveError={saveError}
                  mediaFooter={
                    isEditing && canWrite ? (
                      <label className="pillButton outline machineImageUploadInline">
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleImageUpload}
                          disabled={uploadingImage}
                        />
                        {uploadingImage ? "Wird hochgeladen…" : "Bild ändern"}
                      </label>
                    ) : null
                  }
                />
              ) : null}

              {activeTab === "Bild & QR" ? (
                <section className="pkwBildQrPanel">
                  <div className="pkwBildBlock card">
                    <h3 className="pkwPanelTitle">Fahrzeugbild</h3>
                    <div className="pkwBildRow">
                      <div className={`pkwBildPreview ${fahrzeug.bild ? "hasImage" : ""}`}>
                        {fahrzeug.bild ? (
                          <img src={fahrzeug.bild} alt={fahrzeug.kennzeichen} />
                        ) : (
                          <span>Kein Bild</span>
                        )}
                      </div>
                      {isEditing ? (
                        <label className="pillButton outline pkwBildUploadBtn">
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={handleImageUpload}
                            disabled={uploadingImage}
                          />
                          {uploadingImage ? "Wird hochgeladen…" : "Bild hochladen"}
                        </label>
                      ) : null}
                    </div>
                  </div>
                  <div className="pkwQrSection card">
                    <h3 className="pkwPanelTitle">QR-Code · Kundenportal</h3>
                    <div className="pkwQrBlock">
                      {qrImageUrl ? (
                        <img className="pkwQrImage" src={qrImageUrl} width={280} height={280} alt="" />
                      ) : null}
                      <div className="pkwQrMeta">
                        <a className="pkwQrLink" href={portalUrl} target="_blank" rel="noreferrer">
                          {portalUrl}
                        </a>
                        <div className="pkwQrActions">
                          <button type="button" className="pillButton outline" onClick={() => void copyPortalLink()}>
                            Link kopieren
                          </button>
                          <a className="pillButton outline" href={portalUrl} target="_blank" rel="noreferrer">
                            Portal öffnen
                          </a>
                        </div>
                        {copyHint ? <p className="subtitle">{copyHint}</p> : null}
                      </div>
                    </div>
                  </div>
                </section>
              ) : null}

              {activeTab === "Ersatzteile" && !isLocalhost ? (
                <>
                  <div className="detailTopActions" style={{ marginBottom: 12 }}>
                    <button type="button" className="pillButton outline" onClick={() => void loadGruppenVorlage()}>
                      Gruppen-Vorlage laden
                    </button>
                    <Link className="pillButton outline" href="/pkw/gruppen">
                      PKW-Gruppen bearbeiten
                    </Link>
                  </div>
                  <MaintenanceLagerParts
                    parts={ersatzteile}
                    canEdit={isEditing}
                    onChange={setErsatzteile}
                    showGruppenActions={false}
                  />
                </>
              ) : null}

              {activeTab === "Reifen & Einlagerung" ? (
                <PkwReifenEditor saetze={reifenSaetze} onChange={setReifenSaetze} readOnly={!isEditing} />
              ) : null}

              {activeTab === "Sonstiges" ? (
                <div className="fieldGrid">
                  {sonstigesFields.map(({ key, label, placeholder }) => (
                    <label key={key} className="fieldRow pkwNotizenRow">
                      <span>{label}</span>
                      {isEditing ? (
                        <textarea
                          value={form[key] ?? ""}
                          onChange={(e) => update(key, e.target.value)}
                          placeholder={placeholder}
                          rows={5}
                        />
                      ) : (
                        <span>{form[key]?.trim() || "—"}</span>
                      )}
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
            ) : null}
          </div>

          {saveError ? <p className="errorText">{saveError}</p> : null}
          {message ? <p className="protocolNotice success">{message}</p> : null}

          <section className="tabSection machineWorkOrdersSection">
            <div className="detailTopBar">
              <h2>Arbeitsaufträge</h2>
              <div className="detailTopActions">
                <Link
                  className="pillButton outline"
                  href={`/pkw/arbeitsauftrag?kennzeichen=${encodeURIComponent(fahrzeug.kennzeichen)}&fahrzeugId=${encodeURIComponent(fahrzeug.id)}`}
                >
                  Alle anzeigen
                </Link>
              </div>
            </div>
            <PkwWorkOrdersTable fahrzeug={fahrzeug} orders={getPkwWorkOrders(fahrzeug)} />
          </section>

          <section className="tabSection machineWorkOrdersSection">
            <div className="detailTopBar">
              <h2>Service-Termine</h2>
              <div className="detailTopActions">
                <Link
                  className="pillButton outline"
                  href={`/pkw-service?kennzeichen=${encodeURIComponent(fahrzeug.kennzeichen)}`}
                >
                  Alle anzeigen
                </Link>
              </div>
            </div>
            <PkwBuchungenTable
              fahrzeug={fahrzeug}
              buchungen={buchungen}
              serviceLabels={serviceLabels}
            />
          </section>
        </div>
      )}
    </AppPageShell>
  );
}

export default function PkwFahrzeugDetailPage() {
  return (
    <Suspense
      fallback={
        <AppPageShell activeHref="/pkw/fahrzeuge" subtitle="PKW">
          <div className="welcomeCard">
            <h1>Fahrzeug wird geladen…</h1>
          </div>
        </AppPageShell>
      }
    >
      <PkwFahrzeugDetailPageContent />
    </Suspense>
  );
}
