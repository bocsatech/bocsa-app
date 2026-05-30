import Link from "next/link";
import ArbeitsauftragSheetFieldDemo from "../../components/ArbeitsauftragSheetFieldDemo";
import "../../arbeitsauftrag-form.css";

export default function ArbeitsauftragSheetDemoPage() {
  return (
    <main className="aaSheetDemoPage">
      <header className="aaSheetDemoHeader">
        <h1>Arbeitsauftrag — Feld-Layout (Demo)</h1>
        <p>
          So sollen Label und Wert aussehen: wenig Abstand, keine Zeilenumbrüche.
        </p>
        <Link className="pillButton outline" href="/arbeitsauftrag">
          Zurück zur Liste
        </Link>
      </header>
      <ArbeitsauftragSheetFieldDemo />
    </main>
  );
}
