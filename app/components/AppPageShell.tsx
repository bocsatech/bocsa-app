"use client";

import { useEffect, type ReactNode } from "react";
import AppSidebar from "./AppSidebar";
import MobileBackBar from "./MobileBackBar";

type Props = {
  activeHref?: string;
  subtitle?: string;
  /** Mobil „Zurück” ha nincs böngésző-előzmény (Standard: Home) */
  backFallbackHref?: string;
  /** Mobil alsó sáv elrejtése (pl. főlista) */
  hideMobileBackBar?: boolean;
  /** Egyedi fix fejléc (pl. detailTopBar) */
  top?: ReactNode;
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  mainClassName?: string;
  contentClassName?: string;
  scrollClassName?: string;
};

export default function AppPageShell({
  activeHref,
  subtitle,
  top,
  title,
  actions,
  children,
  mainClassName,
  contentClassName,
  scrollClassName,
  backFallbackHref = "/",
  hideMobileBackBar = false,
}: Props) {
  const hasTop = Boolean(top || title || actions);

  useEffect(() => {
    document.documentElement.classList.add("app-shell-route-root");
    document.body.classList.add("app-shell-route");
    return () => {
      document.documentElement.classList.remove("app-shell-route-root");
      document.body.classList.remove("app-shell-route");
    };
  }, []);

  return (
    <main className={["workorderPage appShell", mainClassName].filter(Boolean).join(" ")}>
      <AppSidebar activeHref={activeHref} subtitle={subtitle} />

      <section
        className={[
          "pageContent",
          hideMobileBackBar ? "" : "pageContentWithMobileBack",
          contentClassName,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {top ? (
          <div className="appPageTopBar">{top}</div>
        ) : hasTop ? (
          <header className="appPageTopBar">
            {title ? <div className="appPageTopBarMain">{title}</div> : null}
            {actions ? <div className="detailTopActions">{actions}</div> : null}
          </header>
        ) : null}

        <div className={["appPageScroll", scrollClassName].filter(Boolean).join(" ")}>
          {children}
        </div>

        {hideMobileBackBar ? null : <MobileBackBar fallbackHref={backFallbackHref} />}
      </section>
    </main>
  );
}
