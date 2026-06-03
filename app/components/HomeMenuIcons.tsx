import Image from "next/image";

type Props = { name: string };

const ICON_SIZE = { width: 140, height: 105 };

/** Demo-Icons als PNG/SVG unter /public/icons/home/ */
export default function HomeMenuIcon({ name }: Props) {
  const src = `/icons/home/${name}.png`;

  return (
    <Image
      src={src}
      alt=""
      width={ICON_SIZE.width}
      height={ICON_SIZE.height}
      className="homeMenuIconImg"
      unoptimized
    />
  );
}

