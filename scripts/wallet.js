import { getTokenContract, getVestingContract } from "./contracts.js";
import { CHAINS, CONTRACTS } from "./config.js";
import { updateUI, showMessage } from "./ui.js";
import {
  formatAmount,
  toLocalFromSeconds,
  explorerLink,
  getLocalDeadline,
} from "./utils.js";
import { appState } from "../core/state.js";

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
      const vestingContract = getVestingContract(
        appState.getState("contract.vestingAddress"),
        signer
      );
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
      `Successfully connected to ${appState.getState("data.name")}!`,
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
  const tracerContract = appState.getState("contracts.token");
  const userAccount = appState.getState("wallet.account");

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

      appState.setState("data.vestingStart", vestingStart);
      appState.setState("data.vestingEnd", vestingEnd);
      appState.setState("data.vestingReleased", released);
      appState.setState("data.vestingReleasable", releasable);
      appState.setState("data.unvestedBalance", balance - releasable);

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
    const symbol = appState.getState("data.symbol");
    const decimals = appState.getState("data.decimals");
    const tokenImageURL =
      "https://tracer.endglobalwarming.net/assets/tracerroundicon.svg";
    console.log(symbol, ", ", decimals, ", ", tokenImageURL);
    console.log(appState.getState("contracts.tokenAddress"));
    await window.ethereum.request({
      method: "wallet_watchAsset",
      params: {
        type: "ERC20",
        options: {
          address: appState.getState("contracts.tokenAddress"),
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
  if (appState.getState("wallet.network")) {
    document.getElementById("network").textContent =
      appState.getState("data.name");
    document.getElementById("tracerAddress").innerHTML = explorerLink(
      "address",
      appState.getState("contracts.tokenAddress")
    );

    // Show/hide mainnet warning
    const isMainnet =
      appState.getState("wallet.network").name === "Arbitrum One";
    let warning = document.getElementById("mainnetWarning");

    if (
      isMainnet &&
      appState.getState("contracts.tokenAddress") ===
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
