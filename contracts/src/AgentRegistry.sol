// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract AgentRegistry is ERC721URIStorage, Ownable, ReentrancyGuard {

    // ── State ──────────────────────────────────────────────────────────

    string public constant ERC8004_VERSION = "1.0";

    uint256 private _nextAgentId;
    uint256 public minimumStake = 0.001 ether;

    struct AgentData {
        address owner;
        bytes32 metadataHash;   // keccak256 of full profile JSON in Postgres
        uint256 stake;          // ETH staked at registration
        uint256 registeredAt;
        uint256 lastVerifiedAt;
        bool active;
        uint8 badgeTier;        // 0=none, 1=Bronze, 2=Silver, 3=Gold
    }

    mapping(uint256 => AgentData) public agents;

    // ── Events ─────────────────────────────────────────────────────────

    event AgentRegistered(
        uint256 indexed agentId,
        address indexed owner,
        bytes32 metadataHash,
        uint256 stake,
        uint256 timestamp
    );
    event AgentUpdated(uint256 indexed agentId, bytes32 newMetadataHash);
    event AgentDeactivated(uint256 indexed agentId, uint256 stakeReturned);
    event AgentVerified(uint256 indexed agentId, uint256 timestamp);
    event BadgeUpdated(uint256 indexed agentId, uint8 newBadge);

    // ── Constructor ────────────────────────────────────────────────────

    constructor() ERC721("MilkyWay Agent", "MWAGENT") Ownable(msg.sender) {}

    // ── Core Functions ─────────────────────────────────────────────────

    /// @notice Register a new agent. Requires minimum ETH stake.
    /// @param metadataHash keccak256 hash of the full profile JSON stored in Postgres
    /// @return agentId The newly minted agent NFT ID
    function registerAgent(
        bytes32 metadataHash
    ) external payable nonReentrant returns (uint256 agentId) {
        require(msg.value >= minimumStake, "Insufficient stake");
        require(metadataHash != bytes32(0), "Invalid metadata hash");

        agentId = _nextAgentId++;
        _safeMint(msg.sender, agentId);

        agents[agentId] = AgentData({
            owner: msg.sender,
            metadataHash: metadataHash,
            stake: msg.value,
            registeredAt: block.timestamp,
            lastVerifiedAt: 0,
            active: true,
            badgeTier: 0
        });

        emit AgentRegistered(agentId, msg.sender, metadataHash, msg.value, block.timestamp);
    }

    /// @notice Update agent metadata hash after profile update in Postgres
    function updateMetadata(
        uint256 agentId,
        bytes32 newMetadataHash
    ) external {
        require(ownerOf(agentId) == msg.sender, "Not agent owner");
        require(agents[agentId].active, "Agent not active");
        require(newMetadataHash != bytes32(0), "Invalid hash");

        agents[agentId].metadataHash = newMetadataHash;
        emit AgentUpdated(agentId, newMetadataHash);
    }

    /// @notice Deactivate agent and return stake to owner
    function deactivateAgent(uint256 agentId) external nonReentrant {
        require(ownerOf(agentId) == msg.sender, "Not agent owner");
        require(agents[agentId].active, "Already inactive");

        uint256 stakeToReturn = agents[agentId].stake;
        agents[agentId].active = false;
        agents[agentId].stake = 0;

        _burn(agentId);

        (bool sent,) = msg.sender.call{value: stakeToReturn}("");
        require(sent, "Stake return failed");

        emit AgentDeactivated(agentId, stakeToReturn);
    }

    // ── Oracle Functions (MilkyWay backend only) ───────────────────────

    /// @notice Called by MilkyWay verification oracle after successful health check
    function markVerified(uint256 agentId, uint8 badgeTier) external onlyOwner {
        require(agents[agentId].active, "Agent not active");
        agents[agentId].lastVerifiedAt = block.timestamp;
        agents[agentId].badgeTier = badgeTier;
        emit AgentVerified(agentId, block.timestamp);
        emit BadgeUpdated(agentId, badgeTier);
    }

    // ── View Functions ─────────────────────────────────────────────────

    function getAgent(uint256 agentId) external view returns (AgentData memory) {
        return agents[agentId];
    }

    function totalAgents() external view returns (uint256) {
        return _nextAgentId;
    }

    function isActive(uint256 agentId) external view returns (bool) {
        return agents[agentId].active;
    }

    // ── Admin ──────────────────────────────────────────────────────────

    function setMinimumStake(uint256 newMinimum) external onlyOwner {
        require(newMinimum >= 0.001 ether, "Minimum too low");
        minimumStake = newMinimum;
    }

    receive() external payable {}

    // ERC-721 transfer clears verification status
    function _update(
        address to,
        uint256 agentId,
        address auth
    ) internal override returns (address) {
        address from = super._update(to, agentId, auth);
        if (from != address(0) && to != address(0)) {
            agents[agentId].owner = to;
            agents[agentId].lastVerifiedAt = 0;
            agents[agentId].badgeTier = 0;
        }
        return from;
    }
}
