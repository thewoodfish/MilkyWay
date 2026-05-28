// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract JobEscrow is Ownable, ReentrancyGuard {

    // ── State ──────────────────────────────────────────────────────────

    uint256 public protocolFeeBps = 100; // 1%

    enum JobStatus { NONE, LOCKED, RUNNING, COMPLETED, REFUNDED }

    struct Job {
        bytes32 jobId;
        address caller;
        address[] agents;
        uint256[] amounts;
        uint256 totalAmount;
        uint256 deadline;
        JobStatus status;
        uint256 lockedAt;
        uint256 completedAt;
    }

    mapping(bytes32 => Job) public jobs;

    // ── Events ─────────────────────────────────────────────────────────

    event JobLocked(bytes32 indexed jobId, address indexed caller, address[] agents, uint256 totalAmount, uint256 deadline);
    event JobCompleted(bytes32 indexed jobId, uint256 completedAt);
    event JobRefunded(bytes32 indexed jobId, address indexed caller, uint256 amount);
    event AgentPaid(bytes32 indexed jobId, address indexed agent, uint256 amount);

    // ── Constructor ────────────────────────────────────────────────────

    constructor() Ownable(msg.sender) {}

    // ── Core Functions ─────────────────────────────────────────────────

    function lockPayment(
        bytes32 jobId,
        address[] calldata agents,
        uint256[] calldata amounts,
        uint256 deadline
    ) external payable nonReentrant {
        require(jobs[jobId].status == JobStatus.NONE, "Job ID already exists");
        require(agents.length > 0, "No agents specified");
        require(agents.length == amounts.length, "Agents and amounts mismatch");
        require(deadline > block.timestamp, "Deadline must be in future");
        require(msg.value > 0, "Must send ETH");

        uint256 fee = (msg.value * protocolFeeBps) / 10000;
        uint256 distributable = msg.value - fee;
        uint256 amountSum = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            amountSum += amounts[i];
        }
        require(amountSum == distributable, "Amounts must sum to value minus fee");

        jobs[jobId] = Job({
            jobId: jobId,
            caller: msg.sender,
            agents: agents,
            amounts: amounts,
            totalAmount: msg.value,
            deadline: deadline,
            status: JobStatus.LOCKED,
            lockedAt: block.timestamp,
            completedAt: 0
        });

        emit JobLocked(jobId, msg.sender, agents, msg.value, deadline);
    }

    function releasePayment(bytes32 jobId) external onlyOwner nonReentrant {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.LOCKED || job.status == JobStatus.RUNNING, "Invalid status");
        require(block.timestamp <= job.deadline, "Job expired");

        job.status = JobStatus.COMPLETED;
        job.completedAt = block.timestamp;

        for (uint256 i = 0; i < job.agents.length; i++) {
            (bool sent,) = job.agents[i].call{value: job.amounts[i]}("");
            require(sent, "Payment failed");
            emit AgentPaid(jobId, job.agents[i], job.amounts[i]);
        }

        emit JobCompleted(jobId, block.timestamp);
    }

    function refundPayment(bytes32 jobId) external nonReentrant {
        Job storage job = jobs[jobId];
        require(job.caller == msg.sender, "Not job caller");
        require(job.status == JobStatus.LOCKED || job.status == JobStatus.RUNNING, "Cannot refund");
        require(block.timestamp > job.deadline, "Deadline not passed yet");

        uint256 refundAmount = job.totalAmount;
        job.status = JobStatus.REFUNDED;

        (bool sent,) = msg.sender.call{value: refundAmount}("");
        require(sent, "Refund failed");

        emit JobRefunded(jobId, msg.sender, refundAmount);
    }

    function markRunning(bytes32 jobId) external onlyOwner {
        require(jobs[jobId].status == JobStatus.LOCKED, "Job not locked");
        jobs[jobId].status = JobStatus.RUNNING;
    }

    // ── View Functions ─────────────────────────────────────────────────

    function getJob(bytes32 jobId) external view returns (Job memory) {
        return jobs[jobId];
    }

    function jobExists(bytes32 jobId) external view returns (bool) {
        return jobs[jobId].status != JobStatus.NONE;
    }

    // ── Admin ──────────────────────────────────────────────────────────

    function setProtocolFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 500, "Max 5%");
        protocolFeeBps = newFeeBps;
    }

    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        (bool sent,) = owner().call{value: balance}("");
        require(sent, "Withdraw failed");
    }
}
