"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  linkProtocolToLager,
  newProtocolRowId,
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
      menge: partial?.menge ?? 1,
      lagerstandSnapshot: partial?.lagerstandSnapshot ?? null,
      lagerIssuedMenge: partial?.lagerIssuedMenge ?? 0,
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

  function linkRowToLager(rowId: string) {
    const row = protocol.serviceSchedule.find((item) => item.id === rowId);
    if (!row || row.lagerTeilId) return;
    const teil = findLagerTeilByHersteller(teile, row.juraHifi);
    if (!teil) return;
    updateScheduleRow(rowId, {
      lagerTeilId: teil.id,
      lagerstandSnapshot: Number(teil.lagerstand ?? 0),
      menge: row.menge > 0 ? row.menge : 1,
    });
  }

  async function addFromLager(teil: LagerTeil) {
    if (protocol.serviceSchedule.some((row) => row.lagerTeilId === teil.id)) return;

    setLagerBusy(true);
    setLagerError(null);

    const menge = 1;
    let issuedMenge = 0;
    let snapshot = Number(teil.lagerstand ?? 0);

    if (canIssueLager) {
      const { data, error } = await issueLagerStock({
        machineId,
        referenz: auftragReferenz,
        lines: [{ lagerTeilId: teil.id, menge, herstellernummer: teil.herstellernummer }],
      });
      if (error) {
        setLagerError(error.message);
        setLagerBusy(false);
        return;
      }
      const hit = data?.issued?.[0];
      if (hit) {
        issuedMenge = menge;
        snapshot = Number(hit.lagerstand ?? snapshot);
        setStockById((current) => ({
          ...current,
          [teil.id]: snapshot,
        }));
      }
    }

    addScheduleRow({
      serviceMaterial: teil.bezeichnung?.trim() || teil.herstellernummer,
      juraHifi: teil.herstellernummer,
      sfFilter: "",
      lagerTeilId: teil.id,
      menge,
      lagerstandSnapshot: snapshot,
      lagerIssuedMenge: issuedMenge,
    });
    setLagerBusy(false);
  }

  async function hinzufuegenRow(row: WorkOrderScheduleRow) {
    const teil = resolveTeilForRow(row);
    if (!teil) {
      setPickerQuery(row.juraHifi.trim());
      setPickerOpen(true);
      return;
    }

    if (protocol.serviceSchedule.some((item) => item.lagerTeilId === teil.id && item.id !== row.id)) {
      setLagerError("Dieses Teil ist bereits in einer anderen Zeile.");
      return;
    }

    const pending = Math.max(0, row.menge - (row.lagerIssuedMenge ?? 0));
    if (pending <= 0 && row.lagerTeilId) {
      setLagerError("Menge ist bereits aus dem Lager ausgebucht. Menge erhöhen, dann erneut hinzufügen.");
      return;
    }

    const menge = pending > 0 ? pending : 1;

    if (!row.lagerTeilId) {
      updateScheduleRow(row.id, {
        lagerTeilId: teil.id,
        lagerstandSnapshot: Number(teil.lagerstand ?? 0),
        menge: row.menge > 0 ? row.menge : 1,
      });
    }

    if (!canIssueLager) return;

    setLagerBusy(true);
    setLagerError(null);
    const { data, error } = await issueLagerStock({
      machineId,
      referenz: auftragReferenz,
      lines: [{ lagerTeilId: teil.id, menge, herstellernummer: teil.herstellernummer }],
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
      lagerTeilId: teil.id,
      lagerIssuedMenge: (row.lagerIssuedMenge ?? 0) + menge,
      lagerstandSnapshot: snapshot,
      menge: Math.max(row.menge, menge),
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
              className="pillButton outline"
              onClick={() => addScheduleRow()}
            >
              + Service-Material
            </button>
            <button
              type="button"
              className="pillButton primary aaProtokollLagerAddBtn"
              disabled={lagerBusy}
              onClick={() => {
                setPickerQuery("");
                setPickerOpen(true);
              }}
            >
              + Teil aus Lager hinzufügen
            </button>
          </div>
        ) : null}
      </div>

      {lagerError ? <p className="protocolNotice">{lagerError}</p> : null}
      {canEdit ? (
        <p className="lagerBildHint">
          Lagerstand live aus dem Lager. Beim Hinzufügen aus dem Lager und beim Speichern wird
          die Menge ausgebucht (Jura-HiFi-Nummer = Herstellernummer).
        </p>
      ) : null}

      <div className="machineTableScroll aaProtokollScheduleScroll">
        <table className="machineTable aaProtokollScheduleTable">
          <thead>
            <tr>
              <th className="aaProtokollColMaterial">Service Material</th>
              <th className="aaProtokollColJura">Jura HiFi</th>
              <th className="aaProtokollColSf">SF-Filter</th>
              <th className="aaProtokollColStock">Lagerstand</th>
              <th className="aaProtokollColMenge">Menge</th>
              {canEdit ? <th className="aaProtokollColHinzuf">Hinzufügen</th> : null}
              {canEdit ? <th className="aaProtokollColActions" /> : null}
            </tr>
          </thead>
          <tbody>
            {protocol.serviceSchedule.map((row) => {
              const teil = resolveTeilForRow(row);
              const stock = lagerstandForRow(row);
              const issued = row.lagerIssuedMenge ?? 0;
              const pending = row.lagerTeilId
                ? Math.max(0, row.menge - issued)
                : 0;
              const lowStock =
                teil != null && stock != null && pending > 0 && stock < pending;

              return (
                <tr key={row.id}>
                  <td>
                    {canEdit ? (
                      <input
                        type="text"
                        className="aaProtokollInput"
                        value={row.serviceMaterial}
                        onChange={(e) =>
                          updateScheduleRow(row.id, { serviceMaterial: e.target.value })
                        }
                      />
                    ) : (
                      row.serviceMaterial || "—"
                    )}
                  </td>
                  <td className="aaProtokollColJura">
                    {canEdit ? (
                      <input
                        type="text"
                        className="aaProtokollInput aaProtokollInputJura"
                        value={row.juraHifi}
                        onChange={(e) =>
                          updateScheduleRow(row.id, { juraHifi: e.target.value })
                        }
                        onBlur={() => linkRowToLager(row.id)}
                      />
                    ) : (
                      <span className="aaProtokollValueJura">{row.juraHifi || "—"}</span>
                    )}
                  </td>
                  <td className="aaProtokollColSf">
                    {canEdit ? (
                      <input
                        type="text"
                        className="aaProtokollInput aaProtokollInputSf"
                        value={row.sfFilter}
                        onChange={(e) =>
                          updateScheduleRow(row.id, { sfFilter: e.target.value })
                        }
                      />
                    ) : (
                      <span className="aaProtokollValueSf">{row.sfFilter || "—"}</span>
                    )}
                  </td>
                  <td className="aaProtokollColStock">
                    {teil && stock != null ? (
                      <span
                        className={
                          lowStock ? "aaProtokollStockValue aaProtokollStockLow" : "aaProtokollStockValue"
                        }
                        title={
                          pending > 0
                            ? `${pending} Stk. werden beim Speichern ausgebucht`
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
                        disabled={lagerBusy}
                        title={
                          teil
                            ? "Aus Lager ins Protokoll buchen"
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
        }}
        onSelect={addFromLager}
        excludeIds={linkedLagerIds}
        issueOnSelect={canIssueLager}
        initialQuery={pickerQuery}
      />
    </div>
  );
}
