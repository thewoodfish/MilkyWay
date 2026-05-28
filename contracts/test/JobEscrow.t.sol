// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/JobEscrow.sol";

contract JobEscrowTest is Test {
    JobEscrow public escrow;
    address public owner;
    address public caller;
    address public agent1;
    address public agent2;

    bytes32 constant JOB_A = keccak256("job-a");
    bytes32 constant JOB_B = keccak256("job-b");

    function setUp() public {
        owner = address(this);
        caller = makeAddr("caller");
        agent1 = makeAddr("agent1");
        agent2 = makeAddr("agent2");
        escrow = new JobEscrow();
        vm.deal(caller, 10 ether);
    }

    // ── helpers ────────────────────────────────────────────────────────

    function _singleAgentAmounts(uint256 total) internal pure returns (uint256[] memory) {
        uint256[] memory amounts = new uint256[](1);
        uint256 fee = (total * 100) / 10000;
        amounts[0] = total - fee;
        return amounts;
    }

    function _twoAgentAmounts(uint256 total) internal pure returns (uint256[] memory) {
        uint256[] memory amounts = new uint256[](2);
        uint256 fee = (total * 100) / 10000;
        uint256 distributable = total - fee;
        amounts[0] = distributable / 2;
        amounts[1] = distributable - amounts[0];
        return amounts;
    }

    function _singleAgents() internal view returns (address[] memory) {
        address[] memory agents = new address[](1);
        agents[0] = agent1;
        return agents;
    }

    function _twoAgents() internal view returns (address[] memory) {
        address[] memory agents = new address[](2);
        agents[0] = agent1;
        agents[1] = agent2;
        return agents;
    }

    // ── lockPayment ────────────────────────────────────────────────────

    function test_lockPayment_success() public {
        uint256 value = 0.001 ether;
        vm.prank(caller);
        escrow.lockPayment{value: value}(
            JOB_A, _singleAgents(), _singleAgentAmounts(value), block.timestamp + 300
        );

        JobEscrow.Job memory job = escrow.getJob(JOB_A);
        assertEq(job.totalAmount, value);
        assertEq(job.caller, caller);
        assertEq(uint8(job.status), uint8(JobEscrow.JobStatus.LOCKED));
        assertTrue(escrow.jobExists(JOB_A));
    }

    function test_lockPayment_twoAgents() public {
        uint256 value = 0.002 ether;
        vm.prank(caller);
        escrow.lockPayment{value: value}(
            JOB_A, _twoAgents(), _twoAgentAmounts(value), block.timestamp + 300
        );

        JobEscrow.Job memory job = escrow.getJob(JOB_A);
        assertEq(job.agents.length, 2);
        assertEq(job.amounts[0] + job.amounts[1], value - (value * 100) / 10000);
    }

    function test_lockPayment_revert_duplicateJobId() public {
        uint256 value = 0.001 ether;
        vm.startPrank(caller);
        escrow.lockPayment{value: value}(
            JOB_A, _singleAgents(), _singleAgentAmounts(value), block.timestamp + 300
        );
        vm.expectRevert("Job ID already exists");
        escrow.lockPayment{value: value}(
            JOB_A, _singleAgents(), _singleAgentAmounts(value), block.timestamp + 300
        );
        vm.stopPrank();
    }

    function test_lockPayment_revert_noAgents() public {
        address[] memory empty = new address[](0);
        uint256[] memory emptyAmounts = new uint256[](0);
        vm.prank(caller);
        vm.expectRevert("No agents specified");
        escrow.lockPayment{value: 0.001 ether}(JOB_A, empty, emptyAmounts, block.timestamp + 300);
    }

    function test_lockPayment_revert_mismatchedArrays() public {
        uint256[] memory amounts = new uint256[](2);
        vm.prank(caller);
        vm.expectRevert("Agents and amounts mismatch");
        escrow.lockPayment{value: 0.001 ether}(JOB_A, _singleAgents(), amounts, block.timestamp + 300);
    }

    function test_lockPayment_revert_deadlineInPast() public {
        vm.prank(caller);
        vm.expectRevert("Deadline must be in future");
        escrow.lockPayment{value: 0.001 ether}(
            JOB_A, _singleAgents(), _singleAgentAmounts(0.001 ether), block.timestamp - 1
        );
    }

    function test_lockPayment_revert_wrongAmountsSum() public {
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 0.001 ether; // doesn't account for fee
        vm.prank(caller);
        vm.expectRevert("Amounts must sum to value minus fee");
        escrow.lockPayment{value: 0.001 ether}(JOB_A, _singleAgents(), amounts, block.timestamp + 300);
    }

    // ── markRunning ────────────────────────────────────────────────────

    function test_markRunning_success() public {
        uint256 value = 0.001 ether;
        vm.prank(caller);
        escrow.lockPayment{value: value}(
            JOB_A, _singleAgents(), _singleAgentAmounts(value), block.timestamp + 300
        );

        escrow.markRunning(JOB_A);
        assertEq(uint8(escrow.getJob(JOB_A).status), uint8(JobEscrow.JobStatus.RUNNING));
    }

    function test_markRunning_revert_notOwner() public {
        uint256 value = 0.001 ether;
        vm.prank(caller);
        escrow.lockPayment{value: value}(
            JOB_A, _singleAgents(), _singleAgentAmounts(value), block.timestamp + 300
        );
        vm.prank(caller);
        vm.expectRevert();
        escrow.markRunning(JOB_A);
    }

    // ── releasePayment ─────────────────────────────────────────────────

    function test_releasePayment_success() public {
        uint256 value = 0.001 ether;
        uint256 agentCut = value - (value * 100) / 10000;

        vm.prank(caller);
        escrow.lockPayment{value: value}(
            JOB_A, _singleAgents(), _singleAgentAmounts(value), block.timestamp + 300
        );

        uint256 before = agent1.balance;
        escrow.releasePayment(JOB_A);
        assertEq(agent1.balance - before, agentCut);
        assertEq(uint8(escrow.getJob(JOB_A).status), uint8(JobEscrow.JobStatus.COMPLETED));
    }

    function test_releasePayment_twoAgents() public {
        uint256 value = 0.002 ether;
        uint256 fee = (value * 100) / 10000;
        uint256 distributable = value - fee;

        vm.prank(caller);
        escrow.lockPayment{value: value}(
            JOB_A, _twoAgents(), _twoAgentAmounts(value), block.timestamp + 300
        );

        escrow.releasePayment(JOB_A);
        assertEq(agent1.balance + agent2.balance, distributable);
    }

    function test_releasePayment_revert_expired() public {
        uint256 value = 0.001 ether;
        vm.prank(caller);
        escrow.lockPayment{value: value}(
            JOB_A, _singleAgents(), _singleAgentAmounts(value), block.timestamp + 10
        );

        vm.warp(block.timestamp + 11);
        vm.expectRevert("Job expired");
        escrow.releasePayment(JOB_A);
    }

    function test_releasePayment_revert_notOwner() public {
        uint256 value = 0.001 ether;
        vm.prank(caller);
        escrow.lockPayment{value: value}(
            JOB_A, _singleAgents(), _singleAgentAmounts(value), block.timestamp + 300
        );
        vm.prank(caller);
        vm.expectRevert();
        escrow.releasePayment(JOB_A);
    }

    // ── refundPayment ──────────────────────────────────────────────────

    function test_refundPayment_success() public {
        uint256 value = 0.001 ether;
        vm.prank(caller);
        escrow.lockPayment{value: value}(
            JOB_A, _singleAgents(), _singleAgentAmounts(value), block.timestamp + 10
        );

        vm.warp(block.timestamp + 11);
        uint256 before = caller.balance;
        vm.prank(caller);
        escrow.refundPayment(JOB_A);

        assertEq(caller.balance - before, value);
        assertEq(uint8(escrow.getJob(JOB_A).status), uint8(JobEscrow.JobStatus.REFUNDED));
    }

    function test_refundPayment_revert_notCaller() public {
        uint256 value = 0.001 ether;
        vm.prank(caller);
        escrow.lockPayment{value: value}(
            JOB_A, _singleAgents(), _singleAgentAmounts(value), block.timestamp + 10
        );

        vm.warp(block.timestamp + 11);
        vm.prank(agent1);
        vm.expectRevert("Not job caller");
        escrow.refundPayment(JOB_A);
    }

    function test_refundPayment_revert_deadlineNotPassed() public {
        uint256 value = 0.001 ether;
        vm.prank(caller);
        escrow.lockPayment{value: value}(
            JOB_A, _singleAgents(), _singleAgentAmounts(value), block.timestamp + 300
        );

        vm.prank(caller);
        vm.expectRevert("Deadline not passed yet");
        escrow.refundPayment(JOB_A);
    }

    // ── admin ──────────────────────────────────────────────────────────

    function test_setProtocolFee() public {
        escrow.setProtocolFee(200);
        assertEq(escrow.protocolFeeBps(), 200);
    }

    function test_setProtocolFee_revert_tooHigh() public {
        vm.expectRevert("Max 5%");
        escrow.setProtocolFee(501);
    }

    function test_withdrawFees() public {
        uint256 value = 0.001 ether;
        vm.prank(caller);
        escrow.lockPayment{value: value}(
            JOB_A, _singleAgents(), _singleAgentAmounts(value), block.timestamp + 300
        );
        escrow.releasePayment(JOB_A);

        uint256 fee = (value * 100) / 10000;
        uint256 before = owner.balance;
        escrow.withdrawFees();
        assertEq(address(this).balance - before, fee);
    }

    receive() external payable {}
}
