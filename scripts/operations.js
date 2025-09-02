/* Operations */
import {
  getUserAccount,
  getContract,
  getProvider,
  getSigner,
  explorerLink,
  refreshData,
  getVesting,
} from "./wallet.js";
import { showMessage, setButtonLoading, updateResultContainer } from "./ui.js";

/* ERC20 Token Operations */

export async function transferTokens() {
  const to = document.getElementById("transferTo").value;
  const amount = document.getElementById("transferAmount").value;

  if (!to || !amount) {
    showMessage("Please fill in all fields", "error");
    return;
  }

  if (!ethers.isAddress(to)) {
    showMessage("Invalid recipient address", "error");
    return;
  }

  try {
    setButtonLoading("transferTokensBtn", true);

    const decimals = await getContract().decimals();
    const amountWei = ethers.parseUnits(amount, decimals);

    showMessage("Transaction pending... Please confirm in MetaMask", "info");
    const tx = await getContract().transfer(to, amountWei);

    showMessage(
      "Transaction submitted! Waiting for confirmation...",
      "success"
    );
    await tx.wait();
    await refreshData();

    updateResultContainer(
      "transferTokensResult",
      `
      Transfer successful to ${explorerLink("address", to)}<br/>
      TX Hash: ${explorerLink("tx", tx.hash)}
    `
    );

    // Clear inputs
    document.getElementById("transferTo").value = "";
    document.getElementById("transferAmount").value = "";

    showMessage("Transfer completed successfully!", "success");
  } catch (error) {
    console.error("Transfer error:", error);
    showMessage(`Transfer failed: ${error.message}`, "error");
    updateResultContainer(
      "transferTokensResult",
      `Transfer failed: ${error.message}`,
      true
    );
  } finally {
    setButtonLoading("transferTokensBtn", false);
  }
}

export async function approveTokens() {
  const spender = document.getElementById("approveSpender").value;
  const amount = document.getElementById("approveAmount").value;

  if (!spender || !amount) {
    showMessage("Please fill in all fields", "error");
    return;
  }

  if (!ethers.isAddress(spender)) {
    showMessage("Invalid spender address", "error");
    return;
  }

  try {
    setButtonLoading("approveTokensBtn", true);

    const decimals = await getContract().decimals();
    const amountWei = ethers.parseUnits(amount, decimals);

    showMessage("Transaction pending... Please confirm in MetaMask", "info");
    const tx = await getContract().approve(spender, amountWei);

    showMessage(
      "Transaction submitted! Waiting for confirmation...",
      "success"
    );
    await tx.wait();
    await refreshData();

    updateResultContainer(
      "approveTokensResult",
      `
      Approval successful to ${explorerLink("address", spender)}<br/>
      TX Hash: ${explorerLink("tx", tx.hash)}
    `
    );

    // Clear inputs
    document.getElementById("approveSpender").value = "";
    document.getElementById("approveAmount").value = "";

    showMessage("Approval completed successfully!", "success");
  } catch (error) {
    console.error("Approval error:", error);
    showMessage(`Approval failed: ${error.message}`, "error");
    updateResultContainer(
      "approveTokensResult",
      `Approval failed: ${error.message}`,
      true
    );
  } finally {
    setButtonLoading("approveTokensBtn", false);
  }
}

export async function checkAllowance() {
  const owner =
    document.getElementById("allowanceOwner").value || getUserAccount();
  const spender = document.getElementById("allowanceSpender").value;

  if (!spender) {
    showMessage("Please enter spender address", "error");
    return;
  }

  if (!ethers.isAddress(spender)) {
    showMessage("Invalid spender address", "error");
    return;
  }

  if (owner && !ethers.isAddress(owner)) {
    showMessage("Invalid owner address", "error");
    return;
  }

  try {
    setButtonLoading("checkAllowanceBtn", true);

    const allowance = await getContract().allowance(owner, spender);
    const decimals = await getContract().decimals();
    const symbol = await getContract().symbol();
    const formattedAllowance = ethers.formatUnits(allowance, decimals);

    updateResultContainer(
      "checkAllowanceResult",
      `
      Allowance: ${parseFloat(formattedAllowance).toLocaleString()} ${symbol}
    `
    );
  } catch (error) {
    console.error("Allowance check error:", error);
    showMessage(`Failed to check allowance: ${error.message}`, "error");
    updateResultContainer(
      "checkAllowanceResult",
      `Failed to check allowance: ${error.message}`,
      true
    );
  } finally {
    setButtonLoading("checkAllowanceBtn", false);
  }
}

export async function signAndSubmitPermit() {
  const spender = document.getElementById("permitSpenderAddress").value.trim();
  const amountStr = document.getElementById("permitAmount").value.trim();
  const deadlineStr = document.getElementById("deadlineStr").value.trim();

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
    setButtonLoading("signAndSubmitPermitBtn", true);
    showMessage("Signing permit and sending transaction…", "info");

    // Gather data
    const [decimals, name, tokenAddress, nonce, network] = await Promise.all([
      getContract().decimals(),
      getContract().name(),
      getContract().getAddress(),
      getContract().nonces(getUserAccount()),
      getProvider().getNetwork(),
    ]);

    const value = ethers.parseUnits(amountStr, decimals);

    // Convert local datetime to UNIX seconds
    const deadlineMs = new Date(deadlineStr).getTime();
    if (Number.isNaN(deadlineMs)) {
      showMessage("Invalid deadline format", "error");
      return;
    }
    const deadline = Math.floor(deadlineMs / 1000);
    const nowSec = Math.floor(Date.now() / 1000);

    if (deadline <= nowSec) {
      showMessage("Deadline must be in the future", "error");
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
      owner: getUserAccount(),
      spender,
      value,
      nonce,
      deadline,
    };

    // Ask wallet to sign typed data (EIP-712)
    const signature = await getSigner().signTypedData(domain, types, message);
    const { v, r, s } = ethers.Signature.from(signature);

    // Submit permit on-chain
    const tx = await getContract().permit(
      getUserAccount(),
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

    await tx.wait();
    await refreshData();

    updateResultContainer(
      "signAndSubmitPermitResult",
      `
      Permit submitted successfully for ${explorerLink("address", spender)}<br/>
      Tx Hash: ${explorerLink("tx", tx.hash)}
    `
    );

    showMessage(
      "Permit successful! Allowance has been set via signature.",
      "success"
    );

    // Clear inputs
    document.getElementById("permitSpenderAddress").value = "";
    document.getElementById("permitAmount").value = "";
  } catch (error) {
    console.error("Permit error:", error);
    showMessage(`Permit failed: ${error.message}`, "error");
    updateResultContainer(
      "signAndSubmitPermitResult",
      `Permit failed: ${error.message}`,
      true
    );
  } finally {
    setButtonLoading("signAndSubmitPermitBtn", false);
  }
}

export async function checkVotingPower() {
  const address =
    document.getElementById("votingPowerAddress").value || getUserAccount();

  if (!ethers.isAddress(address)) {
    showMessage("Invalid address", "error");
    return;
  }

  try {
    setButtonLoading("checkVotingPowerBtn", true);
    showMessage("Fetching voting power...", "info");

    const votes = await getContract().getVotes(address);
    const decimals = await getContract().decimals();
    const symbol = await getContract().symbol();
    const formattedVotes = ethers.formatUnits(votes, decimals);

    updateResultContainer(
      "checkVotingPowerResult",
      `
      Voting Power: ${parseFloat(formattedVotes).toLocaleString()} ${symbol}
    `
    );

    showMessage("Voting power retrieved!", "success");
  } catch (error) {
    console.error("Voting power error:", error);
    showMessage(`Failed to fetch voting power: ${error.message}`, "error");
    updateResultContainer(
      "checkVotingPowerResult",
      `Failed to fetch voting power: ${error.message}`,
      true
    );
  } finally {
    setButtonLoading("checkVotingPowerBtn", false);
  }
}

export async function delegateVotingPower() {
  const delegatee =
    document.getElementById("delegateAddress").value || getUserAccount();

  if (!ethers.isAddress(delegatee)) {
    showMessage("Invalid delegatee address", "error");
    return;
  }

  try {
    setButtonLoading("delegateVotingPowerBtn", true);
    showMessage("Sending delegation transaction...", "info");

    const tx = await getContract().delegate(delegatee);
    showMessage(
      "Transaction submitted! Waiting for confirmation...",
      "success"
    );

    await tx.wait();
    await refreshData();

    updateResultContainer(
      "delegateVotingPowerResult",
      `
      Successfully delegated to ${explorerLink("address", delegatee)}<br>
      Tx Hash: ${explorerLink("tx", tx.hash)}
    `
    );

    showMessage("Delegation successful!", "success");

    // Clear input
    document.getElementById("delegateAddress").value = "";
  } catch (error) {
    console.error("Delegation error:", error);
    showMessage(`Delegation failed: ${error.message}`, "error");
    updateResultContainer(
      "delegateVotingPowerResult",
      `Delegation failed: ${error.message}`,
      true
    );
  } finally {
    setButtonLoading("delegateVotingPowerBtn", false);
  }
}

export async function circulationAt() {
  const circulationTime = document
    .getElementById("circulationTime")
    .value.trim();

  if (!circulationTime) {
    showMessage("Please choose a date & time", "error");
    return;
  }

  // Convert local datetime to UNIX seconds
  const circulationAtQuery = new Date(circulationTime).getTime();
  if (Number.isNaN(circulationAtQuery)) {
    showMessage("Invalid date format", "error");
    return;
  }
  const circulationAtValue = Math.floor(circulationAtQuery / 1000);

  try {
    setButtonLoading("circulationBtn", true);

    const circulation = await getContract().circulatingSupplyAt(
      BigInt(circulationAtValue)
    );
    const decimals = await getContract().decimals();
    const symbol = await getContract().symbol();
    const formattedCirculation = ethers.formatUnits(circulation, decimals);
    const circulatingSupply = ethers.formatUnits(
      await getContract().totalSupply(),
      decimals
    );

    updateResultContainer(
      "circulationResult",
      `
      Circulation at ${new Date(
        circulationTime
      ).toLocaleString()}: ${parseFloat(
        Math.floor(formattedCirculation)
      ).toLocaleString()} ${symbol} = ${parseFloat(
        (100 * formattedCirculation) / circulatingSupply
      ).toLocaleString()}%
    `
    );
  } catch (error) {
    console.error("Circulation check error:", error);
    showMessage(`Failed to check circulation: ${error.message}`, "error");
    updateResultContainer(
      "circulationResult",
      `Failed to check circulation: ${error.message}`,
      true
    );
  } finally {
    setButtonLoading("circulationBtn", false);
  }
}

/* Vesting Contract Operations */

export async function transferOwnership() {
  const to = document.getElementById("transferTo").value;

  if (!to) {
    showMessage("Please enter recipient address", "error");
    return;
  }

  if (!ethers.isAddress(to)) {
    showMessage("Invalid recipient address", "error");
    return;
  }

  try {
    setButtonLoading("transferOwnershipBtn", true);
    showMessage("Transaction pending... Please confirm in MetaMask", "info");

    const tx = await getVesting().transferOwnership(to);
    showMessage(
      "Transaction submitted! Waiting for confirmation...",
      "success"
    );

    await tx.wait();
    await refreshData();

    updateResultContainer(
      "transferOwnershipResult",
      `
      Ownership transferred successfully to ${explorerLink("address", to)}<br/>
      TX Hash: ${explorerLink("tx", tx.hash)}
    `
    );

    // Clear input
    document.getElementById("transferTo").value = "";
    showMessage("Ownership transfer completed!", "success");
  } catch (error) {
    console.error("Transfer ownership error:", error);
    showMessage(`Transfer failed: ${error.message}`, "error");
    updateResultContainer(
      "transferOwnershipResult",
      `Transfer failed: ${error.message}`,
      true
    );
  } finally {
    setButtonLoading("transferOwnershipBtn", false);
  }
}

export async function releaseTokens() {
  try {
    setButtonLoading("releaseTokensBtn", true);
    showMessage("Transaction pending... Please confirm in MetaMask", "info");

    const tokenAddress = await getContract().getAddress();
    const tx = await getVesting()["release(address)"](tokenAddress);

    showMessage(
      "Transaction submitted! Waiting for confirmation...",
      "success"
    );
    await tx.wait();
    await refreshData();

    updateResultContainer(
      "releaseTokensResult",
      `
      Tokens released successfully!<br/>
      TX Hash: ${explorerLink("tx", tx.hash)}
    `
    );

    showMessage("Token release completed!", "success");
  } catch (error) {
    console.error("Release tokens error:", error);
    showMessage(`Release failed: ${error.message}`, "error");
    updateResultContainer(
      "releaseTokensResult",
      `Release failed: ${error.message}`,
      true
    );
  } finally {
    setButtonLoading("releaseTokensBtn", false);
  }
}
