// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockUSDC - Test stablecoin for SplitDot demo
/// @notice 6 decimals like real USDC. Anyone can mint for testing.
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Mint tokens to any address (test only)
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
