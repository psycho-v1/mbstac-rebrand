// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title MBaseStack Lab Points
/// @notice Operator-paid log of diary-completion points. Participants do not send value.
/// @dev Deploy on the community-history Chain 1404 endpoint the operator chooses.
///      This contract does not adjudicate which ledger is mainnet.
contract LabPoints {
    address public owner;
    uint256 public constant COMPLETE_DIARY_POINTS = 10;
    mapping(address => uint256) public points;
    mapping(address => bool) public completed;
    mapping(bytes32 => bool) public usedDiaryHash;

    event Awarded(address indexed participant, uint256 amount, bytes32 diaryHash, string reason);
    event OwnerChanged(address indexed next);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setOwner(address next) external onlyOwner {
        require(next != address(0), "zero");
        owner = next;
        emit OwnerChanged(next);
    }

    /// @notice Owner (or a relayer key the owner sets) awards 10 points once per diary hash.
    /// Gas is paid by the caller, intended to be the operator pool — not the participant.
    function awardCompleteDiary(address participant, bytes32 diaryHash) external onlyOwner {
        require(participant != address(0), "zero participant");
        require(diaryHash != bytes32(0), "empty hash");
        require(!usedDiaryHash[diaryHash], "hash used");
        usedDiaryHash[diaryHash] = true;
        completed[participant] = true;
        points[participant] += COMPLETE_DIARY_POINTS;
        emit Awarded(participant, COMPLETE_DIARY_POINTS, diaryHash, "complete diary");
    }

    function award(address participant, uint256 amount, bytes32 diaryHash, string calldata reason) external onlyOwner {
        require(participant != address(0), "zero participant");
        require(amount > 0 && amount <= 100, "amount");
        if (diaryHash != bytes32(0)) {
            require(!usedDiaryHash[diaryHash], "hash used");
            usedDiaryHash[diaryHash] = true;
        }
        points[participant] += amount;
        emit Awarded(participant, amount, diaryHash, reason);
    }

    receive() external payable {}
    function pull(address payable to, uint256 weiAmt) external onlyOwner {
        to.transfer(weiAmt);
    }
}
