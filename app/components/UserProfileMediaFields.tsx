"use client";

import type { ReactNode } from "react";
import UserFormField from "./UserFormField";

type UserProfileMediaFieldsProps = {
  photoUrl: string;
  signatureUrl: string;
  onPhotoChange: (value: string) => void;
  onSignatureChange: (value: string) => void;
  onError: (message: string) => void;
  mode: "inline" | "aside" | "stacked";
  idPrefix?: string;
  grouped?: boolean;
};

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Datei konnte nicht gelesen werden."));
    reader.readAsDataURL(file);
  });
}

function MediaUploadPanel({
  preview,
  emptyHint,
  buttonLabel,
  inputId,
  onPick,
}: {
  preview: ReactNode;
  emptyHint: string;
  buttonLabel: string;
  inputId: string;
  onPick: (file: File | undefined) => Promise<void>;
}) {
  return (
    <div className="userFormMediaPanel">
      <div className="userFormMediaPreview">{preview ?? <span className="documentEmptyHint">{emptyHint}</span>}</div>
      <label className="userFormMediaButton" htmlFor={inputId}>
        {buttonLabel}
      </label>
      <input
        id={inputId}
        className="userFormMediaFileInput"
        type="file"
        accept="image/*"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          await onPick(file);
        }}
      />
    </div>
  );
}

export default function UserProfileMediaFields({
  photoUrl,
  signatureUrl,
  onPhotoChange,
  onSignatureChange,
  onError,
  mode,
  idPrefix = "user-profile",
  grouped = false,
}: UserProfileMediaFieldsProps) {
  async function handlePhoto(file: File | undefined) {
    if (!file) return;
    try {
      onPhotoChange(await fileToDataUrl(file));
    } catch {
      onError("Foto konnte nicht gelesen werden.");
    }
  }

  async function handleSignature(file: File | undefined) {
    if (!file) return;
    try {
      onSignatureChange(await fileToDataUrl(file));
    } catch {
      onError("Unterschrift konnte nicht gelesen werden.");
    }
  }

  const photoPreview = photoUrl ? (
    <img
      src={photoUrl}
      alt="Benutzerfoto"
      className={
        mode === "inline"
          ? "userFormMediaPhoto"
          : mode === "stacked"
            ? "publicMachineThumb"
            : "publicMachineThumb userProfilePhotoPreview"
      }
      style={mode === "stacked" ? { width: 72, height: 72 } : undefined}
    />
  ) : null;

  const signaturePreview = signatureUrl ? (
    <img
      src={signatureUrl}
      alt="Unterschrift"
      className={
        mode === "inline"
          ? "userFormMediaSignature"
          : mode === "stacked"
            ? undefined
            : "userProfileSignaturePreview"
      }
      style={
        mode === "stacked"
          ? { maxWidth: 220, maxHeight: 72, objectFit: "contain" }
          : undefined
      }
    />
  ) : null;

  if (mode === "inline") {
    const fields = (
      <>
        <UserFormField label="Benutzerfoto" className="userFormField--media">
          <MediaUploadPanel
            preview={photoPreview}
            emptyHint="Kein Foto hinterlegt."
            buttonLabel="Foto auswählen"
            inputId={`${idPrefix}-photo`}
            onPick={handlePhoto}
          />
        </UserFormField>
        <UserFormField label="Unterschrift (Prüfprotokoll)" className="userFormField--media">
          <MediaUploadPanel
            preview={signaturePreview}
            emptyHint="Keine Unterschrift hinterlegt."
            buttonLabel="Unterschrift auswählen"
            inputId={`${idPrefix}-signature`}
            onPick={handleSignature}
          />
        </UserFormField>
      </>
    );

    if (grouped) {
      return <div className="userProfileFormHeadMedia">{fields}</div>;
    }

    return fields;
  }

  if (mode === "stacked") {
    return (
      <>
        <div className="fieldRow documentationFieldRow">
          <span>Benutzerfoto</span>
          <div className="documentUploadControls documentUploadControlsCompact">
            <div className="documentUploadActions">
              {photoPreview ?? <span className="documentEmptyHint">Kein Foto hinterlegt.</span>}
              <label className="pillButton outline documentUploadButton">
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    await handlePhoto(file);
                  }}
                />
                Foto auswählen
              </label>
            </div>
          </div>
        </div>
        <div className="fieldRow documentationFieldRow">
          <span>Unterschrift (Prüfprotokoll)</span>
          <div className="documentUploadControls documentUploadControlsCompact">
            <div className="documentUploadActions">
              {signaturePreview ?? (
                <span className="documentEmptyHint">Keine Unterschrift hinterlegt.</span>
              )}
              <label className="pillButton outline documentUploadButton">
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    await handleSignature(file);
                  }}
                />
                Unterschrift auswählen
              </label>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <aside className="userProfileFormMedia">
      <div className="fieldRow documentationFieldRow userProfileMediaBlock">
        <span>Benutzerfoto</span>
        <div className="documentUploadControls documentUploadControlsCompact">
          <div className="documentUploadActions userProfileMediaActions">
            {photoPreview ?? <span className="documentEmptyHint">Kein Foto hinterlegt.</span>}
            <label className="pillButton outline documentUploadButton">
              <input
                type="file"
                accept="image/*"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  await handlePhoto(file);
                }}
              />
              Foto auswählen
            </label>
          </div>
        </div>
      </div>
      <div className="fieldRow documentationFieldRow userProfileMediaBlock">
        <span>Unterschrift (Prüfprotokoll)</span>
        <div className="documentUploadControls documentUploadControlsCompact">
          <div className="documentUploadActions userProfileMediaActions">
            {signaturePreview ?? (
              <span className="documentEmptyHint">Keine Unterschrift hinterlegt.</span>
            )}
            <label className="pillButton outline documentUploadButton">
              <input
                type="file"
                accept="image/*"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  await handleSignature(file);
                }}
              />
              Unterschrift auswählen
            </label>
          </div>
        </div>
      </div>
    </aside>
  );
}
