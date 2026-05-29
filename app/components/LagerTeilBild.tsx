"use client";

import { useRef, useState } from "react";
import type { LagerTeil } from "../../lib/types/lager";

type Props = {
  teil: LagerTeil;
  canWrite: boolean;
  onUpdated: (teil: LagerTeil) => void;
  title?: string;
  uploadEnabled?: boolean;
};

function safeFilePart(value: string) {
  return String(value || "teil")
    .trim()
    .replace(/[^a-z0-9-_]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

export default function LagerTeilBild({
  teil,
  canWrite,
  onUpdated,
  title,
  uploadEnabled = true,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !canWrite || !uploadEnabled) return;

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
  const qrFilename = `${safeFilePart(teil.herstellernummer)}_${safeFilePart(teil.id)}.png`;
  const qrUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/machine-files/lager-qr-codes/${qrFilename}`;

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
        disabled={!canWrite || uploading || !uploadEnabled}
        onClick={() => {
          if (!uploadEnabled) return;
          inputRef.current?.click();
        }}
        title={canWrite && uploadEnabled ? "Bild hochladen (JPG, PNG, WEBP)" : undefined}
      >
        {teil.bild ? (
          <img className="lagerThumb" src={teil.bild} alt={label} />
        ) : (
          <span className="lagerThumbPlaceholder" aria-hidden>
            {uploading ? "…" : "+"}
          </span>
        )}
      </button>
      <a
        href={qrUrl}
        target="_blank"
        rel="noreferrer"
        className="lagerQrLink"
        title={`QR-Code für ${teil.herstellernummer}`}
      >
        <img className="lagerQrThumb" src={qrUrl} alt={`QR-Code ${teil.herstellernummer}`} />
      </a>
    </div>
  );
}
