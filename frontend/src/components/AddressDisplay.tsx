import { truncateAddress } from "../lib/utils";

type Props = {
  address: string;
  className?: string;
};

export default function AddressDisplay({ address, className = "" }: Props) {
  return (
    <span
      className={`font-mono text-sm ${className}`}
      title={address}
    >
      {truncateAddress(address)}
    </span>
  );
}
