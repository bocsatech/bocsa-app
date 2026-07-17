import fs from 'fs';
import path from 'path';
import os from 'os';

const DOWNLOADS = path.join(os.homedir(), 'Downloads');

const DEFINITIONS = {
  crm: {
    env: 'BOCSA_CRM_ROOT',
    dirs: ['bocsa-crm', 'bocsa-app'],
    marker: 'app/login/page.tsx',
  },
  orchestrator: {
    env: 'BOCSA_ORCHESTRATOR_ROOT',
    dirs: ['bocsa-orchestrator', 'bocsa-app/pro-orchestrator'],
    marker: 'src/server.mjs',
  },
  willhaben: {
    env: 'WILLHABEN_PRO_ROOT',
    dirs: ['willhaben pro', 'willhaben-pro'],
    marker: 'src/index.mjs',
  },
  hasznaltauto: {
    env: 'HASZNALTAUTO_PRO_ROOT',
    dirs: ['hasznaltauto pro', 'hasznaltauto-pro'],
    marker: 'src/index.mjs',
  },
};

function isInstalled(root, marker) {
  return fs.existsSync(path.join(root, marker));
}

function resolveProgram(key) {
  const cfg = DEFINITIONS[key];
  if (process.env[cfg.env]) {
    return path.resolve(process.env[cfg.env]);
  }
  for (const dir of cfg.dirs) {
    const candidate = path.join(DOWNLOADS, ...dir.split('/'));
    if (isInstalled(candidate, cfg.marker)) {
      return candidate;
    }
  }
  return path.join(DOWNLOADS, cfg.dirs[0].split('/')[0]);
}

export function getDownloadsRoot() {
  return DOWNLOADS;
}

export function getCrmRoot() {
  return resolveProgram('crm');
}

export function getOrchestratorRoot() {
  return resolveProgram('orchestrator');
}

export function getWillhabenRoot() {
  return resolveProgram('willhaben');
}

export function getHasznaltautoRoot() {
  return resolveProgram('hasznaltauto');
}

export function isCrmInstalled(root = getCrmRoot()) {
  return isInstalled(root, DEFINITIONS.crm.marker);
}

export function isOrchestratorInstalled(root = getOrchestratorRoot()) {
  return isInstalled(root, DEFINITIONS.orchestrator.marker);
}

export function isWillhabenInstalled(root = getWillhabenRoot()) {
  return isInstalled(root, DEFINITIONS.willhaben.marker);
}

export function isHasznaltautoInstalled(root = getHasznaltautoRoot()) {
  return isInstalled(root, DEFINITIONS.hasznaltauto.marker);
}

export function listProgramPaths() {
  return {
    downloads: DOWNLOADS,
    crm: getCrmRoot(),
    orchestrator: getOrchestratorRoot(),
    willhaben: getWillhabenRoot(),
    hasznaltauto: getHasznaltautoRoot(),
  };
}

/** @deprecated */
export function getWillhabenVendorRoot() {
  return path.join(getOrchestratorRoot(), 'vendor', 'willhaben-pro');
}
