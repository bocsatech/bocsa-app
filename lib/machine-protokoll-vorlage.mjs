import { stripWorkOrdersFromTabData } from "./machine-tab-data.js";
import {
  cloneProtocolFromVorlage,
  normalizeGeraetgruppeVorlage,
  protocolToStoredVorlage,
} from "./geraetgruppe-protokoll.ts";

export const MACHINE_EIGEN_VORLAGE_KEY = "protokoll_vorlage_eigen";
export const MACHINE_EIGEN_AKTIV_KEY = "protokoll_vorlage_eigen_aktiv";

const VORLAGE_PRESERVE_KEYS = [MACHINE_EIGEN_VORLAGE_KEY, MACHINE_EIGEN_AKTIV_KEY];

export function preserveProtokollVorlageKeys(target, source) {
  if (!source || typeof source !== "object") return target;
  for (const key of VORLAGE_PRESERVE_KEYS) {
    if (key in source) {
      target[key] = source[key];
    }
  }
  return target;
}

export function readEigenVorlageFromTabData(tabData) {
  if (!tabData || typeof tabData !== "object") return null;
  if (!tabData[MACHINE_EIGEN_AKTIV_KEY]) return null;
  const raw = tabData[MACHINE_EIGEN_VORLAGE_KEY];
  if (!raw || typeof raw !== "object") return null;
  return normalizeGeraetgruppeVorlage(raw);
}

export function buildEigenVorlageTabPatch(existingTab, protocol) {
  const base =
    existingTab && typeof existingTab === "object" ? { ...existingTab } : {};
  const stored = protocol
    ? protocolToStoredVorlage(protocol)
    : normalizeGeraetgruppeVorlage({});
  return stripWorkOrdersFromTabData({
    ...base,
    [MACHINE_EIGEN_AKTIV_KEY]: true,
    [MACHINE_EIGEN_VORLAGE_KEY]: normalizeGeraetgruppeVorlage(stored),
  });
}

export function clearEigenVorlageTabPatch(existingTab) {
  const base =
    existingTab && typeof existingTab === "object" ? { ...existingTab } : {};
  delete base[MACHINE_EIGEN_AKTIV_KEY];
  delete base[MACHINE_EIGEN_VORLAGE_KEY];
  return stripWorkOrdersFromTabData(base);
}

export function protocolFromEigenTabData(tabData) {
  const stored = readEigenVorlageFromTabData(tabData);
  if (!stored) return null;
  return cloneProtocolFromVorlage(stored);
}
