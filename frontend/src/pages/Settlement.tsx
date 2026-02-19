import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Loader2,
  Handshake,
} from "lucide-react";
import Layout from "../components/Layout";
import MemberAvatar from "../components/MemberAvatar";
import EmptyState from "../components/EmptyState";
import { CONTRACTS, GroupLedgerABI, SettlementABI, MockUSDCABI } from "../contracts";
import {
  formatUSDC,
  truncateAddress,
  calculateSettlements,
  type Settlement as SettlementType,
} from "../lib/utils";
import { useToast } from "../lib/toast";

const ledgerAddress = CONTRACTS.GroupLedger as `0x${string}`;
const settlementAddress = CONTRACTS.Settlement as `0x${string}`;
const usdcAddress = CONTRACTS.MockUSDC as `0x${string}`;

function SettlementRow({
  settlement,
  userAddress,
  groupId,
}: {
  settlement: SettlementType;
  userAddress: string | undefined;
  groupId: number;
}) {
  const { addToast } = useToast();
  const isDebtor =
    userAddress && settlement.from.toLowerCase() === userAddress.toLowerCase();

  // Check USDC allowance
  const { data: allowance } = useReadContract({
    address: usdcAddress,
    abi: MockUSDCABI,
    functionName: "allowance",
    args: [settlement.from as `0x${string}`, settlementAddress],
    query: { enabled: !!isDebtor },
  });

  const needsApproval = isDebtor && (allowance ?? 0n) < settlement.amount;

  // Approve USDC
  const {
    writeContract: approveWrite,
    data: approveHash,
    isPending: approvePending,
  } = useWriteContract();

  const { isLoading: approveConfirming, isSuccess: approveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash });

  // Settle
  const {
    writeContract: settleWrite,
    data: settleHash,
    isPending: settlePending,
  } = useWriteContract();

  const { isLoading: settleConfirming, isSuccess: settleSuccess } =
    useWaitForTransactionReceipt({ hash: settleHash });

  function handleApprove() {
    approveWrite(
      {
        address: usdcAddress,
        abi: MockUSDCABI,
        functionName: "approve",
        args: [settlementAddress, settlement.amount],
      },
      {
        onError: (err) => addToast("error", `Approval failed: ${err.message}`),
        onSuccess: () => addToast("info", "Approval submitted..."),
      }
    );
  }

  function handleSettle() {
    settleWrite(
      {
        address: settlementAddress,
        abi: SettlementABI,
        functionName: "settleWith",
        args: [
          BigInt(groupId),
          settlement.to as `0x${string}`,
          settlement.amount,
        ],
      },
      {
        onError: (err) =>
          addToast("error", `Settlement failed: ${err.message}`),
        onSuccess: () => addToast("success", "Settlement complete!"),
      }
    );
  }

  const isWorking =
    approvePending || approveConfirming || settlePending || settleConfirming;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 animate-fade-in">
      <div className="flex items-center gap-3">
        {/* From */}
        <div className="flex items-center gap-2 min-w-0">
          <MemberAvatar address={settlement.from} size="sm" />
          <span className="font-mono text-sm text-slate-700 truncate">
            {truncateAddress(settlement.from)}
          </span>
        </div>

        {/* Arrow + Amount */}
        <div className="flex flex-col items-center shrink-0 px-2">
          <span className="text-xs font-bold text-slate-800 tabular-nums mb-0.5">
            {formatUSDC(settlement.amount)}
          </span>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </div>

        {/* To */}
        <div className="flex items-center gap-2 min-w-0">
          <MemberAvatar address={settlement.to} size="sm" />
          <span className="font-mono text-sm text-slate-700 truncate">
            {truncateAddress(settlement.to)}
          </span>
        </div>

        {/* Action */}
        <div className="ml-auto shrink-0">
          {settleSuccess ? (
            <CheckCircle className="w-5 h-5 text-primary" />
          ) : isDebtor ? (
            isWorking ? (
              <Loader2 className="w-5 h-5 text-secondary animate-spin" />
            ) : needsApproval && !approveSuccess ? (
              <button
                onClick={handleApprove}
                className="text-xs font-semibold text-secondary bg-secondary/10 hover:bg-secondary/20 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                Approve
              </button>
            ) : (
              <button
                onClick={handleSettle}
                className="text-xs font-semibold text-white bg-primary hover:bg-primary-dark px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                Pay
              </button>
            )
          ) : (
            <span className="text-xs text-slate-400">Waiting</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SettlementPage() {
  const { id } = useParams<{ id: string }>();
  const groupId = Number(id);
  const { address } = useAccount();
  const { addToast } = useToast();

  const { data: balancesData } = useReadContract({
    address: ledgerAddress,
    abi: GroupLedgerABI,
    functionName: "getBalances",
    args: [BigInt(groupId)],
  });

  const members = balancesData ? balancesData[0] : [];
  const balances = balancesData ? balancesData[1] : [];
  const settlements = calculateSettlements(members, balances);

  // Settle All
  const {
    writeContract: settleAllWrite,
    data: settleAllHash,
    isPending: settleAllPending,
  } = useWriteContract();

  const { isLoading: settleAllConfirming } = useWaitForTransactionReceipt({
    hash: settleAllHash,
  });

  function handleSettleAll() {
    settleAllWrite(
      {
        address: settlementAddress,
        abi: SettlementABI,
        functionName: "settleAll",
        args: [BigInt(groupId)],
      },
      {
        onError: (err) =>
          addToast("error", `Settle all failed: ${err.message}`),
        onSuccess: () => addToast("success", "All debts settled!"),
      }
    );
  }

  const isSettlingAll = settleAllPending || settleAllConfirming;

  return (
    <Layout>
      <div className="max-w-lg mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            to={`/groups/${groupId}`}
            className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Settle Up</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Group #{groupId} - USDC settlement
            </p>
          </div>
        </div>

        {settlements.length === 0 ? (
          <EmptyState
            icon={Handshake}
            title="All settled!"
            description="Everyone in this group is square. No outstanding balances."
          />
        ) : (
          <>
            {/* Settlement Summary */}
            <div className="glass-card rounded-2xl p-5 mb-6">
              <p className="text-sm text-slate-500 mb-1">Optimized transfers</p>
              <p className="text-2xl font-bold text-slate-900">
                {settlements.length} payment
                {settlements.length !== 1 ? "s" : ""}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Net settlement minimizes the number of transfers needed
              </p>
            </div>

            {/* Settlement Rows */}
            <div className="space-y-3 mb-6">
              {settlements.map((s, i) => (
                <SettlementRow
                  key={i}
                  settlement={s}
                  userAddress={address}
                  groupId={groupId}
                />
              ))}
            </div>

            {/* Settle All Button */}
            <button
              onClick={handleSettleAll}
              disabled={isSettlingAll}
              className="w-full py-3.5 bg-secondary hover:bg-secondary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              {isSettlingAll ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {settleAllPending ? "Confirm in wallet..." : "Settling..."}
                </>
              ) : (
                <>
                  <Handshake className="w-4 h-4" />
                  Settle All at Once
                </>
              )}
            </button>

            <p className="text-xs text-slate-400 text-center mt-3">
              All debtors must have approved USDC spending first
            </p>
          </>
        )}
      </div>
    </Layout>
  );
}
