import { Link, useParams } from "react-router-dom";
import { useAccount, useReadContract } from "wagmi";
import {
  ArrowLeft,
  Plus,
  ArrowRightLeft,
  Receipt,
} from "lucide-react";
import Layout from "../components/Layout";
import BalanceDisplay from "../components/BalanceDisplay";
import MemberAvatar, { AvatarStack } from "../components/MemberAvatar";
import AddressDisplay from "../components/AddressDisplay";
import EmptyState from "../components/EmptyState";
import { SkeletonList } from "../components/Skeleton";
import { CONTRACTS, GroupLedgerABI } from "../contracts";
import { formatUSDC, categoryLabel, truncateAddress } from "../lib/utils";

const ledgerAddress = CONTRACTS.GroupLedger as `0x${string}`;

function ExpenseCard({ groupId, index }: { groupId: number; index: number }) {
  const { data } = useReadContract({
    address: ledgerAddress,
    abi: GroupLedgerABI,
    functionName: "getExpense",
    args: [BigInt(groupId), BigInt(index)],
  });

  if (!data) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
        <div className="skeleton h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-40 rounded" />
          <div className="skeleton h-3 w-24 rounded" />
        </div>
      </div>
    );
  }

  const [payer, amount, description, category, timestamp] = data;
  const date = new Date(Number(timestamp) * 1000);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 hover:shadow-sm transition-shadow animate-fade-in">
      <MemberAvatar address={payer} />

      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-800 truncate">{description}</p>
        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
          <span>{truncateAddress(payer)} paid</span>
          <span className="inline-block w-1 h-1 rounded-full bg-slate-300" />
          <span>{categoryLabel(category)}</span>
          <span className="inline-block w-1 h-1 rounded-full bg-slate-300" />
          <span>
            {date.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      </div>

      <span className="font-bold text-slate-800 tabular-nums shrink-0">
        {formatUSDC(amount)}
      </span>
    </div>
  );
}

function BalanceCard({
  address: memberAddr,
  balance,
  isYou,
}: {
  address: string;
  balance: bigint;
  isYou: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 flex items-center gap-3 ${
        isYou ? "bg-primary/5 border-primary/15" : "bg-white border-slate-200"
      }`}
    >
      <MemberAvatar address={memberAddr} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <AddressDisplay
            address={memberAddr}
            className="text-slate-700"
          />
          {isYou && (
            <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
              YOU
            </span>
          )}
        </div>
      </div>
      <BalanceDisplay balance={balance} size="sm" />
    </div>
  );
}

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const groupId = Number(id);
  const { address } = useAccount();

  const { data: groupData, isLoading: loadingGroup } = useReadContract({
    address: ledgerAddress,
    abi: GroupLedgerABI,
    functionName: "getGroup",
    args: [BigInt(groupId)],
  });

  const { data: balancesData } = useReadContract({
    address: ledgerAddress,
    abi: GroupLedgerABI,
    functionName: "getBalances",
    args: [BigInt(groupId)],
  });

  const { data: expenseCount } = useReadContract({
    address: ledgerAddress,
    abi: GroupLedgerABI,
    functionName: "getExpenseCount",
    args: [BigInt(groupId)],
  });

  const members = groupData ? groupData[1] : [];
  const balances = balancesData ? balancesData[1] : [];
  const balanceMembers = balancesData ? balancesData[0] : [];
  const count = expenseCount ? Number(expenseCount) : 0;
  const expenseIds = Array.from({ length: count }, (_, i) => count - 1 - i);

  return (
    <Layout>
      <div className="max-w-2xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/"
            className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900">
              Group #{groupId}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <AvatarStack addresses={members} />
              <span className="text-xs text-slate-400">
                {members.length} members
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6 animate-fade-in-delay-1">
          <Link
            to={`/groups/${groupId}/expense`}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-colors cursor-pointer text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Expense
          </Link>
          <Link
            to={`/groups/${groupId}/settle`}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-colors cursor-pointer text-sm"
          >
            <ArrowRightLeft className="w-4 h-4" />
            Settle Up
          </Link>
        </div>

        {/* Balances */}
        {balanceMembers.length > 0 && (
          <div className="mb-6 animate-fade-in-delay-2">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Balances
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {balanceMembers.map((m, i) => (
                <BalanceCard
                  key={m}
                  address={m}
                  balance={balances[i]}
                  isYou={
                    !!address &&
                    m.toLowerCase() === address.toLowerCase()
                  }
                />
              ))}
            </div>
          </div>
        )}

        {/* Expenses */}
        <div className="animate-fade-in-delay-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Expenses
          </h2>

          {loadingGroup ? (
            <SkeletonList count={3} />
          ) : count === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No expenses yet"
              description="Add your first expense to start tracking."
              action={
                <Link
                  to={`/groups/${groupId}/expense`}
                  className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Add Expense
                </Link>
              }
            />
          ) : (
            <div className="space-y-2">
              {expenseIds.map((idx) => (
                <ExpenseCard key={idx} groupId={groupId} index={idx} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
