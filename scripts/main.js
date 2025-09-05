import { connectWallet, refreshData, addToMetaMask } from "./wallet.js";

import {
  transferTokens,
  approveTokens,
  checkAllowance,
  checkVotingPower,
  delegateVotingPower,
  signAndSubmitPermit,
  circulationAt,
  transferOwnership,
  releaseTokens,
} from "./operations.js";

import { appState } from "../core/state.js";

function checkMode() {
  const urlParams = new URLSearchParams(window.location.search);
  const vestingAddress = urlParams.get("vesting");

  if (vestingAddress && ethers.isAddress(vestingAddress)) {
    appState.setState("ui.isVestingMode", true);
    document.body.setAttribute("data-mode", "vesting");
    appState.setState("vesting.address", vestingAddress);
  } else {
    appState.setState("ui.isVestingMode", false);
    document.body.setAttribute("data-mode", "default");
  }

  return appState.getState("ui.isVestingMode");
}

checkMode();

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

    appState.setState("tracer.contract", null);
    appState.setState("vesting.contract", null);

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
  const on = (id, handler) => {
    document.getElementById(id)?.addEventListener("click", (e) => {
      // Avoid form submit reloads
      e.preventDefault?.();

      // Run async handler and surface errors instead of silent channel closes
      Promise.resolve(handler(e)).catch((err) => {
        console.error(`${id} failed`, err);
      });
    });
  };

  on("connectBtn", connectWallet);
  on("refreshBtn", refreshData);
  on("addTokenBtn", addToMetaMask);
  /*  Tracer */
  on("transferTokensBtn", transferTokens);
  on("approveTokensBtn", approveTokens);
  on("checkAllowanceBtn", checkAllowance);
  on("signAndSubmitPermitBtn", signAndSubmitPermit);
  on("delegateVotingPowerBtn", delegateVotingPower);
  on("checkVotingPowerBtn", checkVotingPower);
  on("circulationBtn", circulationAt);
  /* Vesting */
  on("transferOwnershipBtn", transferOwnership);
  on("releaseTokensBtn", releaseTokens);
});
