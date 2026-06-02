"use client";

import { useRouter } from "next/navigation";
import { resolveLagerBewegungHref, type LagerBewegung } from "../../lib/lager-bewegungen";
import { formatLagerValue } from "../../lib/lager";

type Props = {
  row: LagerBewegung;
};

export default function LagerBewegungReferenzLink({ row }: Props) {
  const router = useRouter();
  const href = resolveLagerBewegungHref(row);
  const label = formatLagerValue(row.referenz);

  if (!href || !row.referenz?.trim()) {
    return <span className="lagerBewegungReferenzPlain">{label}</span>;
  }

  return (
    <button
      type="button"
      className="lagerBewegungReferenzBtn pillButton outline"
      onClick={() => router.push(href)}
    >
      {label}
    </button>
  );
}
