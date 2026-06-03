"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";

type Props = {
  href: string;
  className?: string;
  children: ReactNode;
};

/** Home-Kachel: erzwingt Client-Navigation (robust mit Query-Parametern / Umlauten). */
export default function HomeMenuCard({ href, className, children }: Props) {
  const router = useRouter();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    router.push(href);
  }

  return (
    <Link href={href} className={className} onClick={handleClick} scroll>
      {children}
    </Link>
  );
}
