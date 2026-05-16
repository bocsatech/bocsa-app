"use client";

import { useRef, useState } from "react";
import type { LagerTeil } from "../../lib/types/lager";

type Props = {
  teil: LagerTeil;
  canWrite: boolean;
  onUpdated: (teil: LagerTeil) => void;
  title?: string;
};

export default function LagerTeilBild({ teil, canWrite, onUpdated, title }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !canWrite) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(`/api/lager/teile/${teil.id}/image`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });
    const result = await response.json().catch(() => ({}));

    if (response.ok) {
      onUpdated(result as LagerTeil);
    } else {
      window.alert(result.error ?? "Bild konnte nicht hochgeladen werden.");
    }

    setUploading(false);
  }

  const label = title ?? teil.bezeichnung ?? teil.herstellernummer;

  return (
    <div className="lagerBildCell">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="lagerBildInput"
        onChange={handleUpload}
        disabled={!canWrite || uploading}
        aria-label={`Bild für ${label}`}
      />
      <button
        type="button"
        className="lagerBildButton"
        disabled={!canWrite || uploading}
        onClick={() => inputRef.current?.click()}
        title={canWrite ? "Bild hochladen (JPG, PNG, WEBP)" : undefined}
      >
        {teil.bild ? (
          <img className="lagerThumb" src={teil.bild} alt={label} />
        ) : (
          <span className="lagerThumbPlaceholder" aria-hidden>
            {uploading ? "…" : "+"}
          </span>
        )}
      </button>
    </div>
  );
}
