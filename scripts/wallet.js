import { getTokenContract, getVestingContract } from "./contracts.js";
import { CHAINS, CONTRACTS } from "./config.js";
import { updateUI, showMessage } from "./ui.js";
import { formatAmount, toLocalFromSeconds } from "./utils.js";
import { appState } from "../core/state.js"; // ADD this import

// REMOVE these global variables:
// let signer;
// let provider;
// let tracerContract;
// let currentNetwork = null;
// let tracerAddress = null;
// let userAccount;
// let vestingContract;
// let vestingOwner;

// REPLACE with getters that use appState:
export function getSigner() {
  return appState.getState("wallet.signer");
}

export function getProvider() {
  return appState.getState("wallet.provider");
}

export function getContract() {
  return appState.getState("contracts.token");
}

export function getCurrentNetwork() {
  return appState.getState("wallet.network");
}

export function getContractAddress() {
  return appState.getState("contracts.tokenAddress");
}

export function getUserAccount() {
  return appState.getState("wallet.account");
}

export function getVesting() {
  return appState.getState("contracts.vesting");
}

export function getVestingOwner() {
  return appState.getState("contracts.vestingOwner");
}

export function detectNetwork(chainId) {
  const networkId = parseInt(chainId);
  const currentNetwork = CHAINS[networkId];
  console.log(currentNetwork?.name);

  if (currentNetwork) {
    const tracerAddress = CONTRACTS[networkId].tracer;

    // UPDATE state instead of global variables:
    appState.setState("wallet.network", currentNetwork);
    appState.setState("contracts.tokenAddress", tracerAddress);

    document.getElementById("network").textContent = currentNetwork.name;
    document.getElementById("tracerAddress").innerHTML = explorerLink(
      "address",
      tracerAddress
    );
    return true;
  } else {
    appState.setState("wallet.network", null);
    appState.setState("contracts.tokenAddress", null);
    return false;
  }
}

export async function connectWallet() {
  try {
    if (typeof window.ethereum === "undefined") {
      showMessage("MetaMask is not installed!", "error");
      return;
    }

    await new Promise((resolve) => {
      if (document.readyState === "complete") {
        resolve();
      } else {
        window.addEventListener("load", resolve, { once: true });
      }
    });

    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
      params: [],
    });

    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts found. Please unlock MetaMask.");
    }

    // REPLACE global variable assignments with appState:
    const provider = new ethers.BrowserProvider(window.ethereum);
    appState.setState("wallet.provider", provider);

    await provider._detectNetwork();

    const network = await provider.getNetwork();
    const isSupported = detectNetwork(network.chainId.toString());

    if (!isSupported) {
      showMessage(
        `Unsupported network. Please switch to Arbitrum One or Arbitrum Sepolia.`,
        "error"
      );
      updateNetworkUI();
      return;
    }

    const signer = await provider.getSigner();
    const userAccount = await signer.getAddress();

    // UPDATE state:
    appState.setState("wallet.signer", signer);
    appState.setState("wallet.account", userAccount);
    appState.setState("wallet.connected", true);

    // Initialize contracts
    const tracerContract = getTokenContract(
      appState.getState("contracts.tokenAddress"),
      signer
    );
    appState.setState("contracts.token", tracerContract);

    if (appState.getState("ui.isVestingMode")) {
      const vestingContract = getVestingContract(window.vestingAddress, signer);
      const vestingOwner = await vestingContract.owner();
      appState.setState("contracts.vesting", vestingContract);
      appState.setState("contracts.vestingOwner", vestingOwner);
    }

    document.getElementById("checkVotingPowerBtn").disabled = false;
    document.getElementById("delegateVotingPowerBtn").disabled = false;
    document.getElementById("signAndSubmitPermitBtn").disabled = false;
    document.getElementById("deadlineStr").value = getLocalDeadline(120);
    document.getElementById("circulationTime").value = getLocalDeadline(0);

    updateUI();
    updateNetworkUI();
    await refreshData();

    showMessage(
      `Successfully connected to ${getCurrentNetwork().name}!`,
      "success"
    );
  } catch (error) {
    console.error("Connection error:", error);

    if (error.code === 4001) {
      showMessage("Connection cancelled by user", "error");
    } else if (error.code === -32002) {
      showMessage("Connection request already pending in MetaMask", "error");
    } else if (error.message.includes("origin")) {
      showMessage(
        "MetaMask origin error. Try refreshing the page or using a local server.",
        "error"
      );
    } else {
      showMessage(`Connection failed: ${error.message}`, "error");
    }
  }
}

export async function refreshData() {
  const tracerContract = getContract();
  const userAccount = getUserAccount();

  if (!tracerContract || !userAccount) return;

  try {
    const [
      balance,
      totalSupply,
      nonce,
      name,
      symbol,
      decimals,
      votingPower,
      delegates,
    ] = await Promise.all([
      tracerContract.balanceOf(userAccount),
      tracerContract.totalSupply(),
      tracerContract.nonces(userAccount),
      tracerContract.name(),
      tracerContract.symbol(),
      tracerContract.decimals(),
      tracerContract.getVotes(userAccount),
      tracerContract.delegates(userAccount),
    ]);

    // UPDATE state with fetched data:
    appState.setState("data.balance", balance);
    appState.setState("data.totalSupply", totalSupply);
    appState.setState("data.nonce", nonce);
    appState.setState("data.votingPower", votingPower);
    appState.setState("data.delegates", delegates);
    appState.setState("data.name", name);
    appState.setState("data.symbol", symbol);
    appState.setState("data.decimals", decimals);

    // Format and display (keep this part the same for now)
    const formattedBalance = formatAmount(balance, decimals);
    const formattedTotalSupply = formatAmount(totalSupply, decimals);
    const formattedVotingPower = formatAmount(votingPower, decimals);

    document.getElementById(
      "balance"
    ).textContent = `${formattedBalance} ${symbol}`;
    document.getElementById(
      "totalSupply"
    ).textContent = `${formattedTotalSupply} ${symbol}`;
    document.getElementById("nonce").textContent = nonce.toString();
    document.getElementById(
      "votingPower"
    ).textContent = `${formattedVotingPower} ${symbol}`;

    const el = document.getElementById("delegates");

    let displayDelegate;
    if (delegates === ethers.ZeroAddress) {
      displayDelegate = "No delegate set";
    } else if (delegates.toLowerCase() === userAccount.toLowerCase()) {
      displayDelegate = "Self-delegated";
    } else {
      displayDelegate = delegates;
    }
    el.textContent = displayDelegate;

    if (ethers.isAddress(displayDelegate)) {
      el.classList.add("contract-info");
    } else {
      el.classList.remove("contract-info");
    }

    if (appState.getState("ui.isVestingMode")) {
      const vestingContract = getVesting();
      const tokenAddr = await tracerContract.getAddress();
      const vestingAddr = await vestingContract.getAddress();

      const [vestingStart, vestingEnd, released, releasable, owner, balance] =
        await Promise.all([
          vestingContract.start(),
          vestingContract.end(),
          vestingContract["released(address)"](tokenAddr),
          vestingContract["releasable(address)"](tokenAddr),
          vestingContract.owner(),
          tracerContract.balanceOf(vestingAddr),
        ]);

      document.getElementById("vestingDestination").innerHTML = explorerLink(
        "address",
        owner
      );

      const formattedUnvested = formatAmount(balance - releasable, decimals);
      document.getElementById(
        "unvestedBalance"
      ).textContent = `${formattedUnvested} ${symbol}`;

      const formattedRelease = formatAmount(released, decimals);
      document.getElementById(
        "releasedVesting"
      ).textContent = `${formattedRelease} ${symbol}`;

      const formattedReleasable = formatAmount(releasable, decimals);
      document.getElementById(
        "releasableVesting"
      ).textContent = `${formattedReleasable} ${symbol}`;

      const formattedStart = toLocalFromSeconds(Number(vestingStart));
      document.getElementById("vestingStart").textContent = formattedStart;

      const formattedEnd = toLocalFromSeconds(Number(vestingEnd));
      document.getElementById("vestingEnd").textContent = formattedEnd;
    }

    showMessage("Data refreshed successfully!", "success");
  } catch (error) {
    console.error("Refresh error:", error);
    showMessage(`Failed to refresh data: ${error.message}`, "error");
  }
}

export async function addToMetaMask() {
  try {
    const [symbol, decimals] = await Promise.all([
      tracerContract.symbol(),
      tracerContract.decimals(),
    ]);
    const tokenImageURL =
      "https://tracer.endglobalwarming.net/assets/tracerroundicon.svg";

    await window.ethereum.request({
      method: "wallet_watchAsset",
      params: {
        type: "ERC20",
        options: {
          address: tracerAddress,
          symbol: symbol.toString(),
          decimals: Number(decimals),
          image: tokenImageURL,
        },
      },
    });

    showMessage("Token added to MetaMask!", "success");
  } catch (error) {
    console.error("Add token error:", error);
    showMessage(`Failed to add token: ${error.message} `, "error");
  }
}

function updateNetworkUI() {
  if (getCurrentNetwork()) {
    document.getElementById("network").textContent = getCurrentNetwork().name;
    document.getElementById("tracerAddress").innerHTML = explorerLink(
      "address",
      getContractAddress()
    );

    // Show/hide mainnet warning
    const isMainnet = getCurrentNetwork().name === "Arbitrum One";
    let warning = document.getElementById("mainnetWarning");

    if (
      isMainnet &&
      getContractAddress() === "0x0000000000000000000000000000000000000000"
    ) {
      if (!warning) {
        warning = document.createElement("div");
        warning.id = "mainnetWarning";
        warning.className = "error";
        warning.innerHTML =
          "<strong>⚠️ Mainnet Warning:</strong> Please update the mainnet contract address in the code before using on Arbitrum One.";
        document
          .querySelector(".container")
          .insertBefore(warning, document.getElementById("status"));
      }
    } else if (warning) {
      warning.remove();
    }
  }
}

/**
 * Creates an HTML link to a blockchain explorer for a transaction, address, or contract.
 * @param {string} type - "tx" for transaction, "address" for wallet/contract.
 * @param {string} value - Transaction hash or address.
 * @param {number|string} chainId - The current chain ID.
 * @param {string} [label] - Optional label for the link text (defaults to value).
 * @returns {string} HTML string with link or plain text fallback.
 */

export function explorerLink(type, value, label) {
  const explorer = getCurrentNetwork().blockExplorer;
  const text = label || value;

  if (!explorer || !value) {
    return `<code>${text}</code>`;
  }

  // Normalize type to path
  let path = "";
  if (type === "tx") {
    path = `tx/${value}`;
    return `<code><a href="${explorer}${path}" target="_blank" rel="noopener">${text}</a></code>`;
  } else if (type === "address") {
    path = `address/${value}`;
    return `<code><a style="cursor: pointer;" href="${explorer}${path}" target="_blank" rel="noopener">${text}</a></code>`;
  } else {
    console.warn("Unknown explorer link type:", type);
    return `<code>${text}</code>`;
  }
}

/**
 * Returns a date string formatted for an <input type="datetime-local">,
 * set to a specified number of minutes in the future.
 * @param {number} minsFromNow - The number of minutes from now.
 * @returns {string} The formatted date string (e.g., "2025-08-15T16:21").
 */
function getLocalDeadline(minsFromNow = 60) {
  // 1. Get the target date object
  const targetDate = new Date(Date.now() + minsFromNow * 60 * 1000);

  // 2. Use the built-in toISOString() method, which is the most reliable way
  //    It returns a UTC string like "2025-08-15T14:21:08.123Z"
  const isoString = targetDate.toISOString();

  // 3. Slice the string to get the "YYYY-MM-DDTHH:MM" part,
  //    which is exactly what the datetime-local input needs.
  return isoString.slice(0, 16);
}
