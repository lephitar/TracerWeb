/* Operations */
import { appState } from "../core/state.js"; // ADD this line
import {
  formatAmount,
  toLocalFromSeconds,
  explorerLink,
  getLocalDeadline,
} from "./utils.js";

export function showMessage(message, type = "success") {
  const messagesDiv = document.getElementById("messages");
  const messageDiv = document.createElement("div");
  messageDiv.className = type;
  messageDiv.textContent = message;
  messagesDiv.appendChild(messageDiv);

  messagesDiv.prepend(messageDiv);
  // Remove message afetr 8 secs
  setTimeout(() => messageDiv.remove(), 8000);
}

export function updateUI() {
  if (appState.getState("wallet.account")) {
    document.getElementById("status").textContent = "Connected to MetaMask";
    document.getElementById("status").className = "status connected";
    document.getElementById("userAddress").innerHTML = explorerLink(
      "address",
      appState.getState("wallet.account")
    );
    // Enable buttons
    const buttons = [
      "refreshBtn",
      "addTokenBtn",
      "transferTokensBtn",
      "approveTokensBtn",
      "checkAllowanceBtn",
      "signAndSubmitPermitBtn",
      "checkVotingPowerBtn",
      "delegateVotingPowerBtn",
      "burnBtn",
    ];

    buttons.forEach((id) => (document.getElementById(id).disabled = false));

    document.getElementById("connectBtn").textContent = "Connected";
    document.getElementById("connectBtn").disabled = true;

    document.getElementById("deadlineStr").value = getLocalDeadline(120);
    //    document.getElementById("circulationTime").value = getLocalDeadline(0);

    const symbol = appState.getState("tracer.symbol");
    const decimals = appState.getState("tracer.decimals");

    // Format and display (keep this part the same for now)
    const formattedBalance = formatAmount(
      appState.getState("tracerData.balance"),
      decimals
    );
    const formattedTotalSupply = formatAmount(
      appState.getState("tracerData.totalSupply"),
      decimals
    );
    const formattedVotingPower = formatAmount(
      appState.getState("tracerData.votingPower"),
      decimals
    );

    document.getElementById(
      "balance"
    ).textContent = `${formattedBalance} ${symbol}`;
    document.getElementById(
      "totalSupply"
    ).textContent = `${formattedTotalSupply} ${symbol}`;
    document.getElementById("nonce").textContent = appState
      .getState("tracerData.nonce")
      .toString();
    document.getElementById(
      "votingPower"
    ).textContent = `${formattedVotingPower} ${symbol}`;

    const el = document.getElementById("delegates");

    let displayDelegate;
    if (delegates === ethers.ZeroAddress) {
      displayDelegate = "No delegate set";
    } else if (
      appState.getState("tracerData.delegates").toLowerCase() ===
      appState.getState("wallet.account").toLowerCase()
    ) {
      displayDelegate = "Self-delegated";
    } else {
      displayDelegate = appState.getState("tracerData.delegates");
    }
    el.textContent = displayDelegate;

    if (ethers.isAddress(displayDelegate)) {
      el.classList.add("contract-info");
    } else {
      el.classList.remove("contract-info");
    }

    if (appState.getState("ui.isVestingMode")) {
      document.getElementById("vestingDestination").innerHTML = explorerLink(
        "address",
        appState.getState("vestingData.owner")
      );

      const formattedUnvested = formatAmount(
        appState.getState("vestingData.unvested"),
        decimals
      );
      document.getElementById(
        "unvestedBalance"
      ).textContent = `${formattedUnvested} ${symbol}`;

      const formattedRelease = formatAmount(
        appState.getState("vestingData.released"),
        decimals
      );
      document.getElementById(
        "releasedVesting"
      ).textContent = `${formattedRelease} ${symbol}`;

      const formattedReleasable = formatAmount(
        appState.getState("vestingData.releasable"),
        decimals
      );
      document.getElementById(
        "releasableVesting"
      ).textContent = `${formattedReleasable} ${symbol}`;

      const formattedStart = toLocalFromSeconds(
        Number(appState.getState("vesting.start"))
      );
      document.getElementById("vestingStart").textContent = formattedStart;

      const formattedEnd = toLocalFromSeconds(
        Number(appState.getState("vesting.end"))
      );
      document.getElementById("vestingEnd").textContent = formattedEnd;

      document.getElementById("vestingAddress").innerHTML = explorerLink(
        "address",
        appState.getState("vesting.address")
      );

      // Activate transfer owenership only if owner
      const isNotOwner =
        appState.getState("wallet.account") !=
        appState.getState("vestingData.owner");

      document.getElementById("transferOwnershipBtn").disabled = isNotOwner;
      document.getElementById("ownerBadge").hidden = isNotOwner;

      // Disable Release button if vesting hasn't started.
      document.getElementById("releaseTokensBtn").disabled = !appState.getState(
        "vestingData.started"
      );
    }
  }
}

export function updateNetworkUI() {
  if (appState.getState("wallet.network")) {
    document.getElementById("network").textContent =
      appState.getState("wallet.network").name;
    document.getElementById("tracerAddress").innerHTML = explorerLink(
      "address",
      appState.getState("tracer.address")
    );

    // Show/hide mainnet warning
    const isMainnet =
      appState.getState("wallet.network").name === "Arbitrum One";
    let warning = document.getElementById("mainnetWarning");

    if (
      isMainnet &&
      appState.getState("tracer.address") ===
        "0x0000000000000000000000000000000000000000"
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

// Format large numbers for display
export function formatNumber(value, decimals = 2) {
  if (typeof value === "string") {
    value = parseFloat(value);
  }

  if (isNaN(value)) return "0";

  // Use toLocaleString for thousands separators
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

// Truncate address for display
export function truncateAddress(address, startLength = 6, endLength = 4) {
  if (!address) return "";
  if (address.length <= startLength + endLength) return address;

  return `${address.substring(0, startLength)}...${address.substring(
    address.length - endLength
  )}`;
}

// Add loading state to button
export function setButtonLoading(buttonId, isLoading, originalText = null) {
  const button = document.getElementById(buttonId);
  if (!button) return;

  if (isLoading) {
    button.dataset.originalText = button.textContent;
    button.textContent = "Processing...";
    button.disabled = true;
    button.style.opacity = "0.6";
  } else {
    button.textContent =
      originalText || button.dataset.originalText || button.textContent;
    button.disabled = false;
    button.style.opacity = "1";
    delete button.dataset.originalText;
  }
}

// Update result containers
export function updateResultContainer(containerId, content, isError = false) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="${isError ? "error" : "success"}">
      ${content}
    </div>
  `;
}
