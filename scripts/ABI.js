// ERC20 ABI with ERC20Votes and ERC20Permit functions
export const TOKEN_ABI = [
  // Standard ERC20
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function circulatingSupplyAt(uint256 timestamp) view returns (uint256)",

  // ERC20Permit
  "function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)",
  "function nonces(address owner) view returns (uint256)",
  "function DOMAIN_SEPARATOR() view returns (bytes32)",

  // ERC20Votes
  "function getVotes(address account) view returns (uint256)",
  "function getPastVotes(address account, uint256 blockNumber) view returns (uint256)",
  "function getPastTotalSupply(uint256 blockNumber) view returns (uint256)",
  "function delegate(address delegatee)",
  "function delegateBySig(address delegatee, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s)",
  "function delegates(address account) view returns (address)",
  "function checkpoints(address account, uint32 pos) view returns (tuple(uint32 fromBlock, uint224 votes))",
  "function numCheckpoints(address account) view returns (uint32)",

  // Events
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
  "event DelegateChanged(address indexed delegator, address indexed fromDelegate, address indexed toDelegate)",
  "event DelegateVotesChanged(address indexed delegate, uint256 previousBalance, uint256 newBalance)",
];

// OpenZeppelin Contracts v5.x — VestingWallet
export const VESTING_ABI = [
  // Core getters
  "function start() view returns (uint256)",
  "function duration() view returns (uint256)",
  "function end() view returns (uint256)",

  // Released & releasable (ETH)
  "function released() view returns (uint256)",
  "function releasable() view returns (uint256)",

  // Released & releasable (ERC20)
  "function released(address token) view returns (uint256)",
  "function releasable(address token) view returns (uint256)",

  // Release (ETH & ERC20)
  "function release()",
  "function release(address token)",

  // Vested amount (ETH & ERC20)
  "function vestedAmount(uint64 timestamp) view returns (uint256)",
  "function vestedAmount(address token, uint64 timestamp) view returns (uint256)",

  // Ownable (beneficiary is the owner in OZ v5)
  "function owner() view returns (address)",
  "function transferOwnership(address newOwner)",
  "function renounceOwnership()",

  // Events
  "event EtherReleased(uint256 amount)",
  "event ERC20Released(address indexed token, uint256 amount)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
];
