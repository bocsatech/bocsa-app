// components/SupabaseTable.tsx

"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Props = {
  table: string;
  title: string;
};

export default function SupabaseTable({ table, title }: Props) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState<string | null>(null); // Hiba állapot

  useEffect(() => {
    async function loadRows() {
      const { data, error } = await supabase.from(table).select("*").limit(100);
      if (error) {
        setError(`Tabelle konnte nicht geladen werden: ${error.message}`);
        console.error("Error loading rows:", error);
      } else {
        setRows(data || []);
      }
    }

    loadRows();
  }, [table]);

  return (
    <main style={{ padding: 30 }}>
      <h1>{title}</h1>
      {error ? ( // Hibaüzenet megjelenítése
        <div style={{ color: "red" }}>{error}</div>
      ) : (
        <pre>{JSON.stringify(rows, null, 2)}</pre>
      )}
    </main>
  );
}

