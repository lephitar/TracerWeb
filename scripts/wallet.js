import { CONTRACTS } from "./contracts.js";
import { TOKEN_ABI } from "./ABI.js";
import { updateUI, showMessage } from "./ui.js";

let signer;
export function getSigner() {
  return signer;
}

let provider;
export function getProvider() {
  return provider;
}

let contract;
export function getContract() {
  return contract;
}

let currentNetwork = null;
export function getCurrentNetwork() {
  return currentNetwork;
}

let contractAddress = null;
export function getContractAddress() {
  return contractAddress;
}

let userAccount;
export function getUserAccount() {
  return userAccount;
}

export function detectNetwork(chainId) {
  const networkId = parseInt(chainId);
  currentNetwork = CONTRACTS[networkId];

  if (currentNetwork) {
    contractAddress = currentNetwork.address;
    document.getElementById("network").textContent = currentNetwork.name;
    document.getElementById("contractAddress").innerHTML = explorerLink(
      "address",
      currentNetwork.address
    );
    return true;
  } else {
    currentNetwork = null;
    contractAddress = null;
    return false;
  }
}

/* Buttons */

export async function connectWallet() {
  try {
    if (typeof window.ethereum === "undefined") {
      showMessage("MetaMask is not installed!", "error");
      return;
    }
    // Ensure MetaMask is fully loaded
    await new Promise((resolve) => {
      if (document.readyState === "complete") {
        resolve();
      } else {
        window.addEventListener("load", resolve, { once: true });
      }
    });

    // Request account access with additional options for file:// protocol
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
      params: [],
    });

    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts found. Please unlock MetaMask.");
    }

    // Initialize ethers provider
    provider = new ethers.BrowserProvider(window.ethereum);

    // Wait for provider to be ready
    await provider._detectNetwork();

    // Get current network
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

    signer = await provider.getSigner();
    userAccount = await signer.getAddress();

    // Initialize contract with current network
    contract = new ethers.Contract(contractAddress, TOKEN_ABI, signer);

    document.getElementById("checkVotingPowerBtn").disabled = false;
    document.getElementById("delegateVotingPowerBtn").disabled = false;
    document.getElementById("signAndSubmitPermitBtn").disabled = false;
    document.getElementById("deadlineStr").value = getLocalDeadline(120);

    updateUI();

    updateNetworkUI();

    await refreshData();

    showMessage(`Successfully connected to ${currentNetwork.name}!`, "success");
  } catch (error) {
    console.error("Connection error:", error);

    // Handle specific MetaMask errors
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
  if (!contract || !userAccount) return;

  try {
    // Get token info
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
      contract.balanceOf(userAccount),
      contract.totalSupply(),
      contract.nonces(userAccount),
      contract.name(),
      contract.symbol(),
      contract.decimals(),
      contract.getVotes(userAccount),
      contract.delegates(userAccount),
    ]);

    // Format and display
    const formattedBalance = ethers.formatUnits(balance, decimals);
    const formattedTotalSupply = ethers.formatUnits(totalSupply, decimals);
    const formattedVotingPower = ethers.formatUnits(votingPower, decimals);

    document.getElementById("balance").textContent = `${parseFloat(
      formattedBalance
    ).toLocaleString()} ${symbol}`;
    document.getElementById("totalSupply").textContent = `${parseFloat(
      formattedTotalSupply
    ).toLocaleString()} ${symbol}`;
    document.getElementById("nonce").textContent = nonce.toString();
    document.getElementById("votingPower").textContent = `${parseFloat(
      formattedVotingPower
    ).toLocaleString()} ${symbol}`;

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
    // Toggle the class only if it's an address
    if (ethers.isAddress(displayDelegate)) {
      el.classList.add("contract-info");
    } else {
      el.classList.remove("contract-info");
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
      contract.symbol(),
      contract.decimals(),
    ]);
    const tokenImageURL =
      "https://tracer.endglobalwarming.net/assets/tracerroundicon.svg";

    await window.ethereum.request({
      method: "wallet_watchAsset",
      params: {
        type: "ERC20",
        options: {
          address: contractAddress,
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
    document.getElementById("contractAddress").innerHTML = explorerLink(
      "address",
      getCurrentNetwork().address
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
