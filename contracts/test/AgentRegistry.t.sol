// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/AgentRegistry.sol";
import "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";

contract AgentRegistryTest is Test {
    AgentRegistry registry;
    address owner;
    address alice;
    address bob;

    bytes32 constant HASH_A = keccak256("profile_a");
    bytes32 constant HASH_B = keccak256("profile_b");

    function setUp() public {
        owner = address(this);
        alice = makeAddr("alice");
        bob = makeAddr("bob");
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
        registry = new AgentRegistry();
    }

    // ── registerAgent ──────────────────────────────────────────────────

    function test_register_mintsNFT() public {
        vm.prank(alice);
        uint256 id = registry.registerAgent{value: 0.01 ether}(HASH_A);

        assertEq(id, 0);
        assertEq(registry.ownerOf(0), alice);
        assertEq(registry.totalAgents(), 1);
    }

    function test_register_storesAgentData() public {
        vm.prank(alice);
        registry.registerAgent{value: 0.02 ether}(HASH_A);

        AgentRegistry.AgentData memory d = registry.getAgent(0);
        assertEq(d.owner, alice);
        assertEq(d.metadataHash, HASH_A);
        assertEq(d.stake, 0.02 ether);
        assertTrue(d.active);
        assertEq(d.badgeTier, 0);
        assertEq(d.lastVerifiedAt, 0);
    }

    function test_register_emitsEvent() public {
        vm.prank(alice);
        vm.expectEmit(true, true, false, true);
        emit AgentRegistry.AgentRegistered(0, alice, HASH_A, 0.01 ether, block.timestamp);
        registry.registerAgent{value: 0.01 ether}(HASH_A);
    }

    function test_register_incrementsId() public {
        vm.startPrank(alice);
        uint256 id0 = registry.registerAgent{value: 0.01 ether}(HASH_A);
        uint256 id1 = registry.registerAgent{value: 0.01 ether}(HASH_B);
        vm.stopPrank();

        assertEq(id0, 0);
        assertEq(id1, 1);
        assertEq(registry.totalAgents(), 2);
    }

    function test_register_revertsInsufficientStake() public {
        vm.prank(alice);
        vm.expectRevert("Insufficient stake");
        registry.registerAgent{value: 0.009 ether}(HASH_A);
    }

    function test_register_revertsZeroHash() public {
        vm.prank(alice);
        vm.expectRevert("Invalid metadata hash");
        registry.registerAgent{value: 0.01 ether}(bytes32(0));
    }

    // ── updateMetadata ─────────────────────────────────────────────────

    function test_updateMetadata_updatesHash() public {
        vm.startPrank(alice);
        registry.registerAgent{value: 0.01 ether}(HASH_A);
        registry.updateMetadata(0, HASH_B);
        vm.stopPrank();

        assertEq(registry.getAgent(0).metadataHash, HASH_B);
    }

    function test_updateMetadata_emitsEvent() public {
        vm.startPrank(alice);
        registry.registerAgent{value: 0.01 ether}(HASH_A);
        vm.expectEmit(true, false, false, true);
        emit AgentRegistry.AgentUpdated(0, HASH_B);
        registry.updateMetadata(0, HASH_B);
        vm.stopPrank();
    }

    function test_updateMetadata_revertsNotOwner() public {
        vm.prank(alice);
        registry.registerAgent{value: 0.01 ether}(HASH_A);

        vm.prank(bob);
        vm.expectRevert("Not agent owner");
        registry.updateMetadata(0, HASH_B);
    }

    function test_updateMetadata_revertsZeroHash() public {
        vm.startPrank(alice);
        registry.registerAgent{value: 0.01 ether}(HASH_A);
        vm.expectRevert("Invalid hash");
        registry.updateMetadata(0, bytes32(0));
        vm.stopPrank();
    }

    function test_updateMetadata_revertsInactiveAgent() public {
        vm.startPrank(alice);
        registry.registerAgent{value: 0.01 ether}(HASH_A);
        registry.deactivateAgent(0);
        // NFT is burned — ownerOf reverts with ERC721NonexistentToken before our check
        vm.expectRevert(abi.encodeWithSelector(IERC721Errors.ERC721NonexistentToken.selector, 0));
        registry.updateMetadata(0, HASH_B);
        vm.stopPrank();
    }

    // ── deactivateAgent ────────────────────────────────────────────────

    function test_deactivate_returnsStake() public {
        vm.prank(alice);
        registry.registerAgent{value: 0.01 ether}(HASH_A);

        uint256 before = alice.balance;
        vm.prank(alice);
        registry.deactivateAgent(0);

        assertEq(alice.balance, before + 0.01 ether);
    }

    function test_deactivate_setsInactive() public {
        vm.startPrank(alice);
        registry.registerAgent{value: 0.01 ether}(HASH_A);
        registry.deactivateAgent(0);
        vm.stopPrank();

        assertFalse(registry.isActive(0));
        assertFalse(registry.getAgent(0).active);
        assertEq(registry.getAgent(0).stake, 0);
    }

    function test_deactivate_emitsEvent() public {
        vm.startPrank(alice);
        registry.registerAgent{value: 0.01 ether}(HASH_A);
        vm.expectEmit(true, false, false, true);
        emit AgentRegistry.AgentDeactivated(0, 0.01 ether);
        registry.deactivateAgent(0);
        vm.stopPrank();
    }

    function test_deactivate_revertsNotOwner() public {
        vm.prank(alice);
        registry.registerAgent{value: 0.01 ether}(HASH_A);

        vm.prank(bob);
        vm.expectRevert("Not agent owner");
        registry.deactivateAgent(0);
    }

    function test_deactivate_revertsAlreadyInactive() public {
        vm.startPrank(alice);
        registry.registerAgent{value: 0.01 ether}(HASH_A);
        registry.deactivateAgent(0);
        // NFT is burned — ownerOf reverts with ERC721NonexistentToken before our check
        vm.expectRevert(abi.encodeWithSelector(IERC721Errors.ERC721NonexistentToken.selector, 0));
        registry.deactivateAgent(0);
        vm.stopPrank();
    }

    // ── markVerified (oracle) ──────────────────────────────────────────

    function test_markVerified_updatesBadgeAndTimestamp() public {
        vm.prank(alice);
        registry.registerAgent{value: 0.01 ether}(HASH_A);

        uint256 t = block.timestamp + 100;
        vm.warp(t);
        registry.markVerified(0, 1); // Bronze

        AgentRegistry.AgentData memory d = registry.getAgent(0);
        assertEq(d.badgeTier, 1);
        assertEq(d.lastVerifiedAt, t);
    }

    function test_markVerified_emitsEvents() public {
        vm.prank(alice);
        registry.registerAgent{value: 0.01 ether}(HASH_A);

        vm.expectEmit(true, false, false, true);
        emit AgentRegistry.AgentVerified(0, block.timestamp);
        vm.expectEmit(true, false, false, true);
        emit AgentRegistry.BadgeUpdated(0, 2);
        registry.markVerified(0, 2); // Silver
    }

    function test_markVerified_revertsNotOwner() public {
        vm.prank(alice);
        registry.registerAgent{value: 0.01 ether}(HASH_A);

        vm.prank(bob);
        vm.expectRevert();
        registry.markVerified(0, 1);
    }

    function test_markVerified_revertsInactiveAgent() public {
        vm.startPrank(alice);
        registry.registerAgent{value: 0.01 ether}(HASH_A);
        registry.deactivateAgent(0);
        vm.stopPrank();

        vm.expectRevert("Agent not active");
        registry.markVerified(0, 1);
    }

    // ── ERC-721 transfer clears verification ───────────────────────────

    function test_transfer_clearsVerification() public {
        vm.prank(alice);
        registry.registerAgent{value: 0.01 ether}(HASH_A);
        registry.markVerified(0, 3); // Gold

        vm.prank(alice);
        registry.transferFrom(alice, bob, 0);

        AgentRegistry.AgentData memory d = registry.getAgent(0);
        assertEq(d.owner, bob);
        assertEq(d.badgeTier, 0);
        assertEq(d.lastVerifiedAt, 0);
    }

    // ── setMinimumStake (admin) ────────────────────────────────────────

    function test_setMinimumStake_updatesValue() public {
        registry.setMinimumStake(0.05 ether);
        assertEq(registry.minimumStake(), 0.05 ether);
    }

    function test_setMinimumStake_revertsNotOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        registry.setMinimumStake(0.05 ether);
    }

    function test_register_failsWithNewMinimum() public {
        registry.setMinimumStake(0.05 ether);
        vm.prank(alice);
        vm.expectRevert("Insufficient stake");
        registry.registerAgent{value: 0.01 ether}(HASH_A);
    }
}
