import Image from "next/image";
import { useMemo, useState } from "react";

interface AvatarProps {
  name?: string | null;
  src?: string | null;
  size?: number;
}

export function Avatar({ name, src, size = 36 }: AvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);

  const initials = useMemo(
    () =>
      name
        ? name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()
        : "CP",
    [name]
  );

  const showImage = Boolean(src && !imageFailed);

  return (
    <div
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-xs font-semibold text-slate-700 ring-1 ring-slate-200/90 shadow-inner"
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        maxWidth: size,
        maxHeight: size,
      }}
    >
      {showImage ? (
        <Image
          src={src as string}
          alt={name ?? "Avatar"}
          fill
          sizes={`${size}px`}
          className="object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
