import { Link } from "react-router-dom";
import { useAccount, useReadContract } from "wagmi";
import { Plus, Users, Wallet } from "lucide-react";
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

  return (
    <Link
      to={`/groups/${groupId}`}
      className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:border-slate-300 transition-all duration-200 cursor-pointer group block animate-fade-in"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          Group #{groupId}
        </span>
        <span className="text-xs text-slate-400">
          {expenseCount?.toString() ?? "0"} expenses
        </span>
      </div>

      <BalanceDisplay balance={myBalance} size="lg" className="block mb-4" />

      <div className="flex items-center justify-between">
        <AvatarStack addresses={members} />
        <span className="text-xs text-slate-400">
          {members.length} member{members.length !== 1 ? "s" : ""}
        </span>
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
      {/* Hero */}
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">
              Your Groups
            </h1>
            <p className="text-slate-500 text-sm">
              Split expenses, settle on-chain with USDC
            </p>
          </div>

          {isConnected && (
            <Link
              to="/groups/new"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors cursor-pointer shadow-sm pulse-glow"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Create Group</span>
            </Link>
          )}
        </div>
      </div>

      {/* Content */}
      {!isConnected ? (
        <EmptyState
          icon={Wallet}
          title="Connect your wallet"
          description="Connect your wallet to view and manage group expenses."
        />
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold text-sm px-6 py-3 rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create Group
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groupIds.map((id) => (
            <GroupCard key={id} groupId={id} />
          ))}
        </div>
      )}
    </Layout>
  );
}
