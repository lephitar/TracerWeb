/* Operations */
import { getUserAccount, explorerLink } from "./wallet.js";

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
  if (window.appState.isVestingMode) {
    document.getElementById("vestingAddress").innerHTML = explorerLink(
      "address",
      window.vestingAddress
    );
    document.getElementById("vestingDestination").innerHTML = explorerLink(
      "address",
      ""
    );
  }
  if (getUserAccount()) {
    document.getElementById("status").textContent = "Connected to MetaMask";
    document.getElementById("status").className = "status connected";
    document.getElementById("userAddress").innerHTML = explorerLink(
      "address",
      getUserAccount()
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
      "transferOwnershipBtn",
      "releaseTokensBtn",
      "circulationBtn",
    ];
    buttons.forEach((id) => (document.getElementById(id).disabled = false));

    document.getElementById("connectBtn").textContent = "Connected";
    document.getElementById("connectBtn").disabled = true;
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
