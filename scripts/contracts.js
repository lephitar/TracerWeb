// Contract configuration - both networks
export const CONTRACTS = {
  421614: {
    // Arbitrum Sepolia
    address: "0x23fd096B2875A6dEccae8C688f44fAf0001E3Eef",
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
    address: "0x0000000000000000000000000000000000000000", // Replace with actual mainnet address
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
