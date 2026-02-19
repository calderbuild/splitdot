import { Link } from "react-router-dom";
import { useAccount, useReadContract } from "wagmi";
import { Plus, Users, Wallet, Sparkles, ArrowUpRight } from "lucide-react";
import Layout from "../components/Layout";
import BalanceDisplay from "../components/BalanceDisplay";
import { AvatarStack } from "../components/MemberAvatar";
import EmptyState from "../components/EmptyState";
import { SkeletonCard } from "../components/Skeleton";
import { CONTRACTS, GroupLedgerABI } from "../contracts";

const ledgerAddress = CONTRACTS.GroupLedger as `0x${string}`;

function GroupCard({ groupId }: { groupId: number }) {
  const { address } = useAccount();

  const { data: groupData } = useReadContract({
    address: ledgerAddress,
    abi: GroupLedgerABI,
    functionName: "getGroup",
    args: [BigInt(groupId)],
  });

  const { data: balance } = useReadContract({
    address: ledgerAddress,
    abi: GroupLedgerABI,
    functionName: "getBalance",
    args: [BigInt(groupId), address!],
    query: { enabled: !!address },
  });

  const { data: expenseCount } = useReadContract({
    address: ledgerAddress,
    abi: GroupLedgerABI,
    functionName: "getExpenseCount",
    args: [BigInt(groupId)],
  });

  if (!groupData) return <SkeletonCard />;

  const [, members, active] = groupData;
  if (!active) return null;

  const isMember = address && members.some(
    (m) => m.toLowerCase() === address.toLowerCase()
  );
  if (!isMember) return null;

  const myBalance = balance ?? 0n;
  const isPositive = myBalance > 0n;
  const isNegative = myBalance < 0n;

  return (
    <Link
      to={`/groups/${groupId}`}
      className="surface-card rounded-2xl p-5 hover:-translate-y-0.5 hover:shadow-xl transition-all duration-200 cursor-pointer group block animate-fade-in"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.14em]">
          Group #{groupId}
        </span>
        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
          {expenseCount?.toString() ?? "0"} expenses
        </span>
      </div>

      <BalanceDisplay balance={myBalance} size="lg" className="block mb-4 leading-none" />

      <p className="text-xs text-slate-500 mb-4">
        {isPositive
          ? "You should receive funds"
          : isNegative
            ? "You owe other members"
            : "You are currently settled"}
      </p>

      <div className="flex items-center justify-between">
        <AvatarStack addresses={members} />
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            {members.length} member{members.length !== 1 ? "s" : ""}
          </span>
          <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-secondary transition-colors" />
        </div>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { isConnected } = useAccount();

  const { data: groupCount, isLoading } = useReadContract({
    address: ledgerAddress,
    abi: GroupLedgerABI,
    functionName: "groupCount",
    query: { enabled: isConnected },
  });

  const count = groupCount ? Number(groupCount) : 0;

  // Calculate total balance across all groups
  const groupIds = Array.from({ length: count }, (_, i) => i);

  return (
    <Layout>
      <section className="surface-card rounded-3xl px-6 py-7 sm:px-8 sm:py-8 mb-8 animate-fade-in">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase mb-2">
              Expense workspace
            </p>
            <h1 className="text-3xl sm:text-4xl text-display font-bold text-slate-900 mb-1">
              Your Groups
            </h1>
            <p className="text-slate-600 text-sm">
              Split expenses, settle on-chain with USDC
            </p>
          </div>

          {isConnected && (
            <Link
              to="/groups/new"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors cursor-pointer shadow-md shadow-primary/20 pulse-glow"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Create Group</span>
            </Link>
          )}
        </div>

        <div className="flex flex-wrap gap-2.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-full">
            <Sparkles className="w-3.5 h-3.5 text-secondary" />
            {count} active group{count !== 1 ? "s" : ""}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-full">
            Polkadot Hub EVM
          </span>
        </div>
      </section>

      {!isConnected ? (
        <EmptyState
          icon={Wallet}
          title="Connect your wallet"
          description="Connect your wallet to view and manage group expenses."
        />
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : count === 0 ? (
        <EmptyState
          icon={Users}
          title="No groups yet"
          description="Create your first group to start splitting expenses with friends."
          action={
            <Link
              to="/groups/new"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold text-sm px-6 py-3 rounded-xl transition-colors cursor-pointer shadow-md shadow-primary/20"
            >
              <Plus className="w-4 h-4" />
              Create Group
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {groupIds.map((id) => (
            <GroupCard key={id} groupId={id} />
          ))}
        </div>
      )}
    </Layout>
  );
}
