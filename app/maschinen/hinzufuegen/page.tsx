"use client";

import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import AppPageShell from "../../components/AppPageShell";
import MachineAddForm from "../../components/MachineAddForm";
import { isLocalAppEnvironment } from "../../../lib/local-host";
import { canMachineCreate, type SessionAuthSlice } from "../../../lib/machine-permissions";
import { MASCHINEN_HINZUFUEGEN_PATH, MASCHINEN_LIST_PATH } from "../../../lib/maschinen-routes";
import type { Machine } from "../../../lib/types/machine";

function MaschineHinzufuegenPageContent() {
  const router = useRouter();
  const [sessionAuth, setSessionAuth] = useState<SessionAuthSlice>({
    permissions: [],
    groups: [],
  });
  const [authLoaded, setAuthLoaded] = useState(false);
  const canCreateMachine = canMachineCreate(sessionAuth);

  useEffect(() => {
    if (!isLocalAppEnvironment()) {
      router.replace(`${MASCHINEN_LIST_PATH}?aktion=hinzufuegen`);
    }
  }, [router]);

  useEffect(() => {
    async function loadPermissions() {
      const response = await fetch("/api/auth/session", {
        cache: "no-store",
        credentials: "include",
      });
      const result = await response.json().catch(() => ({}));
      setSessionAuth({
        permissions: result.permissions ?? [],
        groups: result.groups ?? [],
        username: result.username ?? result.user?.username,
      });
      setAuthLoaded(true);
    }

    void loadPermissions();
  }, []);

  function handleSaved(machine: Machine) {
    router.push(`/maschinen/${machine.id}?edit=1`);
  }

  if (!isLocalAppEnvironment()) {
    return (
      <AppPageShell activeHref={MASCHINEN_HINZUFUEGEN_PATH}>
        <div className="welcomeCard">
          <h1>Laden…</h1>
        </div>
      </AppPageShell>
    );
  }

  if (!authLoaded) {
    return (
      <AppPageShell activeHref={MASCHINEN_HINZUFUEGEN_PATH}>
        <div className="welcomeCard">
          <h1>Laden…</h1>
        </div>
      </AppPageShell>
    );
  }

  return (
    <AppPageShell activeHref={MASCHINEN_HINZUFUEGEN_PATH}>
      <div className="welcomeCard">
        <MachineAddForm
          active
          variant="page"
          canCreate={canCreateMachine}
          sessionAuth={sessionAuth}
          onCancel={() => router.push(MASCHINEN_LIST_PATH)}
          onSaved={handleSaved}
        />
      </div>
    </AppPageShell>
  );
}

export default function MaschineHinzufuegenPage() {
  return (
    <Suspense
      fallback={
        <AppPageShell activeHref={MASCHINEN_HINZUFUEGEN_PATH}>
          <div className="welcomeCard">
            <h1>Laden…</h1>
          </div>
        </AppPageShell>
      }
    >
      <MaschineHinzufuegenPageContent />
    </Suspense>
  );
}
