"use client";

type Props = {
  bild?: string | null;
  qrImageUrl?: string | null;
  kennzeichen: string;
  className?: string;
  showQrCode?: boolean;
};

export default function PkwHeroMedia({
  bild,
  qrImageUrl,
  kennzeichen,
  className = "",
  showQrCode = true,
}: Props) {
  const mediaClass = ["machineHeroMedia", className].filter(Boolean).join(" ");

  return (
    <div className={mediaClass}>
      <div className={`machineImageSlot ${bild ? "hasMachineImage" : ""}`}>
        {bild ? (
          <img className="machineImagePreview" src={bild} alt={kennzeichen} />
        ) : (
          <span>Fahrzeugbild</span>
        )}
      </div>
      {showQrCode ? (
        <div className={`machineQrSlot ${qrImageUrl ? "hasQrImage machineQrLabeled" : ""}`}>
          {qrImageUrl ? (
            <img className="machineQrImage" src={qrImageUrl} alt={`QR-Code ${kennzeichen}`} />
          ) : (
            <div className="qrPlaceholder">
              <span />
              <span />
              <span />
              <span />
            </div>
          )}
          {!qrImageUrl ? <p>QR Code</p> : null}
        </div>
      ) : null}
    </div>
  );
}
