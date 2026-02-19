import "dotenv/config";
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "PAS");

  if (balance === 0n) {
    console.error("No balance! Get test tokens from https://faucet.polkadot.io/?parachain=1111");
    process.exit(1);
  }

  // 1. Deploy MockUSDC
  console.log("\n--- Deploying MockUSDC ---");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();
  const usdcAddr = await usdc.getAddress();
  console.log("MockUSDC deployed to:", usdcAddr);

  // 2. Deploy GroupLedger
  console.log("\n--- Deploying GroupLedger ---");
  const GroupLedger = await ethers.getContractFactory("GroupLedger");
  const ledger = await GroupLedger.deploy();
  await ledger.waitForDeployment();
  const ledgerAddr = await ledger.getAddress();
  console.log("GroupLedger deployed to:", ledgerAddr);

  // 3. Deploy Settlement
  console.log("\n--- Deploying Settlement ---");
  const Settlement = await ethers.getContractFactory("Settlement");
  const settlement = await Settlement.deploy(usdcAddr, ledgerAddr);
  await settlement.waitForDeployment();
  const settlementAddr = await settlement.getAddress();
  console.log("Settlement deployed to:", settlementAddr);

  // Summary
  console.log("\n========== Deployment Summary ==========");
  console.log("MockUSDC:     ", usdcAddr);
  console.log("GroupLedger:  ", ledgerAddr);
  console.log("Settlement:   ", settlementAddr);
  console.log("Network:       Passet Hub Testnet");
  console.log("Chain ID:      420420422");
  console.log("Explorer:      https://blockscout-passet-hub.parity-testnet.parity.io/");
  console.log("=========================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
