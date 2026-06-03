"use client";

import { useRouter } from "next/navigation";
import { resolveLagerBewegungHref, type LagerBewegung } from "../../lib/lager-bewegungen";

type Props = {
  row: LagerBewegung;
};

export default function LagerBewegungFahrzeugLink({ row }: Props) {
  const router = useRouter();

  if (row.fahrzeug_kennzeichen && row.fahrzeug_id) {
    const href = `/pkw/fahrzeuge/${row.fahrzeug_id}`;
    return (
      <button
        type="button"
        className="lagerBewegungReferenzBtn pillButton outline"
        onClick={() => router.push(href)}
      >
        PKW {row.fahrzeug_kennzeichen}
      </button>
    );
  }

  if (row.machine_geraetenummer && row.machine_id) {
    const href = `/maschinen/${row.machine_id}`;
    return (
      <button
        type="button"
        className="lagerBewegungReferenzBtn pillButton outline"
        onClick={() => router.push(href)}
      >
        {row.machine_geraetenummer}
      </button>
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
      <button
        type="button"
        className="lagerBewegungReferenzBtn pillButton outline"
        onClick={() => router.push(fallbackHref)}
      >
        Öffnen
      </button>
    );
  }

  return <>—</>;
}
