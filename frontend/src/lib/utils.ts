export function formatUSDC(amount: bigint): string {
  const dollars = Number(amount) / 1e6;
  return `$${dollars.toFixed(2)}`;
}

export function formatBalance(balance: bigint): string {
  if (balance === 0n) return "$0.00";
  const isNeg = balance < 0n;
  const abs = isNeg ? -balance : balance;
  const dollars = Number(abs) / 1e6;
  const str = dollars.toFixed(2);
  return isNeg ? `-$${str}` : `+$${str}`;
}

export function truncateAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function addressToHue(address: string): number {
  const hash = parseInt(address.slice(2, 8), 16);
  return hash % 360;
}

export function addressToGradient(address: string): string {
  const hue = addressToHue(address);
  return `linear-gradient(135deg, hsl(${hue}, 70%, 58%), hsl(${(hue + 40) % 360}, 65%, 50%))`;
}

export function parseUSDCInput(value: string): bigint {
  const num = parseFloat(value);
  if (isNaN(num) || num < 0) return 0n;
  return BigInt(Math.round(num * 1e6));
}

export type Settlement = {
  from: string;
  to: string;
  amount: bigint;
};

export function calculateSettlements(
  members: readonly string[],
  balances: readonly bigint[]
): Settlement[] {
  const debtors: { address: string; amount: bigint }[] = [];
  const creditors: { address: string; amount: bigint }[] = [];

  for (let i = 0; i < members.length; i++) {
    if (balances[i] < 0n) {
      debtors.push({ address: members[i], amount: -balances[i] });
    } else if (balances[i] > 0n) {
      creditors.push({ address: members[i], amount: balances[i] });
    }
  }

  const transfers: Settlement[] = [];
  let di = 0;
  let ci = 0;

  while (di < debtors.length && ci < creditors.length) {
    const amount =
      debtors[di].amount < creditors[ci].amount
        ? debtors[di].amount
        : creditors[ci].amount;

    if (amount > 0n) {
      transfers.push({
        from: debtors[di].address,
        to: creditors[ci].address,
        amount,
      });
      debtors[di].amount -= amount;
      creditors[ci].amount -= amount;
    }

    if (debtors[di].amount === 0n) di++;
    if (creditors[ci].amount === 0n) ci++;
  }

  return transfers;
}

const CATEGORIES: Record<string, string> = {
  food_drink: "Food & Drink",
  transport: "Transport",
  shopping: "Shopping",
  entertainment: "Entertainment",
  bills: "Bills & Utilities",
  travel: "Travel",
  health: "Health",
  other: "Other",
};

export function categoryLabel(key: string): string {
  return CATEGORIES[key] || key;
}

export const CATEGORY_OPTIONS = Object.entries(CATEGORIES).map(
  ([value, label]) => ({ value, label })
);
