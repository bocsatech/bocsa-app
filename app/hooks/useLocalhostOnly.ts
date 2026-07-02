"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isLocalAppEnvironment } from "../../lib/local-host";

type State = "pending" | "ready" | "blocked";

export function useLocalhostOnly(fallbackHref = "/") {
  const router = useRouter();
  const [state, setState] = useState<State>("pending");

  useEffect(() => {
    if (!isLocalAppEnvironment()) {
      setState("blocked");
      router.replace(fallbackHref);
      return;
    }
    setState("ready");
  }, [fallbackHref, router]);

  return state;
}
