"use client";

import { useRouter } from "next/navigation";

type Props = {
  /** Ha nincs böngésző-előzmény (pl. közvetlen link) */
  fallbackHref?: string;
  label?: string;
  /** Auch auf Desktop anzeigen (Start, Login ohne App-Shell) */
  alwaysVisible?: boolean;
};

export default function MobileBackBar({
  fallbackHref = "/",
  label = "Zurück",
  alwaysVisible = false,
}: Props) {
  const router = useRouter();

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  }

  return (
    <footer
      className={`mobileBackBar${alwaysVisible ? " mobileBackBarAlways" : ""}`}
      role="navigation"
      aria-label="Seitennavigation"
    >
      <button type="button" className="mobileBackBarBtn" onClick={handleBack}>
        <span className="mobileBackBarIcon" aria-hidden>
          ←
        </span>
        {label}
      </button>
    </footer>
  );
}
