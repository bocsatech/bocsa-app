type Props = {
  className?: string;
  size?: number;
};

/** Bocsa Tech logo mark — gear + B (concept 2). */
export default function BocsaMark({ className = "", size = 26 }: Props) {
  return (
    <span className={`sidebarMark${className ? ` ${className}` : ""}`}>
      <img
        src="/icons/bocsa-mark.svg"
        alt=""
        width={size}
        height={size}
        aria-hidden
        className="bocsaMarkImage"
      />
    </span>
  );
}
