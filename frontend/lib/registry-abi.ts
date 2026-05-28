export const REGISTRY_ABI = [
  {
    type: "function",
    name: "registerAgent",
    stateMutability: "payable",
    inputs: [{ name: "metadataHash", type: "bytes32" }],
    outputs: [{ name: "agentId", type: "uint256" }],
  },
  {
    type: "function",
    name: "updateMetadata",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "newMetadataHash", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "deactivateAgent",
    stateMutability: "nonpayable",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getAgent",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "owner", type: "address" },
          { name: "metadataHash", type: "bytes32" },
          { name: "stake", type: "uint256" },
          { name: "registeredAt", type: "uint256" },
          { name: "lastVerifiedAt", type: "uint256" },
          { name: "active", type: "bool" },
          { name: "badgeTier", type: "uint8" },
        ],
      },
    ],
  },
  {
    type: "event",
    name: "AgentRegistered",
    inputs: [
      { name: "agentId", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "metadataHash", type: "bytes32", indexed: false },
      { name: "stake", type: "uint256", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
] as const;
