"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isLocalHostEnvironment } from "../../lib/local-host";

export function useLocalhostOnly(fallbackHref = "/") {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isLocalHostEnvironment()) {
      router.replace(fallbackHref);
      return;
    }
    setReady(true);
  }, [fallbackHref, router]);

  return ready;
}
