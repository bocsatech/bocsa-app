import type { ReactNode } from "react";
import {
  getSidebarMenuIconSrc,
  type SidebarMenuIconId,
} from "../../lib/sidebar-menu-icons";

type IconSize = "main" | "sub" | "nested";

type IconProps = {
  icon: SidebarMenuIconId;
  size?: IconSize;
};

export function SidebarMenuIcon({ icon, size = "main" }: IconProps) {
  const src = getSidebarMenuIconSrc(icon);
  return (
    <span className={`sidebarNavIconWrap sidebarNavIconWrap--${size}`} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="sidebarNavIcon" width={size === "nested" ? 18 : size === "sub" ? 20 : 22} height={size === "nested" ? 18 : size === "sub" ? 20 : 22} />
    </span>
  );
}

type LabelProps = {
  icon?: SidebarMenuIconId;
  showIcons: boolean;
  size?: IconSize;
  children: ReactNode;
};

export function SidebarNavLabel({ icon, showIcons, size = "main", children }: LabelProps) {
  if (!showIcons || !icon) {
    return <>{children}</>;
  }

  return (
    <span className="sidebarNavRow">
      <SidebarMenuIcon icon={icon} size={size} />
      <span className="sidebarNavText">{children}</span>
    </span>
  );
}
