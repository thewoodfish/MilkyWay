export const ESCROW_ABI = [
  {
    name: "lockPayment",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "jobId", type: "bytes32" },
      { name: "agents", type: "address[]" },
      { name: "amounts", type: "uint256[]" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "refundPayment",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "jobId", type: "bytes32" }],
    outputs: [],
  },
  {
    name: "getJob",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "jobId", type: "bytes32" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "jobId", type: "bytes32" },
          { name: "caller", type: "address" },
          { name: "agents", type: "address[]" },
          { name: "amounts", type: "uint256[]" },
          { name: "totalAmount", type: "uint256" },
          { name: "deadline", type: "uint256" },
          { name: "status", type: "uint8" },
          { name: "lockedAt", type: "uint256" },
          { name: "completedAt", type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "JobLocked",
    type: "event",
    inputs: [
      { name: "jobId", type: "bytes32", indexed: true },
      { name: "caller", type: "address", indexed: true },
      { name: "agents", type: "address[]", indexed: false },
      { name: "totalAmount", type: "uint256", indexed: false },
      { name: "deadline", type: "uint256", indexed: false },
    ],
  },
] as const;
