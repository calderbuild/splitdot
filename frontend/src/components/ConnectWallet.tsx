import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Wallet, LogOut, ChevronDown } from "lucide-react";
import { truncateAddress } from "../lib/utils";
import MemberAvatar from "./MemberAvatar";
import { useState, useRef, useEffect } from "react";

export default function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!isConnected) {
    return (
      <button
        onClick={() => connect({ connector: connectors[0] })}
        disabled={isPending}
        className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30"
      >
        <Wallet className="w-4 h-4" />
        {isPending ? "Connecting..." : "Connect"}
      </button>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 bg-white/90 border border-slate-200 hover:bg-white text-sm font-medium px-3 py-2 rounded-xl transition-colors cursor-pointer shadow-sm"
      >
        <MemberAvatar address={address!} size="sm" />
        <span className="font-mono text-slate-700 hidden sm:inline">
          {truncateAddress(address!)}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 bg-white rounded-xl border border-slate-200 shadow-xl py-1 z-30 min-w-[200px] animate-fade-in">
          <div className="px-3 py-2 border-b border-slate-100">
            <p className="text-xs text-slate-400">Connected</p>
            <p className="font-mono text-xs text-slate-700 mt-0.5">
              {truncateAddress(address!)}
            </p>
          </div>
          <button
            onClick={() => {
              disconnect();
              setOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-negative hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
