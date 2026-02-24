import { expect } from "chai";
import { ethers } from "hardhat";
import { GroupLedger, MockUSDC, Settlement } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("SplitDot", function () {
  let ledger: GroupLedger;
  let usdc: MockUSDC;
  let settlement: Settlement;
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let charlie: SignerWithAddress;

  const USDC_DECIMALS = 6;
  const toUSDC = (amount: number) => ethers.parseUnits(amount.toString(), USDC_DECIMALS);

  beforeEach(async function () {
    [owner, alice, bob, charlie] = await ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();

    // Deploy GroupLedger
    const GroupLedger = await ethers.getContractFactory("GroupLedger");
    ledger = await GroupLedger.deploy();

    // Deploy Settlement
    const Settlement = await ethers.getContractFactory("Settlement");
    settlement = await Settlement.deploy(
      await usdc.getAddress(),
      await ledger.getAddress()
    );

    // Authorize Settlement contract to call GroupLedger.resetBalance
    await ledger.setSettlementContract(await settlement.getAddress());

    // Mint USDC to test accounts
    await usdc.mint(alice.address, toUSDC(1000));
    await usdc.mint(bob.address, toUSDC(1000));
    await usdc.mint(charlie.address, toUSDC(1000));
  });

  describe("MockUSDC", function () {
    it("should have 6 decimals", async function () {
      expect(await usdc.decimals()).to.equal(6);
    });

    it("should have correct name and symbol", async function () {
      expect(await usdc.name()).to.equal("USD Coin");
      expect(await usdc.symbol()).to.equal("USDC");
    });

    it("should mint correctly", async function () {
      expect(await usdc.balanceOf(alice.address)).to.equal(toUSDC(1000));
    });
  });

  describe("GroupLedger", function () {
    describe("createGroup", function () {
      it("should create a group with members", async function () {
        const tx = await ledger.createGroup([alice.address, bob.address]);
        await tx.wait();

        const [creator, members, active] = await ledger.getGroup(0);
        expect(creator).to.equal(owner.address);
        expect(members).to.include(owner.address);
        expect(members).to.include(alice.address);
        expect(members).to.include(bob.address);
        expect(active).to.be.true;
        expect(await ledger.groupCount()).to.equal(1);
      });

      it("should emit GroupCreated event", async function () {
        await expect(ledger.createGroup([alice.address]))
          .to.emit(ledger, "GroupCreated")
          .withArgs(0, owner.address, [owner.address, alice.address]);
      });

      it("should auto-include creator as member", async function () {
        await ledger.createGroup([alice.address]);
        expect(await ledger.isMember(0, owner.address)).to.be.true;
      });

      it("should not duplicate creator if passed in members", async function () {
        await ledger.createGroup([owner.address, alice.address]);
        const members = await ledger.getMembers(0);
        expect(members.length).to.equal(2); // owner + alice, no duplicate
      });

      it("should reject zero address member", async function () {
        await expect(
          ledger.createGroup([ethers.ZeroAddress])
        ).to.be.revertedWith("Invalid member address");
      });
    });

    describe("addMember", function () {
      beforeEach(async function () {
        await ledger.createGroup([alice.address]);
      });

      it("should allow creator to add member", async function () {
        await ledger.addMember(0, bob.address);
        expect(await ledger.isMember(0, bob.address)).to.be.true;
      });

      it("should reject non-creator from adding member", async function () {
        await expect(
          ledger.connect(alice).addMember(0, bob.address)
        ).to.be.revertedWith("Only creator can add members");
      });

      it("should reject duplicate member", async function () {
        await expect(
          ledger.addMember(0, alice.address)
        ).to.be.revertedWith("Already a member");
      });
    });

    describe("addExpense", function () {
      beforeEach(async function () {
        await ledger.createGroup([alice.address, bob.address, charlie.address]);
      });

      it("should add expense with even split", async function () {
        const total = toUSDC(30);
        const perPerson = toUSDC(10);
        const splits = [
          { member: alice.address, amount: perPerson },
          { member: bob.address, amount: perPerson },
          { member: charlie.address, amount: perPerson },
        ];

        // Owner pays, everyone splits
        await ledger.addExpense(0, total, "Dinner", "food_drink", splits);

        const count = await ledger.getExpenseCount(0);
        expect(count).to.equal(1);
      });

      it("should update balances correctly after expense", async function () {
        const total = toUSDC(30);
        const perPerson = toUSDC(10);
        const splits = [
          { member: alice.address, amount: perPerson },
          { member: bob.address, amount: perPerson },
          { member: charlie.address, amount: perPerson },
        ];

        // Owner pays $30, split 3 ways ($10 each for alice, bob, charlie)
        await ledger.addExpense(0, total, "Dinner", "food_drink", splits);

        // Owner paid $30, so gets +$30 credit
        // But owner is not in splits, so net = +$30
        expect(await ledger.getBalance(0, owner.address)).to.equal(total);
        // Alice owes $10 -> -$10
        expect(await ledger.getBalance(0, alice.address)).to.equal(-perPerson);
        expect(await ledger.getBalance(0, bob.address)).to.equal(-perPerson);
        expect(await ledger.getBalance(0, charlie.address)).to.equal(-perPerson);
      });

      it("should handle payer included in split", async function () {
        const total = toUSDC(40);
        const perPerson = toUSDC(10);
        const splits = [
          { member: owner.address, amount: perPerson },
          { member: alice.address, amount: perPerson },
          { member: bob.address, amount: perPerson },
          { member: charlie.address, amount: perPerson },
        ];

        // Owner pays $40, split 4 ways including owner
        await ledger.addExpense(0, total, "Lunch", "food_drink", splits);

        // Owner: +40 (paid) - 10 (own share) = +30
        expect(await ledger.getBalance(0, owner.address)).to.equal(toUSDC(30));
        expect(await ledger.getBalance(0, alice.address)).to.equal(-perPerson);
        expect(await ledger.getBalance(0, bob.address)).to.equal(-perPerson);
        expect(await ledger.getBalance(0, charlie.address)).to.equal(-perPerson);
      });

      it("should reject if splits don't sum to total", async function () {
        const splits = [
          { member: alice.address, amount: toUSDC(5) },
          { member: bob.address, amount: toUSDC(5) },
        ];
        await expect(
          ledger.addExpense(0, toUSDC(30), "Wrong", "misc", splits)
        ).to.be.revertedWith("Splits must sum to total amount");
      });

      it("should reject non-member payer", async function () {
        const outsider = (await ethers.getSigners())[4];
        const splits = [{ member: alice.address, amount: toUSDC(10) }];
        await expect(
          ledger.connect(outsider).addExpense(0, toUSDC(10), "Test", "misc", splits)
        ).to.be.revertedWith("Not a group member");
      });

      it("should reject zero amount", async function () {
        const splits = [{ member: alice.address, amount: 0 }];
        await expect(
          ledger.addExpense(0, 0, "Free", "misc", splits)
        ).to.be.revertedWith("Amount must be positive");
      });

      it("should handle multiple expenses", async function () {
        // Expense 1: Owner pays $30, split 3 ways (alice, bob, charlie)
        await ledger.addExpense(0, toUSDC(30), "Dinner", "food_drink", [
          { member: alice.address, amount: toUSDC(10) },
          { member: bob.address, amount: toUSDC(10) },
          { member: charlie.address, amount: toUSDC(10) },
        ]);

        // Expense 2: Alice pays $20, split 2 ways (owner, bob)
        await ledger.connect(alice).addExpense(0, toUSDC(20), "Taxi", "transport", [
          { member: owner.address, amount: toUSDC(10) },
          { member: bob.address, amount: toUSDC(10) },
        ]);

        // Owner: +30 - 10 = +20
        expect(await ledger.getBalance(0, owner.address)).to.equal(toUSDC(20));
        // Alice: -10 + 20 = +10
        expect(await ledger.getBalance(0, alice.address)).to.equal(toUSDC(10));
        // Bob: -10 - 10 = -20
        expect(await ledger.getBalance(0, bob.address)).to.equal(-toUSDC(20));
        // Charlie: -10
        expect(await ledger.getBalance(0, charlie.address)).to.equal(-toUSDC(10));

        expect(await ledger.getExpenseCount(0)).to.equal(2);
      });
    });

    describe("getExpense", function () {
      it("should return expense details", async function () {
        await ledger.createGroup([alice.address, bob.address]);
        await ledger.addExpense(0, toUSDC(20), "Coffee", "food_drink", [
          { member: alice.address, amount: toUSDC(10) },
          { member: bob.address, amount: toUSDC(10) },
        ]);

        const [payer, amount, description, category, , splitMembers, splitAmounts] =
          await ledger.getExpense(0, 0);

        expect(payer).to.equal(owner.address);
        expect(amount).to.equal(toUSDC(20));
        expect(description).to.equal("Coffee");
        expect(category).to.equal("food_drink");
        expect(splitMembers[0]).to.equal(alice.address);
        expect(splitAmounts[0]).to.equal(toUSDC(10));
      });
    });

    describe("getBalances", function () {
      it("should return all member balances", async function () {
        await ledger.createGroup([alice.address, bob.address]);
        await ledger.addExpense(0, toUSDC(20), "Test", "misc", [
          { member: alice.address, amount: toUSDC(10) },
          { member: bob.address, amount: toUSDC(10) },
        ]);

        const [members, balances] = await ledger.getBalances(0);
        expect(members.length).to.equal(3); // owner + alice + bob
        // Find owner's balance
        const ownerIdx = members.indexOf(owner.address);
        expect(balances[ownerIdx]).to.equal(toUSDC(20));
      });
    });

    describe("access control", function () {
      it("should set owner to deployer", async function () {
        expect(await ledger.owner()).to.equal(owner.address);
      });

      it("should set settlement contract", async function () {
        expect(await ledger.settlementContract()).to.equal(
          await settlement.getAddress()
        );
      });

      it("should reject setSettlementContract from non-owner", async function () {
        await expect(
          ledger.connect(alice).setSettlementContract(bob.address)
        ).to.be.revertedWith("Only owner");
      });

      it("should reject setSettlementContract called twice", async function () {
        // Already set in beforeEach
        await expect(
          ledger.setSettlementContract(bob.address)
        ).to.be.revertedWith("Already set");
      });

      it("should reject setSettlementContract with zero address", async function () {
        // Deploy a fresh ledger to test zero address
        const FreshLedger = await ethers.getContractFactory("GroupLedger");
        const freshLedger = await FreshLedger.deploy();
        await expect(
          freshLedger.setSettlementContract(ethers.ZeroAddress)
        ).to.be.revertedWith("Invalid address");
      });

      it("should reject resetBalance from unauthorized caller", async function () {
        await ledger.createGroup([alice.address]);
        await expect(
          ledger.connect(alice).resetBalance(0, alice.address, 100)
        ).to.be.revertedWith("Only settlement contract");
      });

      it("should reject resetBalance from owner (not settlement)", async function () {
        await ledger.createGroup([alice.address]);
        await expect(
          ledger.resetBalance(0, alice.address, 100)
        ).to.be.revertedWith("Only settlement contract");
      });
    });
  });

  describe("Settlement", function () {
    beforeEach(async function () {
      // Create group: owner, alice, bob
      await ledger.createGroup([alice.address, bob.address]);

      // Owner pays $30, split 3 ways (owner $10, alice $10, bob $10)
      await ledger.addExpense(0, toUSDC(30), "Dinner", "food_drink", [
        { member: owner.address, amount: toUSDC(10) },
        { member: alice.address, amount: toUSDC(10) },
        { member: bob.address, amount: toUSDC(10) },
      ]);
      // Owner balance: +20, Alice: -10, Bob: -10
    });

    describe("settleWith", function () {
      it("should settle a specific debt", async function () {
        const settlementAddr = await settlement.getAddress();

        // Alice approves settlement contract
        await usdc.connect(alice).approve(settlementAddr, toUSDC(10));

        // Alice settles her $10 debt with owner
        await settlement.connect(alice).settleWith(0, owner.address, toUSDC(10));

        // Alice's balance should be 0
        expect(await ledger.getBalance(0, alice.address)).to.equal(0);
        // Owner's credit reduced by $10
        expect(await ledger.getBalance(0, owner.address)).to.equal(toUSDC(10));

        // Check USDC transferred
        expect(await usdc.balanceOf(owner.address)).to.equal(toUSDC(10));
      });

      it("should reject if not a group member", async function () {
        const outsider = (await ethers.getSigners())[4];
        await expect(
          settlement.connect(outsider).settleWith(0, owner.address, toUSDC(10))
        ).to.be.revertedWith("Sender not in group");
      });

      it("should reject overpayment (amount exceeds debt)", async function () {
        const settlementAddr = await settlement.getAddress();
        // Alice owes $10 but tries to pay $50
        await usdc.connect(alice).approve(settlementAddr, toUSDC(50));
        await expect(
          settlement.connect(alice).settleWith(0, owner.address, toUSDC(50))
        ).to.be.revertedWith("Amount exceeds debt");
      });

      it("should reject settlement when sender has no debt", async function () {
        // Owner has positive balance (+20), so cannot settle
        const settlementAddr = await settlement.getAddress();
        await usdc.connect(owner).approve(settlementAddr, toUSDC(10));
        await expect(
          settlement.connect(owner).settleWith(0, alice.address, toUSDC(10))
        ).to.be.revertedWith("Sender has no debt");
      });

      it("should allow partial settlement", async function () {
        const settlementAddr = await settlement.getAddress();
        // Alice owes $10, pays $5
        await usdc.connect(alice).approve(settlementAddr, toUSDC(5));
        await settlement.connect(alice).settleWith(0, owner.address, toUSDC(5));

        // Alice still owes $5
        expect(await ledger.getBalance(0, alice.address)).to.equal(-toUSDC(5));
        expect(await ledger.getBalance(0, owner.address)).to.equal(toUSDC(15));
      });
    });

    describe("settleAll", function () {
      it("should settle all debts in one transaction", async function () {
        const settlementAddr = await settlement.getAddress();
        const ownerBalanceBefore = await usdc.balanceOf(owner.address);

        // Both debtors approve settlement contract
        await usdc.connect(alice).approve(settlementAddr, toUSDC(10));
        await usdc.connect(bob).approve(settlementAddr, toUSDC(10));

        // Settle all
        await settlement.settleAll(0);

        // All balances should be 0
        expect(await ledger.getBalance(0, owner.address)).to.equal(0);
        expect(await ledger.getBalance(0, alice.address)).to.equal(0);
        expect(await ledger.getBalance(0, bob.address)).to.equal(0);

        // Owner received $20 total
        expect(await usdc.balanceOf(owner.address)).to.equal(
          ownerBalanceBefore + toUSDC(20)
        );
      });

      it("should emit Settled events for each transfer", async function () {
        const settlementAddr = await settlement.getAddress();
        await usdc.connect(alice).approve(settlementAddr, toUSDC(10));
        await usdc.connect(bob).approve(settlementAddr, toUSDC(10));

        await expect(settlement.settleAll(0))
          .to.emit(settlement, "Settled")
          .to.emit(settlement, "GroupSettled");
      });

      it("should handle complex multi-expense settlement", async function () {
        // Add another expense: Alice pays $20 for owner and bob
        await ledger.connect(alice).addExpense(0, toUSDC(20), "Taxi", "transport", [
          { member: owner.address, amount: toUSDC(10) },
          { member: bob.address, amount: toUSDC(10) },
        ]);

        // Balances now:
        // Owner: +20 - 10 = +10
        // Alice: -10 + 20 = +10
        // Bob: -10 - 10 = -20
        expect(await ledger.getBalance(0, owner.address)).to.equal(toUSDC(10));
        expect(await ledger.getBalance(0, alice.address)).to.equal(toUSDC(10));
        expect(await ledger.getBalance(0, bob.address)).to.equal(-toUSDC(20));

        const settlementAddr = await settlement.getAddress();
        // Bob needs to pay $20 total (to owner and alice)
        await usdc.connect(bob).approve(settlementAddr, toUSDC(20));

        await settlement.settleAll(0);

        expect(await ledger.getBalance(0, owner.address)).to.equal(0);
        expect(await ledger.getBalance(0, alice.address)).to.equal(0);
        expect(await ledger.getBalance(0, bob.address)).to.equal(0);
      });
    });
  });
});
