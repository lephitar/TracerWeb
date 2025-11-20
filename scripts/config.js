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
  /*   421614: {
    tracer: "0xcb991af4233D31af83708DbC45c45226D7833Ce9",
  },
 */ 42161: {
    tracer: "0xd0e4fc5B430b0cAC0f59b7B8B66D40d0b3f64A6b", // Replace with actual mainnet address
  },
};
