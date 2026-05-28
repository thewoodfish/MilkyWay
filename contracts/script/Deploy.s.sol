// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/AgentRegistry.sol";
import "../src/JobEscrow.sol";

contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(pk);

        AgentRegistry registry = new AgentRegistry();
        console.log("AgentRegistry deployed:", address(registry));

        JobEscrow escrow = new JobEscrow();
        console.log("JobEscrow deployed:", address(escrow));

        vm.stopBroadcast();
    }
}
