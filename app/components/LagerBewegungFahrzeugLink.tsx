"use client";

import Link from "next/link";
import { resolveLagerBewegungHref, type LagerBewegung } from "../../lib/lager-bewegungen";

type Props = {
  row: LagerBewegung;
};

export default function LagerBewegungFahrzeugLink({ row }: Props) {
  if (row.fahrzeug_kennzeichen && row.fahrzeug_id) {
    const href = `/pkw/fahrzeuge/${row.fahrzeug_id}`;
    return (
      <Link href={href} className="lagerBewegungReferenzLink">
        PKW {row.fahrzeug_kennzeichen}
      </Link>
    );
  }

  if (row.machine_geraetenummer && row.machine_id) {
    const href = `/maschinen/${row.machine_id}`;
    return (
      <Link href={href} className="lagerBewegungReferenzLink">
        {row.machine_geraetenummer}
      </Link>
    );
  }

  if (row.fahrzeug_kennzeichen) {
    return <>PKW {row.fahrzeug_kennzeichen}</>;
  }

  if (row.machine_geraetenummer) {
    return <>{row.machine_geraetenummer}</>;
  }

  const fallbackHref = resolveLagerBewegungHref(row);
  if (fallbackHref) {
    return (
      <Link href={fallbackHref} className="lagerBewegungReferenzLink">
        Öffnen
      </Link>
    );
  }

  return <>—</>;
}
