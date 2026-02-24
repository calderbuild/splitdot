import { type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { Split, Sparkles, AlertTriangle } from "lucide-react";
import ConnectWallet from "./ConnectWallet";

const POLKADOT_HUB_CHAIN_ID = 420420417;

function WrongNetworkBanner() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  if (!isConnected || chainId === POLKADOT_HUB_CHAIN_ID) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Please switch to Polkadot Hub Testnet to use SplitDot</span>
        </div>
        <button
          onClick={() => switchChain({ chainId: POLKADOT_HUB_CHAIN_ID })}
          className="text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 px-3 py-1 rounded-lg transition-colors cursor-pointer shrink-0"
        >
          Switch Network
        </button>
      </div>
    </div>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <div className="min-h-screen mesh-bg">
      <WrongNetworkBanner />
      <nav className="glass-nav sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 cursor-pointer group min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-md shadow-primary/25 group-hover:scale-105 transition-transform">
              <Split className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-lg leading-none text-display font-bold text-slate-900">
                Split<span className="text-primary">Dot</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 tracking-wide">
                On-chain group finance
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            {!isHome && (
              <Link
                to="/"
                className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white/70 border border-slate-200 px-2.5 py-1 rounded-full hover:bg-white transition-colors"
              >
                <Sparkles className="w-3 h-3 text-secondary" />
                Dashboard
              </Link>
            )}
            <ConnectWallet />
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-7 sm:py-10">
        {children}
      </main>
    </div>
  );
}
