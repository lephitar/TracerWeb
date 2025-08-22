/* Operations */
import {
  getUserAccount,
  getContract,
  getProvider,
  getSigner,
  explorerLink,
  refreshData,
} from "./wallet.js";
import { showMessage } from "./ui.js";

/* Operations */
export async function transferTokens() {
  const to = document.getElementById("transferTo").value;
  const amount = document.getElementById("transferAmount").value;

  if (!to || !amount) {
    showMessage("Please fill in all fields", "error");
    return;
  }

  try {
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

export async function approveTokens() {
  const spender = document.getElementById("approveSpender").value;
  const amount = document.getElementById("approveAmount").value;

  if (!spender || !amount) {
    showMessage("Please fill in all fields", "error");
    return;
  }

  try {
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

export async function checkAllowance() {
  const owner =
    document.getElementById("allowanceOwner").value || getUserAccount();
  const spender = document.getElementById("allowanceSpender").value;

  if (!spender) {
    showMessage("Please enter spender address", "error");
    return;
  }

  try {
    const allowance = await getContract().allowance(owner, spender);
    const decimals = await getContract().decimals();
    const symbol = await getContract().symbol();
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

export async function signAndSubmitPermit() {
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

export async function checkVotingPower() {
  const address =
    document.getElementById("votingPowerAddress").value || getUserAccount();

  if (!ethers.isAddress(address)) {
    showMessage("Invalid address", "error");
    return;
  }
  try {
    document.getElementById("checkVotingPowerBtn").disabled = true;
    showMessage("Fetching voting power...", "info");

    const votes = await getContract().getVotes(address);
    const decimals = await getContract().decimals();
    const symbol = await getContract().symbol();
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

export async function delegateVotingPower() {
  const delegatee =
    document.getElementById("delegateAddress").value || getUserAccount();

  if (!ethers.isAddress(delegatee)) {
    showMessage("Invalid delegatee address", "error");
    return;
  }

  try {
    document.getElementById("delegateVotingPowerBtn").disabled = true;
    showMessage("Sending delegation transaction...", "info");

    const tx = await getContract().delegate(delegatee);
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
