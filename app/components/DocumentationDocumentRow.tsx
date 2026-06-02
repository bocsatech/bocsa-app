"use client";

import type { ChangeEvent } from "react";

type Props = {
  label: string;
  fileUrl: string;
  /** PDF hochladen nur im Bearbeiten-Modus */
  isEditing: boolean;
  canWrite: boolean;
  uploading: boolean;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
};

export default function DocumentationDocumentRow({
  label,
  fileUrl,
  isEditing,
  canWrite,
  uploading,
  onUpload,
}: Props) {
  const showUpload = canWrite && isEditing;

  return (
    <div
      className={`fieldRow documentationFieldRow${showUpload ? "" : " documentationFieldRow--viewOnly"}`}
    >
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
          {showUpload ? (
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
