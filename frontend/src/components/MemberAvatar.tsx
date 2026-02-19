import { addressToGradient } from "../lib/utils";

type Props = {
  address: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeMap = {
  sm: "w-7 h-7 text-[10px]",
  md: "w-9 h-9 text-xs",
  lg: "w-11 h-11 text-sm",
};

export default function MemberAvatar({ address, size = "md", className = "" }: Props) {
  const initials = address.slice(2, 4).toUpperCase();

  return (
    <div
      className={`${sizeMap[size]} rounded-full flex items-center justify-center text-white font-semibold ring-2 ring-white shadow-sm shrink-0 ${className}`}
      style={{ background: addressToGradient(address) }}
      title={address}
    >
      {initials}
    </div>
  );
}

export function AvatarStack({
  addresses,
  max = 4,
}: {
  addresses: readonly string[];
  max?: number;
}) {
  const shown = addresses.slice(0, max);
  const overflow = addresses.length - max;

  return (
    <div className="flex -space-x-2">
      {shown.map((a) => (
        <MemberAvatar key={a} address={a} size="sm" />
      ))}
      {overflow > 0 && (
        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-medium text-slate-600 ring-2 ring-white">
          +{overflow}
        </div>
      )}
    </div>
  );
}
