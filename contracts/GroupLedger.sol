// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title GroupLedger - On-chain group expense ledger for SplitDot
/// @notice Manages groups, expenses, and balance tracking.
///         Balances are stored as signed integers: positive = owed to you, negative = you owe.
contract GroupLedger {
    struct Group {
        address creator;
        address[] members;
        bool active;
    }

    struct Split {
        address member;
        uint256 amount; // USDC amount (6 decimals)
    }

    struct Expense {
        address payer;
        uint256 amount; // total in USDC (6 decimals)
        string description;
        string category;
        uint256 timestamp;
        address[] splitMembers;
        uint256[] splitAmounts;
    }

    mapping(uint256 => Group) private _groups;
    mapping(uint256 => Expense[]) private _expenses;
    mapping(uint256 => mapping(address => int256)) private _balances;
    mapping(uint256 => mapping(address => bool)) public isMember;

    uint256 public groupCount;

    event GroupCreated(uint256 indexed groupId, address indexed creator, address[] members);
    event MemberAdded(uint256 indexed groupId, address indexed member);
    event MemberRemoved(uint256 indexed groupId, address indexed member);
    event ExpenseAdded(
        uint256 indexed groupId,
        uint256 indexed expenseIndex,
        address indexed payer,
        uint256 amount,
        string description
    );
    event BalancesUpdated(uint256 indexed groupId);

    modifier onlyMember(uint256 groupId) {
        require(isMember[groupId][msg.sender], "Not a group member");
        _;
    }

    modifier groupExists(uint256 groupId) {
        require(groupId < groupCount, "Group does not exist");
        require(_groups[groupId].active, "Group is not active");
        _;
    }

    /// @notice Create a new group. The caller is automatically added as a member.
    /// @param members Initial member addresses (caller is added automatically if not included)
    /// @return groupId The ID of the newly created group
    function createGroup(address[] calldata members) external returns (uint256 groupId) {
        groupId = groupCount++;
        Group storage g = _groups[groupId];
        g.creator = msg.sender;
        g.active = true;

        // Add creator
        if (!isMember[groupId][msg.sender]) {
            g.members.push(msg.sender);
            isMember[groupId][msg.sender] = true;
        }

        // Add other members
        for (uint256 i = 0; i < members.length; i++) {
            address m = members[i];
            require(m != address(0), "Invalid member address");
            if (!isMember[groupId][m]) {
                g.members.push(m);
                isMember[groupId][m] = true;
            }
        }

        emit GroupCreated(groupId, msg.sender, g.members);
    }

    /// @notice Add a member to an existing group (only creator can add)
    function addMember(uint256 groupId, address member)
        external
        groupExists(groupId)
    {
        require(msg.sender == _groups[groupId].creator, "Only creator can add members");
        require(member != address(0), "Invalid member address");
        require(!isMember[groupId][member], "Already a member");

        _groups[groupId].members.push(member);
        isMember[groupId][member] = true;
        emit MemberAdded(groupId, member);
    }

    /// @notice Add an expense to a group. The payer is msg.sender.
    /// @param groupId Group to add expense to
    /// @param amount Total amount in USDC (6 decimals)
    /// @param description Expense description (e.g. "Dinner at Ramen Shop")
    /// @param category Expense category (e.g. "food_drink")
    /// @param splits How the expense is split among members
    function addExpense(
        uint256 groupId,
        uint256 amount,
        string calldata description,
        string calldata category,
        Split[] calldata splits
    ) external groupExists(groupId) onlyMember(groupId) {
        require(amount > 0, "Amount must be positive");
        require(splits.length > 0, "Must have at least one split");

        // Validate splits sum to total amount
        uint256 splitTotal = 0;
        address[] memory splitMembers = new address[](splits.length);
        uint256[] memory splitAmounts = new uint256[](splits.length);

        for (uint256 i = 0; i < splits.length; i++) {
            require(isMember[groupId][splits[i].member], "Split member not in group");
            require(splits[i].amount > 0, "Split amount must be positive");
            splitTotal += splits[i].amount;
            splitMembers[i] = splits[i].member;
            splitAmounts[i] = splits[i].amount;
        }
        require(splitTotal == amount, "Splits must sum to total amount");

        // Store expense
        _expenses[groupId].push(Expense({
            payer: msg.sender,
            amount: amount,
            description: description,
            category: category,
            timestamp: block.timestamp,
            splitMembers: splitMembers,
            splitAmounts: splitAmounts
        }));

        // Update balances:
        // Payer gets credited for the full amount
        // Each split member gets debited for their share
        _balances[groupId][msg.sender] += int256(amount);
        for (uint256 i = 0; i < splits.length; i++) {
            _balances[groupId][splits[i].member] -= int256(splits[i].amount);
        }

        emit ExpenseAdded(groupId, _expenses[groupId].length - 1, msg.sender, amount, description);
        emit BalancesUpdated(groupId);
    }

    /// @notice Get all member addresses and their balances for a group
    function getBalances(uint256 groupId)
        external
        view
        groupExists(groupId)
        returns (address[] memory members, int256[] memory balances)
    {
        Group storage g = _groups[groupId];
        members = g.members;
        balances = new int256[](members.length);
        for (uint256 i = 0; i < members.length; i++) {
            balances[i] = _balances[groupId][members[i]];
        }
    }

    /// @notice Get balance of a specific member in a group
    function getBalance(uint256 groupId, address member)
        external
        view
        returns (int256)
    {
        return _balances[groupId][member];
    }

    /// @notice Get the number of expenses in a group
    function getExpenseCount(uint256 groupId) external view returns (uint256) {
        return _expenses[groupId].length;
    }

    /// @notice Get a specific expense by index
    function getExpense(uint256 groupId, uint256 index)
        external
        view
        returns (
            address payer,
            uint256 amount,
            string memory description,
            string memory category,
            uint256 timestamp,
            address[] memory splitMembers,
            uint256[] memory splitAmounts
        )
    {
        require(index < _expenses[groupId].length, "Expense index out of bounds");
        Expense storage e = _expenses[groupId][index];
        return (e.payer, e.amount, e.description, e.category, e.timestamp, e.splitMembers, e.splitAmounts);
    }

    /// @notice Get group info
    function getGroup(uint256 groupId)
        external
        view
        returns (address creator, address[] memory members, bool active)
    {
        Group storage g = _groups[groupId];
        return (g.creator, g.members, g.active);
    }

    /// @notice Get group members
    function getMembers(uint256 groupId) external view returns (address[] memory) {
        return _groups[groupId].members;
    }

    /// @notice Reset a specific member's balance (called by Settlement contract after settling)
    /// @dev Only callable by settlement contract or group creator for now
    function resetBalance(uint256 groupId, address member, int256 adjustment)
        external
        groupExists(groupId)
    {
        _balances[groupId][member] += adjustment;
        emit BalancesUpdated(groupId);
    }
}
