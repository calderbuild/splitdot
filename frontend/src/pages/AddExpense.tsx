import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import {
  ArrowLeft,
  Camera,
  Loader2,
  DollarSign,
  Users,
  ToggleLeft,
  ToggleRight,
  Upload,
  Sparkles,
  X,
} from "lucide-react";
import Layout from "../components/Layout";
import MemberAvatar from "../components/MemberAvatar";
import { truncateAddress, parseUSDCInput, CATEGORY_OPTIONS } from "../lib/utils";
import { CONTRACTS, GroupLedgerABI } from "../contracts";
import { useToast } from "../lib/toast";
import { scanReceipt, fileToBase64, type ReceiptResult } from "../lib/ai";

const ledgerAddress = CONTRACTS.GroupLedger as `0x${string}`;

export default function AddExpense() {
  const { id } = useParams<{ id: string }>();
  const groupId = Number(id);
  const navigate = useNavigate();
  const { address } = useAccount();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("food_drink");
  const [splitMode, setSplitMode] = useState<"equal" | "custom">("equal");
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());

  // AI Scanner state
  const [scanning, setScanning] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ReceiptResult | null>(null);

  const { data: groupData } = useReadContract({
    address: ledgerAddress,
    abi: GroupLedgerABI,
    functionName: "getGroup",
    args: [BigInt(groupId)],
  });

  const members = groupData ? groupData[1] : [];

  useEffect(() => {
    if (members.length > 0 && selectedMembers.size === 0) {
      setSelectedMembers(new Set(members.map((m) => m.toLowerCase())));
    }
  }, [members.length]);

  const { writeContract, data: hash, isPending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    if (isSuccess) {
      addToast("success", "Expense added!");
      navigate(`/groups/${groupId}`);
    }
  }, [isSuccess]);

  async function handleImageSelected(file: File) {
    if (!file.type.startsWith("image/")) {
      addToast("error", "Please select an image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      addToast("error", "Image too large (max 10MB)");
      return;
    }

    const base64 = await fileToBase64(file);
    setPreviewUrl(base64);
    setScanning(true);
    setScanResult(null);

    try {
      const result = await scanReceipt(base64);
      setScanResult(result);

      // Auto-fill form fields
      if (result.amount && parseFloat(result.amount) > 0) {
        setAmount(result.amount);
      }
      if (result.description) {
        setDescription(result.description);
      }
      if (result.category) {
        setCategory(result.category);
      }

      addToast("success", "Receipt scanned! Fields auto-filled.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Scan failed";
      addToast("error", msg);
    } finally {
      setScanning(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleImageSelected(file);
    e.target.value = "";
  }

  function clearScan() {
    setPreviewUrl(null);
    setScanResult(null);
  }

  function toggleMember(m: string) {
    const key = m.toLowerCase();
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleSubmit() {
    if (!address || !amount || !description) return;

    const totalRaw = parseUSDCInput(amount);
    if (totalRaw === 0n) {
      addToast("error", "Amount must be greater than 0");
      return;
    }

    const activeMemberAddrs = members.filter((m) =>
      selectedMembers.has(m.toLowerCase())
    );

    if (activeMemberAddrs.length === 0) {
      addToast("error", "Select at least one member to split with");
      return;
    }

    let splits: { member: `0x${string}`; amount: bigint }[];

    if (splitMode === "equal") {
      const share = totalRaw / BigInt(activeMemberAddrs.length);
      const remainder = totalRaw - share * BigInt(activeMemberAddrs.length);
      splits = activeMemberAddrs.map((m, i) => ({
        member: m as `0x${string}`,
        amount: i === 0 ? share + remainder : share,
      }));
    } else {
      splits = activeMemberAddrs.map((m) => ({
        member: m as `0x${string}`,
        amount: parseUSDCInput(customSplits[m.toLowerCase()] || "0"),
      }));
      const splitTotal = splits.reduce((s, x) => s + x.amount, 0n);
      if (splitTotal !== totalRaw) {
        addToast(
          "error",
          `Split total ($${(Number(splitTotal) / 1e6).toFixed(2)}) doesn't match amount ($${(Number(totalRaw) / 1e6).toFixed(2)})`
        );
        return;
      }
    }

    writeContract(
      {
        address: ledgerAddress,
        abi: GroupLedgerABI,
        functionName: "addExpense",
        args: [BigInt(groupId), totalRaw, description, category, splits],
      },
      {
        onError: (err) => {
          addToast("error", `Transaction failed: ${err.message}`);
        },
      }
    );
  }

  const isWorking = isPending || isConfirming;

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
          <h1 className="text-xl font-bold text-slate-900">Add Expense</h1>
        </div>

        {/* AI Receipt Scanner */}
        <div className="bg-gradient-to-br from-secondary/5 to-primary/5 rounded-2xl border border-secondary/20 p-5 mb-6">
          {previewUrl ? (
            // Preview + results
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-secondary" />
                  <span className="text-sm font-semibold text-slate-700">
                    {scanning ? "Scanning receipt..." : "Receipt Scanned"}
                  </span>
                </div>
                <button
                  onClick={clearScan}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex gap-4">
                {/* Thumbnail */}
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                  <img
                    src={previewUrl}
                    alt="Receipt"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Status / Results */}
                <div className="flex-1 min-w-0">
                  {scanning ? (
                    <div className="flex items-center gap-2 text-sm text-secondary">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing with AI...
                    </div>
                  ) : scanResult ? (
                    <div className="space-y-1.5">
                      <p className="text-sm text-slate-700">
                        <span className="font-medium">Amount:</span> $
                        {scanResult.amount}
                      </p>
                      <p className="text-sm text-slate-700 truncate">
                        <span className="font-medium">Merchant:</span>{" "}
                        {scanResult.description}
                      </p>
                      {scanResult.items.length > 0 && (
                        <p className="text-xs text-slate-400">
                          {scanResult.items.length} item
                          {scanResult.items.length !== 1 ? "s" : ""} detected
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Line items */}
              {scanResult && scanResult.items.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-200/60">
                  <p className="text-xs font-semibold text-slate-500 mb-2">
                    LINE ITEMS
                  </p>
                  <div className="space-y-1">
                    {scanResult.items.map((item, i) => (
                      <div
                        key={i}
                        className="flex justify-between text-xs text-slate-600"
                      >
                        <span className="truncate mr-2">{item.name}</span>
                        <span className="tabular-nums shrink-0">
                          ${parseFloat(item.amount).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Upload area
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mx-auto mb-3">
                <Camera className="w-6 h-6 text-secondary" />
              </div>
              <p className="text-sm font-semibold text-slate-700 mb-1">
                AI Receipt Scanner
              </p>
              <p className="text-xs text-slate-400 mb-4">
                Take a photo or upload a receipt image to auto-fill
              </p>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary-dark text-white text-sm font-medium rounded-xl transition-colors cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  Camera
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-xl transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  Upload
                </button>
              </div>

              {/* Hidden file inputs */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          )}
        </div>

        {/* Amount */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Amount (USDC)
          </label>
          <div className="relative">
            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full pl-11 pr-4 py-3 text-2xl font-bold text-slate-900 tabular-nums rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>
        </div>

        {/* Description + Category */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Dinner at Ramen Shop"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all cursor-pointer bg-white"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Split Mode */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-semibold text-slate-700">
                Split Between
              </span>
            </div>
            <button
              onClick={() =>
                setSplitMode((m) => (m === "equal" ? "custom" : "equal"))
              }
              className="flex items-center gap-1.5 text-xs font-medium text-secondary cursor-pointer"
            >
              {splitMode === "equal" ? (
                <ToggleLeft className="w-5 h-5" />
              ) : (
                <ToggleRight className="w-5 h-5" />
              )}
              {splitMode === "equal" ? "Equal" : "Custom"}
            </button>
          </div>

          <div className="space-y-2">
            {members.map((m) => {
              const isSelected = selectedMembers.has(m.toLowerCase());
              const isYou =
                address && m.toLowerCase() === address.toLowerCase();

              return (
                <div
                  key={m}
                  onClick={() => toggleMember(m)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-primary/5 border border-primary/15"
                      : "bg-slate-50 border border-transparent hover:bg-slate-100"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleMember(m)}
                    className="accent-primary cursor-pointer"
                  />
                  <MemberAvatar address={m} size="sm" />
                  <span className="font-mono text-sm text-slate-700 flex-1">
                    {truncateAddress(m)}
                    {isYou && (
                      <span className="text-primary font-medium ml-1.5">
                        (You)
                      </span>
                    )}
                  </span>

                  {splitMode === "custom" && isSelected && (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={customSplits[m.toLowerCase()] || ""}
                      onChange={(e) => {
                        e.stopPropagation();
                        setCustomSplits((prev) => ({
                          ...prev,
                          [m.toLowerCase()]: e.target.value,
                        }));
                      }}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="0.00"
                      className="w-24 px-3 py-1.5 text-right text-sm font-mono tabular-nums rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  )}
                </div>
              );
            })}
          </div>

          {splitMode === "equal" && amount && selectedMembers.size > 0 && (
            <p className="text-xs text-slate-400 mt-3">
              ${(parseFloat(amount) / selectedMembers.size).toFixed(2)} per
              person
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={isWorking || !amount || !description}
          className="w-full py-3.5 bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          {isWorking ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {isPending ? "Confirm in wallet..." : "Adding expense..."}
            </>
          ) : (
            "Add Expense"
          )}
        </button>
      </div>
    </Layout>
  );
}
