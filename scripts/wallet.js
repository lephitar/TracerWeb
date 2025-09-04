import { appState } from "../core/state.js";
import { getTokenContract, getVestingContract } from "./contracts.js";
import { CHAINS, CONTRACTS } from "./config.js";
import { updateUI, showMessage, updateNetworkUI } from "./ui.js";

export function detectNetwork(chainId) {
  const networkId = parseInt(chainId);
  const currentNetwork = CHAINS[networkId];
  console.log(currentNetwork?.name);

  if (currentNetwork) {
    const tracerAddress = CONTRACTS[networkId].tracer;

    // UPDATE state instead of global variables:
    appState.setState("wallet.network", currentNetwork);
    appState.setState("contracts.tokenAddress", tracerAddress);

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
        appState.getState("contracts.vestingAddress"),
        signer
      );
      const vestingOwner = await vestingContract.owner();
      appState.setState("contracts.vesting", vestingContract);
      appState.setState("contracts.vestingOwner", vestingOwner);
    }

    await refreshData();
    updateUI();
    updateNetworkUI();

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
  console.log("RefreshData");
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

    if (appState.getState("ui.isVestingMode")) {
      const vestingContract = appState.getState("contracts.vesting");
      const tokenAddr = appState.getState("contracts.tokenAddress");
      const vestingAddr = appState.getState("contracts.vestingAddress");
      const provider = appState.getState("wallet.provider");

      const [
        vestingStart,
        vestingEnd,
        released,
        releasable,
        owner,
        balance,
        now,
      ] = await Promise.all([
        vestingContract.start(),
        vestingContract.end(),
        vestingContract["released(address)"](tokenAddr),
        vestingContract["releasable(address)"](tokenAddr),
        vestingContract.owner(),
        tracerContract.balanceOf(vestingAddr),
        provider.getBlock("latest"),
      ]);

      appState.setState("data.vestingStart", vestingStart);
      appState.setState("data.vestingEnd", vestingEnd);
      appState.setState("data.vestingReleased", released);
      appState.setState("data.vestingReleasable", releasable);
      appState.setState("data.unvestedBalance", balance - releasable);
      appState.setState(
        "data.vestingStarted",
        BigInt(now.timestamp) > vestingStart
      );
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
