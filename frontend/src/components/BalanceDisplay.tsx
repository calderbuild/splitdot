import { formatBalance } from "../lib/utils";

type Props = {
  balance: bigint;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeMap = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-3xl",
};

export default function BalanceDisplay({
  balance,
  size = "md",
  className = "",
}: Props) {
  const isPositive = balance > 0n;
  const isNegative = balance < 0n;

  const colorClass = isPositive
    ? "text-primary"
    : isNegative
      ? "text-negative"
      : "text-slate-400";

  return (
    <span
      className={`font-bold tabular-nums ${sizeMap[size]} ${colorClass} ${className}`}
    >
      {formatBalance(balance)}
    </span>
  );
}
