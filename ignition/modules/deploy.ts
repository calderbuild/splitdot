import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const SplitDotModule = buildModule("SplitDot", (m) => {
  // Deploy MockUSDC
  const mockUSDC = m.contract("MockUSDC");

  // Deploy GroupLedger
  const groupLedger = m.contract("GroupLedger");

  // Deploy Settlement with MockUSDC and GroupLedger addresses
  const settlement = m.contract("Settlement", [mockUSDC, groupLedger]);

  return { mockUSDC, groupLedger, settlement };
});

export default SplitDotModule;
