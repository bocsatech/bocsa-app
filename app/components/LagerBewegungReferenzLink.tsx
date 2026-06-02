"use client";

import Link from "next/link";
import { resolveLagerBewegungHref, type LagerBewegung } from "../../lib/lager-bewegungen";
import { formatLagerValue } from "../../lib/lager";

type Props = {
  row: LagerBewegung;
};

export default function LagerBewegungReferenzLink({ row }: Props) {
  const href = resolveLagerBewegungHref(row);
  const label = formatLagerValue(row.referenz);

  if (!href || !row.referenz?.trim()) {
    return <>{label}</>;
  }

  return (
    <Link href={href} className="lagerBewegungReferenzLink">
      {label}
    </Link>
  );
}
