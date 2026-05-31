"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  linkProtocolToLager,
  newProtocolRowId,
  normalizeScheduleMenge,
  scheduleRowLagerDisplay,
  stepScheduleMenge,
  type WorkOrderProtocol,
  type WorkOrderRepairGroup,
  type WorkOrderScheduleRow,
} from "../../lib/arbeitsauftrag-protokoll";
import {
  fetchLagerTeile,
  findLagerTeilByHersteller,
  formatLagerNumber,
  issueLagerStock,
} from "../../lib/lager";
import type { LagerTeil } from "../../lib/types/lager";
import LagerTeilPickerModal from "./LagerTeilPickerModal";

type Props = {
  protocol: WorkOrderProtocol;
  canEdit: boolean;
  canIssueLager?: boolean;
  machineId?: string;
  auftragReferenz?: string;
  onChange: (protocol: WorkOrderProtocol) => void;
};

export default function ArbeitsauftragProtokollSection({
  protocol,
  canEdit,
  canIssueLager = false,
  machineId,
  auftragReferenz = "Arbeitsauftrag",
  onChange,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  /** Vorlage-Zeile ohne Lager-Treffer: Picker verknüpft diese Zeile, kein neues Duplikat */
  const [pickerTargetRowId, setPickerTargetRowId] = useState<string | null>(null);
  const [teile, setTeile] = useState<LagerTeil[]>([]);
  const [stockById, setStockById] = useState<Record<string, number>>({});
  const [lagerError, setLagerError] = useState<string | null>(null);
  const [lagerBusy, setLagerBusy] = useState(false);
  const protocolRef = useRef(protocol);
  protocolRef.current = protocol;

  const reloadLager = useCallback(async () => {
    const { data, error } = await fetchLagerTeile();
    if (error) {
      setLagerError(error.message);
      return;
    }
    setLagerError(null);
    const rows = data ?? [];
    setTeile(rows);
    const map: Record<string, number> = {};
    for (const teil of rows) {
      map[teil.id] = Number(teil.lagerstand ?? 0);
    }
    setStockById(map);
  }, []);

  useEffect(() => {
    reloadLager();
  }, [reloadLager, protocol.serviceSchedule.length]);

  useEffect(() => {
    if (!teile.length || !canEdit) return;
    const linked = linkProtocolToLager(protocolRef.current, teile);
    const changed = linked.serviceSchedule.some(
      (row, index) => row.lagerTeilId !== protocolRef.current.serviceSchedule[index]?.lagerTeilId
    );
    if (changed) onChange(linked);
  }, [teile, canEdit, onChange]);

  const teileById = useMemo(() => {
    const map = new Map<string, LagerTeil>();
    for (const teil of teile) map.set(teil.id, teil);
    return map;
  }, [teile]);

  const linkedLagerIds = useMemo(
    () =>
      protocol.serviceSchedule
        .map((row) => row.lagerTeilId)
        .filter((id): id is string => Boolean(id)),
    [protocol.serviceSchedule]
  );

  function patchProtocol(patch: Partial<WorkOrderProtocol>) {
    onChange({ ...protocol, ...patch });
  }

  function updateScheduleRow(id: string, patch: Partial<WorkOrderScheduleRow>) {
    patchProtocol({
      serviceSchedule: protocol.serviceSchedule.map((row) =>
        row.id === id ? { ...row, ...patch } : row
      ),
    });
  }

  function addScheduleRow(partial?: Partial<WorkOrderScheduleRow>) {
    const row: WorkOrderScheduleRow = {
      id: newProtocolRowId(),
      serviceMaterial: partial?.serviceMaterial ?? "",
      juraHifi: partial?.juraHifi ?? "",
      sfFilter: partial?.sfFilter ?? "",
      lagerTeilId: partial?.lagerTeilId ?? null,
      menge: partial?.menge ?? 0,
      lagerstandSnapshot: partial?.lagerstandSnapshot ?? null,
      lagerIssuedMenge: partial?.lagerIssuedMenge ?? 0,
      hinzugefuegt: partial?.hinzugefuegt ?? false,
    };
    patchProtocol({ serviceSchedule: [...protocol.serviceSchedule, row] });
  }

  function removeScheduleRow(id: string) {
    patchProtocol({
      serviceSchedule: protocol.serviceSchedule.filter((row) => row.id !== id),
    });
  }

  function resolveTeilForRow(row: WorkOrderScheduleRow): LagerTeil | null {
    if (row.lagerTeilId) {
      return teileById.get(row.lagerTeilId) ?? null;
    }
    return findLagerTeilByHersteller(teile, row.juraHifi);
  }

  function lagerstandForRow(row: WorkOrderScheduleRow) {
    const teil = resolveTeilForRow(row);
    if (!teil) return null;
    if (teil.id in stockById) return stockById[teil.id];
    return Number(teil.lagerstand ?? 0);
  }

  function rowDisplayFields(row: WorkOrderScheduleRow) {
    return scheduleRowLagerDisplay(row, resolveTeilForRow(row));
  }

  async function handlePickerSelect(teil: LagerTeil) {
    setPickerOpen(false);
    setPickerQuery("");
    const targetId = pickerTargetRowId;
    setPickerTargetRowId(null);

    if (targetId) {
      const row = protocol.serviceSchedule.find((item) => item.id === targetId);
      if (!row) return;

      if (
        protocol.serviceSchedule.some(
          (item) => item.lagerTeilId === teil.id && item.id !== targetId
        )
      ) {
        setLagerError("Dieses Teil ist bereits in einer anderen Zeile.");
        return;
      }

      const linked: WorkOrderScheduleRow = {
        ...row,
        lagerTeilId: teil.id,
        serviceMaterial: teil.bezeichnung?.trim() || "",
        juraHifi: teil.herstellernummer?.trim() || "",
        sfFilter: teil.artikelnummer?.trim() || "",
        lagerstandSnapshot: Number(teil.lagerstand ?? 0),
      };
      updateScheduleRow(targetId, {
        lagerTeilId: linked.lagerTeilId,
        serviceMaterial: linked.serviceMaterial,
        juraHifi: linked.juraHifi,
        sfFilter: linked.sfFilter,
        lagerstandSnapshot: linked.lagerstandSnapshot,
      });
      await hinzufuegenRow(linked);
      return;
    }

    await addFromLager(teil);
  }

  async function addFromLager(teil: LagerTeil) {
    if (protocol.serviceSchedule.some((row) => row.lagerTeilId === teil.id)) return;

    addScheduleRow({
      serviceMaterial: teil.bezeichnung?.trim() || "",
      juraHifi: teil.herstellernummer?.trim() || "",
      sfFilter: teil.artikelnummer?.trim() || "",
      lagerTeilId: teil.id,
      menge: 0,
      lagerstandSnapshot: Number(teil.lagerstand ?? 0),
      lagerIssuedMenge: 0,
      hinzugefuegt: false,
    });
  }

  async function hinzufuegenRow(row: WorkOrderScheduleRow) {
    if (normalizeScheduleMenge(row.menge) <= 0) {
      setLagerError("Menge muss größer als 0 sein.");
      return;
    }

    const teil = resolveTeilForRow(row);
    if (!teil) {
      setPickerTargetRowId(row.id);
      setPickerQuery(row.juraHifi.trim());
      setPickerOpen(true);
      return;
    }

    if (!canIssueLager) {
      setLagerError("Keine Berechtigung für Lager-Ausbuchung.");
      return;
    }

    if (
      protocol.serviceSchedule.some(
        (item) => item.lagerTeilId === teil.id && item.id !== row.id
      )
    ) {
      setLagerError("Dieses Teil ist bereits in einer anderen Zeile.");
      return;
    }

    const alreadyIssued = normalizeScheduleMenge(row.lagerIssuedMenge ?? 0);
    const toIssue = normalizeScheduleMenge(row.menge) - alreadyIssued;
    if (toIssue <= 0) {
      setLagerError("Menge ist bereits ausgebucht. Menge erhöhen, dann erneut hinzufügen.");
      return;
    }

    const displayPatch = {
      lagerTeilId: teil.id,
      serviceMaterial: teil.bezeichnung?.trim() || "",
      juraHifi: teil.herstellernummer?.trim() || "",
      sfFilter: teil.artikelnummer?.trim() || "",
      lagerstandSnapshot: Number(teil.lagerstand ?? 0),
      hinzugefuegt: true,
    };

    setLagerBusy(true);
    setLagerError(null);
    const { data, error } = await issueLagerStock({
      machineId,
      referenz: auftragReferenz,
      lines: [
        {
          lagerTeilId: teil.id,
          menge: toIssue,
          herstellernummer: teil.herstellernummer,
        },
      ],
    });
    setLagerBusy(false);

    if (error) {
      setLagerError(error.message);
      return;
    }

    const hit = data?.issued?.[0];
    const snapshot = hit ? Number(hit.lagerstand ?? 0) : Number(teil.lagerstand ?? 0);
    setStockById((current) => ({ ...current, [teil.id]: snapshot }));
    updateScheduleRow(row.id, {
      ...displayPatch,
      lagerIssuedMenge: alreadyIssued + toIssue,
      lagerstandSnapshot: snapshot,
    });
  }

  function updateRepairGroup(groupId: string, patch: Partial<WorkOrderRepairGroup>) {
    patchProtocol({
      repairGroups: protocol.repairGroups.map((group) =>
        group.id === groupId ? { ...group, ...patch } : group
      ),
    });
  }

  function toggleRepairItem(groupId: string, itemId: string) {
    const group = protocol.repairGroups.find((g) => g.id === groupId);
    if (!group) return;
    updateRepairGroup(groupId, {
      items: group.items.map((item) =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      ),
    });
  }

  function updateRepairItemLabel(groupId: string, itemId: string, label: string) {
    const group = protocol.repairGroups.find((g) => g.id === groupId);
    if (!group) return;
    updateRepairGroup(groupId, {
      items: group.items.map((item) =>
        item.id === itemId ? { ...item, label } : item
      ),
    });
  }

  function addRepairItem(groupId: string) {
    const group = protocol.repairGroups.find((g) => g.id === groupId);
    if (!group) return;
    updateRepairGroup(groupId, {
      items: [
        ...group.items,
        { id: newProtocolRowId(), label: "", checked: false, tone: "default" },
      ],
    });
  }

  function removeRepairItem(groupId: string, itemId: string) {
    const group = protocol.repairGroups.find((g) => g.id === groupId);
    if (!group) return;
    updateRepairGroup(groupId, {
      items: group.items.filter((item) => item.id !== itemId),
    });
  }

  return (
    <div className="aaProtokollBlock">
      <div className="aaProtokollHeader">
        <h2 className="spacedTitle">Arbeitsauftrag Protokoll</h2>
        {canEdit ? (
          <div className="aaProtokollHeaderActions">
            <button
              type="button"
              className="pillButton primary aaProtokollLagerAddBtn"
              disabled={lagerBusy}
              onClick={() => {
                setPickerTargetRowId(null);
                setPickerQuery("");
                setPickerOpen(true);
              }}
            >
              + Teil aus Lager
            </button>
          </div>
        ) : null}
      </div>

      {lagerError ? <p className="protocolNotice">{lagerError}</p> : null}
      {canEdit ? (
        <p className="lagerBildHint">
          Zeilen aus der Gerätegruppen-Vorlage (Herstellernummer). Menge setzen, dann
          „Hinzufügen“ — Ausgabe erscheint in der Bemerkung. Beim Speichern wird nur eine
          erhöhte Menge nachgebucht.
        </p>
      ) : null}

      <div className="machineTableScroll aaProtokollScheduleScroll">
        <table className="machineTable aaProtokollScheduleTable">
          <thead>
            <tr>
              <th>Ersatzteil</th>
              <th>Herstellernummer</th>
              <th>Artikelnummer</th>
              <th>Lagerort</th>
              <th>Lagerplatz</th>
              <th className="aaProtokollColStock">Lagerstand</th>
              <th className="aaProtokollColMenge">Menge</th>
              {canEdit ? <th className="aaProtokollColHinzuf">Hinzufügen</th> : null}
              {canEdit ? <th className="aaProtokollColActions" /> : null}
            </tr>
          </thead>
          <tbody>
            {protocol.serviceSchedule.map((row) => {
              const teil = resolveTeilForRow(row);
              const display = rowDisplayFields(row);
              const stock = lagerstandForRow(row);
              const issued = normalizeScheduleMenge(row.lagerIssuedMenge ?? 0);
              const pending = Math.max(0, row.menge - issued);
              const lowStock =
                teil != null && stock != null && pending > 0 && stock < pending;
              const canHinzufuegen =
                row.menge > 0 && (row.menge > issued || !teil);

              return (
                <tr
                  key={row.id}
                  className={row.hinzugefuegt ? "aaProtokollRowIssued" : undefined}
                >
                  <td>{display.ersatzteil}</td>
                  <td className="aaProtokollColJura">
                    <span className="aaProtokollValueJura">{display.herstellernummer}</span>
                  </td>
                  <td>{display.artikelnummer}</td>
                  <td>{display.lagerort}</td>
                  <td>{display.lagerplatz}</td>
                  <td className="aaProtokollColStock">
                    {teil && stock != null ? (
                      <span
                        className={
                          lowStock ? "aaProtokollStockValue aaProtokollStockLow" : "aaProtokollStockValue"
                        }
                        title={
                          pending > 0 && issued > 0
                            ? `${pending} Stk. werden beim Speichern nachgebucht`
                            : undefined
                        }
                      >
                        {formatLagerNumber(stock)}
                        {issued > 0 ? (
                          <small className="aaProtokollStockIssued">
                            {" "}
                            (−{formatLagerNumber(issued)})
                          </small>
                        ) : null}
                      </span>
                    ) : row.juraHifi.trim() ? (
                      <span className="aaProtokollStockMuted" title="Kein Lager-Eintrag">
                        0
                      </span>
                    ) : (
                      <span className="aaProtokollStockMuted">—</span>
                    )}
                  </td>
                  <td className="aaProtokollColMenge">
                    {canEdit ? (
                      <div className="aaProtokollMengeStepper">
                        <button
                          type="button"
                          className="aaProtokollMengeBtn"
                          aria-label="Menge verringern"
                          disabled={row.menge <= 0}
                          onClick={() =>
                            updateScheduleRow(row.id, {
                              menge: stepScheduleMenge(row.menge, -1),
                            })
                          }
                        >
                          −
                        </button>
                        <span className="aaProtokollMengeValue" aria-live="polite">
                          {formatLagerNumber(row.menge)}
                        </span>
                        <button
                          type="button"
                          className="aaProtokollMengeBtn aaProtokollMengeBtnPlus"
                          aria-label="Menge erhöhen"
                          onClick={() =>
                            updateScheduleRow(row.id, {
                              menge: stepScheduleMenge(row.menge, 1),
                            })
                          }
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      formatLagerNumber(row.menge)
                    )}
                  </td>
                  {canEdit ? (
                    <td className="aaProtokollColHinzuf">
                      <button
                        type="button"
                        className="pillButton primary aaProtokollHinzufBtn"
                        disabled={lagerBusy || !canHinzufuegen}
                        title={
                          row.menge <= 0
                            ? "Zuerst Menge größer 0 setzen"
                            : teil
                              ? "Aus Lager buchen und in Bemerkung übernehmen"
                              : "Teil im Lager suchen"
                        }
                        onClick={() => hinzufuegenRow(row)}
                      >
                        Hinzufügen
                      </button>
                    </td>
                  ) : null}
                  {canEdit ? (
                    <td className="aaProtokollColActions">
                      <button
                        type="button"
                        className="pillButton outline"
                        onClick={() => removeScheduleRow(row.id)}
                        aria-label="Zeile entfernen"
                      >
                        ×
                      </button>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h3 className="aaProtokollRepairTitle">Reparaturdaten</h3>
      <div className="aaProtokollRepairGrid">
        {protocol.repairGroups.map((group) => (
          <div key={group.id} className="aaProtokollRepairCol">
            <h4>{group.title}</h4>
            <ul className="aaProtokollCheckList">
              {group.items.map((item) => (
                <li
                  key={item.id}
                  className={`aaProtokollCheckItem tone-${item.tone ?? "default"}`}
                >
                  <label>
                    <input
                      type="checkbox"
                      checked={item.checked}
                      disabled={!canEdit}
                      onChange={() => toggleRepairItem(group.id, item.id)}
                    />
                    {canEdit && item.tone === "default" ? (
                      <input
                        type="text"
                        className="aaProtokollCheckLabelInput"
                        value={item.label}
                        onChange={(e) =>
                          updateRepairItemLabel(group.id, item.id, e.target.value)
                        }
                      />
                    ) : (
                      <span>{item.label}</span>
                    )}
                  </label>
                  {canEdit && item.tone === "default" ? (
                    <button
                      type="button"
                      className="aaProtokollRemoveItem"
                      onClick={() => removeRepairItem(group.id, item.id)}
                      aria-label="Entfernen"
                    >
                      ×
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
            {canEdit ? (
              <button
                type="button"
                className="pillButton outline aaProtokollAddCheck"
                onClick={() => addRepairItem(group.id)}
              >
                + Eintrag
              </button>
            ) : null}
          </div>
        ))}
      </div>

      <LagerTeilPickerModal
        open={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          setPickerQuery("");
          setPickerTargetRowId(null);
        }}
        onSelect={(teil) => void handlePickerSelect(teil)}
        excludeIds={linkedLagerIds}
        issueOnSelect={false}
        initialQuery={pickerQuery}
      />
    </div>
  );
}
