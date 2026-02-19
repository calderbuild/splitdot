// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./GroupLedger.sol";

/// @title Settlement - USDC settlement for SplitDot group expenses
/// @notice Handles net settlement: calculates who owes whom and executes USDC transfers
contract Settlement {
    IERC20 public immutable usdc;
    GroupLedger public immutable ledger;

    event Settled(
        uint256 indexed groupId,
        address indexed from,
        address indexed to,
        uint256 amount
    );
    event GroupSettled(uint256 indexed groupId, uint256 transferCount);

    constructor(address _usdc, address _ledger) {
        require(_usdc != address(0), "Invalid USDC address");
        require(_ledger != address(0), "Invalid ledger address");
        usdc = IERC20(_usdc);
        ledger = GroupLedger(_ledger);
    }

    /// @notice Settle a specific debt: msg.sender pays `amount` USDC to `to`
    /// @dev Caller must have approved this contract to spend their USDC first
    function settleWith(uint256 groupId, address to, uint256 amount) external {
        require(amount > 0, "Amount must be positive");
        require(ledger.isMember(groupId, msg.sender), "Sender not in group");
        require(ledger.isMember(groupId, to), "Recipient not in group");

        // Transfer USDC from sender to recipient
        require(usdc.transferFrom(msg.sender, to, amount), "USDC transfer failed");

        // Update ledger balances: sender's debt decreases, recipient's credit decreases
        ledger.resetBalance(groupId, msg.sender, int256(amount));
        ledger.resetBalance(groupId, to, -int256(amount));

        emit Settled(groupId, msg.sender, to, amount);
    }

    /// @notice Settle all debts in a group using net settlement
    /// @dev All debtors must have approved this contract to spend their USDC.
    ///      Uses a greedy algorithm to minimize number of transfers.
    function settleAll(uint256 groupId) external {
        (address[] memory members, int256[] memory balances) = ledger.getBalances(groupId);
        require(members.length > 0, "No members in group");

        // Separate debtors (negative balance) and creditors (positive balance)
        // Use dynamic arrays sized to member count (may have unused slots)
        address[] memory debtors = new address[](members.length);
        uint256[] memory debts = new uint256[](members.length);
        uint256 debtorCount = 0;

        address[] memory creditors = new address[](members.length);
        uint256[] memory credits = new uint256[](members.length);
        uint256 creditorCount = 0;

        for (uint256 i = 0; i < members.length; i++) {
            if (balances[i] < 0) {
                debtors[debtorCount] = members[i];
                debts[debtorCount] = uint256(-balances[i]);
                debtorCount++;
            } else if (balances[i] > 0) {
                creditors[creditorCount] = members[i];
                credits[creditorCount] = uint256(balances[i]);
                creditorCount++;
            }
        }

        // Greedy matching: pair debtors with creditors
        uint256 transferCount = 0;
        uint256 di = 0;
        uint256 ci = 0;

        while (di < debtorCount && ci < creditorCount) {
            uint256 transferAmount;
            if (debts[di] <= credits[ci]) {
                transferAmount = debts[di];
            } else {
                transferAmount = credits[ci];
            }

            if (transferAmount > 0) {
                // Execute USDC transfer
                require(
                    usdc.transferFrom(debtors[di], creditors[ci], transferAmount),
                    "USDC transfer failed"
                );

                // Update ledger
                ledger.resetBalance(groupId, debtors[di], int256(transferAmount));
                ledger.resetBalance(groupId, creditors[ci], -int256(transferAmount));

                emit Settled(groupId, debtors[di], creditors[ci], transferAmount);
                transferCount++;

                debts[di] -= transferAmount;
                credits[ci] -= transferAmount;
            }

            if (debts[di] == 0) di++;
            if (credits[ci] == 0) ci++;
        }

        emit GroupSettled(groupId, transferCount);
    }
}
