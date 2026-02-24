import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ArrowLeft, Plus, X, Users, Loader2 } from "lucide-react";
import Layout from "../components/Layout";
import MemberAvatar from "../components/MemberAvatar";
import { truncateAddress } from "../lib/utils";
import { CONTRACTS, GroupLedgerABI } from "../contracts";
import { useToast } from "../lib/toast";

const ledgerAddress = CONTRACTS.GroupLedger as `0x${string}`;

export default function CreateGroup() {
  const { address, isConnected } = useAccount();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [members, setMembers] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [inputError, setInputError] = useState("");

  const { writeContract, data: hash, isPending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    if (isSuccess) {
      addToast("success", "Group created successfully!");
      navigate("/");
    }
  }, [isSuccess]);

  function addMember() {
    const addr = input.trim();
    setInputError("");

    if (!addr.match(/^0x[a-fA-F0-9]{40}$/)) {
      setInputError("Invalid Ethereum address");
      return;
    }

    if (address && addr.toLowerCase() === address.toLowerCase()) {
      setInputError("You are automatically added as a member");
      return;
    }

    if (members.some((m) => m.toLowerCase() === addr.toLowerCase())) {
      setInputError("Address already added");
      return;
    }

    setMembers((prev) => [...prev, addr]);
    setInput("");
  }

  function removeMember(addr: string) {
    setMembers((prev) => prev.filter((m) => m !== addr));
  }

  function handleCreate() {
    if (!isConnected) return;

    writeContract(
      {
        address: ledgerAddress,
        abi: GroupLedgerABI,
        functionName: "createGroup",
        args: [members as `0x${string}`[]],
      },
      {
        onError: (err) => {
          addToast("error", `Failed to create group: ${err.message}`);
        },
      }
    );
  }

  const isWorking = isPending || isConfirming;

  return (
    <Layout>
      <div className="max-w-lg mx-auto animate-fade-in">
        <div className="flex items-center gap-3 mb-8">
          <Link
            to="/"
            className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </Link>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              New workspace
            </p>
            <h1 className="text-2xl text-display font-bold text-slate-900">Create Group</h1>
          </div>
        </div>

        <div className="surface-card rounded-2xl p-6 mb-4">
          <label className="block text-sm font-semibold text-slate-700 mb-3">
            Add Members
          </label>

          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setInputError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && addMember()}
              placeholder="0x... member address"
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
            <button
              onClick={addMember}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {inputError && (
            <p className="text-xs text-negative mb-3" role="alert">
              {inputError}
            </p>
          )}

          {/* Member List */}
          <div className="space-y-2 mt-4">
            {/* Creator (you) */}
            {address && (
              <div className="flex items-center gap-3 px-3 py-2 bg-primary/5 rounded-xl border border-primary/10">
                <MemberAvatar address={address} size="sm" />
                <span className="font-mono text-sm text-slate-700">
                  {truncateAddress(address)}
                </span>
                <span className="text-xs text-primary font-medium ml-auto">
                  You
                </span>
              </div>
            )}

            {members.map((m) => (
              <div
                key={m}
                className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-xl"
              >
                <MemberAvatar address={m} size="sm" />
                <span className="font-mono text-sm text-slate-700">
                  {truncateAddress(m)}
                </span>
                <button
                  onClick={() => removeMember(m)}
                  className="ml-auto text-slate-400 hover:text-negative transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card rounded-2xl p-6 mb-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            Group Preview
          </h3>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-emerald-400 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">
                {members.length + 1} members
              </p>
              <p className="text-xs text-slate-500">
                Including you as group creator
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleCreate}
          disabled={isWorking || !isConnected || members.length === 0}
          className="w-full py-3.5 bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-primary/20"
        >
          {isWorking ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {isPending ? "Confirm in wallet..." : "Creating group..."}
            </>
          ) : (
            "Create Group"
          )}
        </button>

        {members.length === 0 && (
          <p className="text-xs text-slate-400 text-center mt-2">
            Add at least one other member to create a group
          </p>
        )}
      </div>
    </Layout>
  );
}
