// Contract configuration - both networks
const CONTRACTS = {
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

let currentNetwork = null;
let contractAddress = null;
// ERC20 ABI with ERC20Votes and ERC20Permit functions
const TOKEN_ABI = [
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

let provider, signer, contract, userAccount;

function detectNetwork(chainId) {
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

function updateNetworkUI() {
  if (currentNetwork) {
    document.getElementById("network").textContent = currentNetwork.name;
    document.getElementById("contractAddress").innerHTML = explorerLink(
      "address",
      currentNetwork.address
    );

    // Show/hide mainnet warning
    const isMainnet = currentNetwork.name === "Arbitrum One";
    let warning = document.getElementById("mainnetWarning");

    if (
      isMainnet &&
      contractAddress === "0x0000000000000000000000000000000000000000"
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

async function connectWallet() {
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

function updateUI() {
  if (userAccount) {
    document.getElementById("status").textContent = "Connected to MetaMask";
    document.getElementById("status").className = "status connected";
    document.getElementById("userAddress").innerHTML = explorerLink(
      "address",
      userAccount
    );
    // Enable buttons
    const buttons = [
      "refreshBtn",
      "transferTokensBtn",
      "approveTokensBtn",
      "checkAllowanceBtn",
      "signAndSubmitPermitBtn",
      "checkVotingPowerBtn",
      "delegateVotingPowerBtn",
      "addTokenBtn",
    ];
    buttons.forEach((id) => (document.getElementById(id).disabled = false));

    document.getElementById("connectBtn").textContent = "Connected";
    document.getElementById("connectBtn").disabled = true;
  }
}

async function refreshData() {
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

/**
 * Creates an HTML link to a blockchain explorer for a transaction, address, or contract.
 * @param {string} type - "tx" for transaction, "address" for wallet/contract.
 * @param {string} value - Transaction hash or address.
 * @param {number|string} chainId - The current chain ID.
 * @param {string} [label] - Optional label for the link text (defaults to value).
 * @returns {string} HTML string with link or plain text fallback.
 */
function explorerLink(type, value, label) {
  const explorer = currentNetwork.blockExplorer;
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

async function transferTokens() {
  const to = document.getElementById("transferTo").value;
  const amount = document.getElementById("transferAmount").value;

  if (!to || !amount) {
    showMessage("Please fill in all fields", "error");
    return;
  }

  try {
    const decimals = await contract.decimals();
    const amountWei = ethers.parseUnits(amount, decimals);

    showMessage("Transaction pending... Please confirm in MetaMask", "info");
    const tx = await contract.transfer(to, amountWei);

    showMessage(
      "Transaction submitted! Waiting for confirmation...",
      "success"
    );
    await tx.wait();
    await refreshData();

    document.getElementById("transferTokensResult").innerHTML = `
                            <div class="success">
                                Transfer successul to ${explorerLink(
                                  "address",
                                  to
                                )}<br/>
                                TX Hash: ${explorerLink("tx", tx.hash)}
                            </div>
                       `;

    // Clear inputs
    document.getElementById("transferTo").value = "";
    document.getElementById("transferAmount").value = "";
  } catch (error) {
    console.error("Transfer error:", error);
    showMessage(`Transfer failed: ${error.message}`, "error");
  }
}

async function approveTokens() {
  const spender = document.getElementById("approveSpender").value;
  const amount = document.getElementById("approveAmount").value;

  if (!spender || !amount) {
    showMessage("Please fill in all fields", "error");
    return;
  }

  try {
    const decimals = await contract.decimals();
    const amountWei = ethers.parseUnits(amount, decimals);

    showMessage("Transaction pending... Please confirm in MetaMask", "info");
    const tx = await contract.approve(spender, amountWei);

    showMessage(
      "Transaction submitted! Waiting for confirmation...",
      "success"
    );
    await tx.wait();
    await refreshData();

    document.getElementById("approveTokensResult").innerHTML = `
                            <div class="success">
                                Approval successul to ${explorerLink(
                                  "address",
                                  spender
                                )}<br/>
                                TX Hash: ${explorerLink("tx", tx.hash)}
                            </div>
                       `;

    // Clear inputs
    document.getElementById("approveSpender").value = "";
    document.getElementById("approveAmount").value = "";
  } catch (error) {
    console.error("Approval error:", error);
    showMessage(`Approval failed: ${error.message}`, "error");
  }
}

async function checkAllowance() {
  const owner = document.getElementById("allowanceOwner").value || userAccount;
  const spender = document.getElementById("allowanceSpender").value;

  if (!spender) {
    showMessage("Please enter spender address", "error");
    return;
  }

  try {
    const allowance = await contract.allowance(owner, spender);
    const decimals = await contract.decimals();
    const symbol = await contract.symbol();
    const formattedAllowance = ethers.formatUnits(allowance, decimals);

    document.getElementById("checkAllowanceResult").innerHTML = `
                    <div class="success">
                        Allowance: ${parseFloat(
                          formattedAllowance
                        ).toLocaleString()} ${symbol}
                    </div>
                `;
  } catch (error) {
    console.error("Allowance check error:", error);
    showMessage(`Failed to check allowance: ${error.message}`, "error");
  }
}

async function delegateVotingPower() {
  const delegatee =
    document.getElementById("delegateAddress").value || userAccount;

  if (!ethers.isAddress(delegatee)) {
    showMessage("Invalid delegatee address", "error");
    return;
  }

  try {
    document.getElementById("delegateVotingPowerBtn").disabled = true;
    showMessage("Sending delegation transaction...", "info");

    const tx = await contract.delegate(delegatee);
    await tx.wait();

    await refreshData();

    document.getElementById("delegateVotingPowerResult").innerHTML = `
            <div class="success">
                Successfully delegated to ${explorerLink(
                  "address",
                  delegatee
                )}<br>
                Tx Hash: ${explorerLink("tx", tx.hash)}

            </div>
        `;
    showMessage("Delegation successful!", "success");
  } catch (error) {
    console.error("Delegation error:", error);
    showMessage(`Delegation failed: ${error.message}`, "error");
  } finally {
    document.getElementById("delegateVotingPowerBtn").disabled = false;
  }
}

async function checkVotingPower() {
  const address =
    document.getElementById("votingPowerAddress").value || userAccount;

  if (!ethers.isAddress(address)) {
    showMessage("Invalid address", "error");
    return;
  }

  try {
    document.getElementById("checkVotingPowerBtn").disabled = TRUE;
    showMessage("Fetching voting power...", "info");

    const votes = await contract.getVotes(address);
    const decimals = await contract.decimals();
    const symbol = await contract.symbol();
    const formattedVotes = ethers.formatUnits(votes, decimals);

    document.getElementById("checkVotingPowerResult").innerHTML = `
            <div class="success">
                Voting Power: ${parseFloat(
                  formattedVotes
                ).toLocaleString()} ${symbol}
            </div>
        `;
    showMessage("Voting power retrieved!", "success");
  } catch (error) {
    console.error("Voting power error:", error);
    showMessage(`Failed to fetch voting power: ${error.message}`, "error");
  } finally {
    document.getElementById("checkVotingPowerBtn").disabled = false;
  }
}

async function signAndSubmitPermit() {
  const spender = document.getElementById("permitSpenderAddress").value.trim();
  const amountStr = document.getElementById("permitAmount").value.trim();
  const deadlineStr = document.getElementById("deadlineStr").value.trim(); // <input type="datetime-local">

  // Basic validations
  if (!ethers.isAddress(spender)) {
    showMessage("Invalid permit spender address", "error");
    return;
  }
  if (!amountStr || isNaN(Number(amountStr)) || Number(amountStr) <= 0) {
    showMessage("Enter a valid amount", "error");
    return;
  }
  if (!deadlineStr) {
    showMessage("Please choose a deadline (date & time)", "error");
    return;
  }

  try {
    // Disable button + info
    const btn = document.getElementById("signAndSubmitPermitBtn");
    btn.disabled = true;
    showMessage("Signing permit and sending transaction…", "info");

    // Gather data
    const [decimals, name, tokenAddress, nonce, network] = await Promise.all([
      contract.decimals(),
      contract.name(),
      contract.getAddress(),
      contract.nonces(userAccount),
      provider.getNetwork(),
    ]);

    const value = ethers.parseUnits(amountStr, decimals);

    // Convert local datetime to UNIX seconds
    const deadlineMs = new Date(deadlineStr).getTime();
    if (Number.isNaN(deadlineMs)) {
      showMessage("Invalid deadline format", "error");
      btn.disabled = false;
      return;
    }
    const deadline = Math.floor(deadlineMs / 1000);
    const nowSec = Math.floor(Date.now() / 1000);
    console.log(deadline);
    console.log(nowSec);

    if (deadline <= nowSec) {
      showMessage("Deadline must be in the future", "error");
      btn.disabled = false;
      return;
    }

    // EIP-712 domain/types/message
    const domain = {
      name,
      version: "1", // OpenZeppelin ERC20Permit default
      chainId: Number(network.chainId),
      verifyingContract: tokenAddress,
    };

    const types = {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };

    const message = {
      owner: userAccount,
      spender,
      value,
      nonce,
      deadline,
    };

    // Ask wallet to sign typed data (EIP-712)
    const signature = await signer.signTypedData(domain, types, message);
    const { v, r, s } = ethers.Signature.from(signature);

    // Submit permit on-chain
    const tx = await contract.permit(
      userAccount,
      spender,
      value,
      deadline,
      v,
      r,
      s
    );
    showMessage(
      "Transaction submitted! Waiting for confirmation...",
      "success"
    );

    await refreshData();
    await tx.wait();

    document.getElementById("signAndSubmitPermitResult").innerHTML = `
                            <div class="success">
                                Permit submitted successfully for ${explorerLink(
                                  "address",
                                  spender
                                )}<br/>
                                Tx Hash: ${explorerLink("tx", tx.hash)}
                            </div>
                       `;
    showMessage(
      "Permit successful! Allowance has been set via signature.",
      "success"
    );
  } catch (error) {
    console.error("Permit error:", error);
    showMessage(`Permit failed: ${error.message} `, "error");
  } finally {
    document.getElementById("signAndSubmitPermitBtn").disabled = false;
  }
}

async function addToMetaMask() {
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

function safeDelay(callback, ms = 0) {
  return new Promise((resolve) => {
    const startTime = performance.now();
    function checkTime() {
      if (performance.now() - startTime >= ms) {
        callback();
        resolve();
      } else {
        requestAnimationFrame(checkTime);
      }
    }
    requestAnimationFrame(checkTime);
  });
}

function showMessage(message, type) {
  const messagesDiv = document.getElementById("messages");
  const messageDiv = document.createElement("div");
  messageDiv.className = type;
  messageDiv.textContent = message;
  messagesDiv.appendChild(messageDiv);

  // Remove message after 5 seconds
  safeDelay(() => {
    if (messageDiv.parentNode) {
      messageDiv.parentNode.removeChild(messageDiv);
    }
  }, 5000);
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

// Listen for account changes with error handling
if (typeof window.ethereum !== "undefined") {
  // Wrap event listeners in try-catch to handle origin errors
  try {
    window.ethereum.on("accountsChanged", function (accounts) {
      if (accounts.length === 0) {
        location.reload();
      } else {
        requestAnimationFrame(() => connectWallet());
      }
    });

    window.ethereum.on("chainChanged", function (chainId) {
      // Detect new network and reconnect
      requestAnimationFrame(async () => {
        try {
          await connectWallet();
        } catch (error) {
          location.reload();
        }
      });
    });
  } catch (error) {
    console.warn("Event listener setup failed:", error);
  }
}

// Auto-connect if previously connected
window.addEventListener("load", async function () {
  await new Promise((resolve) => {
    if (document.readyState === "complete") {
      resolve();
    } else {
      window.addEventListener("load", resolve, { once: true });
    }
  });

  if (typeof window.ethereum !== "undefined") {
    try {
      // Check if MetaMask is unlocked and has connected accounts
      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });
      if (accounts.length > 0) {
        // Use requestAnimationFrame for immediate but async execution
        requestAnimationFrame(() => connectWallet());
      }
    } catch (error) {
      console.warn("Auto-connect check failed:", error);
      // Don't show error message for auto-connect failures
    }
  } else {
    console.warn("MetaMask not detected on page load");
  }
});

document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("connectBtn")
    ?.addEventListener("click", connectWallet);
  document.getElementById("refreshBtn")?.addEventListener("click", refreshData);
  document
    .getElementById("addTokenBtn")
    ?.addEventListener("click", addToMetaMask);
  document
    .getElementById("transferBtn")
    ?.addEventListener("click", transferTokens);
  document
    .getElementById("approveBtn")
    ?.addEventListener("click", approveTokens);
  document
    .getElementById("checkAllowanceBtn")
    ?.addEventListener("click", checkAllowance);

  document
    .getElementById("signAndSubmitPermitBtn")
    ?.addEventListener("click", signAndSubmitPermit);
  document
    .getElementById("delegateVotingPowerBtn")
    ?.addEventListener("click", delegateVotingPower);
  document
    .getElementById("checkAllowanceBtn")
    ?.addEventListener("click", checkAllowance);
});
