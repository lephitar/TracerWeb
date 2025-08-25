/* Operations */
import { getUserAccount, explorerLink } from "./wallet.js";
import { getVestingAddress } from "./main.js";

export function showMessage(message, type) {
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

export function updateUI() {
  if (getVestingAddress()) {
    document.getElementById("vestingAddress").innerHTML = explorerLink(
      "address",
      getVestingAddress()
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
    ];
    buttons.forEach((id) => (document.getElementById(id).disabled = false));

    document.getElementById("connectBtn").textContent = "Connected";
    document.getElementById("connectBtn").disabled = true;
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
