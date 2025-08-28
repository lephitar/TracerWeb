// Contract configuration - both networks
export const CHAINS = {
  421614: {
    // Arbitrum Sepolia
    name: "Arbitrum Sepolia",
    chainIdHex: "0x66eee",
    rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
    blockExplorer: "https://sepolia.arbiscan.io/",
    nativeCurrency: {
      name: "Arbitrum Sepolia Ether",
      symbol: "ETH",
      decimals: 18,
    },
  },
  42161: {
    // Arbitrum One (Mainnet)
    name: "Arbitrum One",
    chainIdHex: "0xa4b1",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    blockExplorer: "https://arbiscan.io/",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
  },
};

// Default contracts per chain (override via URL ?token= & ?vesting=)
export const CONTRACTS = {
  421614: {
    tracer: "0x5B4f2b9a1D39c62491056e9C97bC873997FEe6c8",
  },
  42161: {
    tracer: "0x0000000000000000000000000000000000000000", // Replace with actual mainnet address
  },
};
