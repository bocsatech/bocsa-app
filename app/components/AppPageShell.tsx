"use client";

import type { ReactNode } from "react";
import AppSidebar from "./AppSidebar";

type Props = {
  activeHref?: string;
  subtitle?: string;
  /** @deprecated Mobil-Zurück-Leiste entfernt (Scroll-Stand 02.06.) */
  backFallbackHref?: string;
  /** @deprecated */
  hideMobileBackBar?: boolean;
  /** Egyedi fix fejléc (pl. detailTopBar) */
  top?: ReactNode;
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  mainClassName?: string;
  contentClassName?: string;
  scrollClassName?: string;
  /** Kein .appPageScroll-Wrapper (z. B. /kunden Mobil) */
  noInnerScroll?: boolean;
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
  noInnerScroll = false,
}: Props) {
  const hasTop = Boolean(top || title || actions);

  return (
    <main className={["workorderPage appShell", mainClassName].filter(Boolean).join(" ")}>
      <AppSidebar activeHref={activeHref} subtitle={subtitle} />

      <section className={["pageContent", contentClassName].filter(Boolean).join(" ")}>
        {top ? (
          <div className="appPageTopBar">{top}</div>
        ) : hasTop ? (
          <header className="appPageTopBar">
            {title ? <div className="appPageTopBarMain">{title}</div> : null}
            {actions ? <div className="detailTopActions">{actions}</div> : null}
          </header>
        ) : null}

        {noInnerScroll ? (
          <div className={["kundenListMain", scrollClassName].filter(Boolean).join(" ")}>
            {children}
          </div>
        ) : (
          <div className={["appPageScroll", scrollClassName].filter(Boolean).join(" ")}>
            {children}
          </div>
        )}
      </section>
    </main>
  );
}
