interface AvatarProps {
  name?: string | null;
  src?: string | null;
  size?: number;
}

export function Avatar({ name, src, size = 36 }: AvatarProps) {
  const initials = name
    ? name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "CP";

  return (
    <div
      className="flex items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700"
      style={{ width: size, height: size }}
    >
      {src ? (
        <img
          src={src}
          alt={name ?? "Avatar"}
          className="h-full w-full rounded-full object-cover"
          width={size}
          height={size}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
