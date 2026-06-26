import { getUserInitial } from "@/lib/auth/user-profile";

const SIZE_CLS = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-xl",
  xl: "h-20 w-20 text-2xl",
} as const;

interface UserAvatarProps {
  src?: string | null;
  displayName?: string | null;
  email?: string | null;
  size?: keyof typeof SIZE_CLS;
  className?: string;
}

export default function UserAvatar({
  src,
  displayName,
  email,
  size = "md",
  className = "",
}: UserAvatarProps) {
  const initial = getUserInitial(displayName, email);
  const sizeClass = SIZE_CLS[size];

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Google OAuth URLs; external CDN
      <img
        src={src}
        alt={displayName ? `${displayName} avatar` : "User avatar"}
        referrerPolicy="no-referrer"
        className={`shrink-0 rounded-full object-cover ring-1 ring-slate-200/80 ${sizeClass} ${className}`}
      />
    );
  }

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-700 ring-1 ring-slate-200/80 ${sizeClass} ${className}`}
      aria-hidden={!displayName && !email}
    >
      {initial}
    </span>
  );
}
