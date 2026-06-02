"use client";

import type { ChangeEvent } from "react";

type Props = {
  label: string;
  fileUrl: string;
  canUpload: boolean;
  uploading: boolean;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
};

export default function DocumentationDocumentRow({
  label,
  fileUrl,
  canUpload,
  uploading,
  onUpload,
}: Props) {
  return (
    <div className="fieldRow documentationFieldRow">
      <span>{label}</span>
      <div className="documentationDocBody">
        <div className="documentationDocActions">
          {fileUrl ? (
            <a
              className="pillButton outline documentationDocLink"
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
            >
              Öffnen
            </a>
          ) : (
            <span className="documentEmptyHint">Kein Dokument hinterlegt.</span>
          )}
          {canUpload ? (
            <label className="pillButton outline documentUploadButton">
              <input
                type="file"
                accept="application/pdf"
                onChange={onUpload}
                disabled={uploading}
              />
              {uploading ? "Wird hochgeladen…" : "PDF hochladen"}
            </label>
          ) : null}
        </div>
      </div>
    </div>
  );
}
