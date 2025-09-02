import { TOKEN_ABI, VESTING_ABI } from "./ABI.js";

export function getTokenContract(address, runner) {
  return new ethers.Contract(address, TOKEN_ABI, runner);
}

export function getVestingContract(address, runner) {
  return new ethers.Contract(address, VESTING_ABI, runner);
}
