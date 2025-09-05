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
    appState.setState("tracer.address", tracerAddress);

    return true;
  } else {
    appState.setState("wallet.network", null);
    appState.setState("tracer.address", null);
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
      appState.getState("tracer.address"),
      signer
    );
    appState.setState("tracer.contract", tracerContract);

    const [name, symbol, decimals] = await Promise.all([
      tracerContract.name(),
      tracerContract.symbol(),
      tracerContract.decimals(),
    ]);

    appState.setState("tracer.name", name);
    appState.setState("tracer.symbol", symbol);
    appState.setState("tracer.decimals", decimals);

    if (appState.getState("ui.isVestingMode")) {
      const vestingContract = getVestingContract(
        appState.getState("vesting.address"),
        signer
      );
      appState.setState("vesting.contract", vestingContract);

      const [vestingStart, vestingEnd] = await Promise.all([
        vestingContract.start(),
        vestingContract.end(),
      ]);

      appState.setState("vesting.start", vestingStart);
      appState.setState("vesting.end", vestingEnd);
    }

    await refreshData();

    showMessage(
      `Successfully connected to ${appState.getState("tracer.name")}!`,
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
  const tracerContract = appState.getState("tracer.contract");
  const userAccount = appState.getState("wallet.account");

  if (!tracerContract || !userAccount) return;

  try {
    const [balance, totalSupply, nonce, votingPower, delegates] =
      await Promise.all([
        tracerContract.balanceOf(userAccount),
        tracerContract.totalSupply(),
        tracerContract.nonces(userAccount),
        tracerContract.getVotes(userAccount),
        tracerContract.delegates(userAccount),
      ]);

    appState.setState("tracerData.balance", balance);
    appState.setState("tracerData.totalSupply", totalSupply);
    appState.setState("tracerData.nonce", nonce);
    appState.setState("tracerData.votingPower", votingPower);
    appState.setState("tracerData.delegates", delegates);

    if (appState.getState("ui.isVestingMode")) {
      const vestingContract = appState.getState("vesting.contract");
      const tokenAddr = appState.getState("tracer.address");
      const vestingAddr = appState.getState("vesting.address");
      const provider = appState.getState("wallet.provider");

      const [released, releasable, owner, balance, now] = await Promise.all([
        vestingContract["released(address)"](tokenAddr),
        vestingContract["releasable(address)"](tokenAddr),
        vestingContract.owner(),
        tracerContract.balanceOf(vestingAddr),
        provider.getBlock("latest"),
      ]);

      appState.setState("vestingData.released", released);
      appState.setState("vestingData.releasable", releasable);
      appState.setState("vestingData.unvested", balance - releasable);
      appState.setState("vestingData.owner", owner);
      appState.setState(
        "vestingData.started",
        BigInt(now.timestamp) > appState.getState("vesting.start")
      );
    }

    showMessage("Data refreshed successfully!", "success");
  } catch (error) {
    console.error("Refresh error:", error);
    showMessage(`Failed to refresh data: ${error.message}`, "error");
  }
  updateUI();
  updateNetworkUI();
}

export async function addToMetaMask() {
  try {
    const symbol = appState.getState("tracer.symbol");
    const decimals = appState.getState("tracer.decimals");
    const tokenImageURL =
      "https://tracer.endglobalwarming.net/assets/tracerroundicon.svg";
    console.log(symbol, ", ", decimals, ", ", tokenImageURL);
    console.log(appState.getState("tracer.address"));
    await window.ethereum.request({
      method: "wallet_watchAsset",
      params: {
        type: "ERC20",
        options: {
          address: appState.getState("tracer.address"),
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
