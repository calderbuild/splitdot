import { type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Split } from "lucide-react";
import ConnectWallet from "./ConnectWallet";

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <div className="min-h-screen mesh-bg">
      {/* Nav */}
      <nav className="glass-nav sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 cursor-pointer group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-emerald-400 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <Split className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900 tracking-tight">
              Split<span className="text-primary">Dot</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            {!isHome && (
              <Link
                to="/"
                className="text-sm text-slate-500 hover:text-slate-700 transition-colors hidden sm:block"
              >
                Dashboard
              </Link>
            )}
            <ConnectWallet />
          </div>
        </div>
      </nav>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
