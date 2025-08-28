export function $(id) {
  return document.getElementById(id);
}

export function showMessage(html, type = "success") {
  const el = $("messages");
  const div = document.createElement("div");
  div.className = type;
  div.innerHTML = html;
  el.prepend(div);
  setTimeout(() => div.remove(), 8000);
}

export function setStatus(connected, text) {
  const status = $("status");
  status.classList.toggle("connected", !!connected);
  status.classList.toggle("disconnected", !connected);
  status.textContent = text || (connected ? "Connected" : "Not Connected");
}

export function setDataMode(mode /* "default" | "vesting" */) {
  document.body.setAttribute("data-mode", mode);
}

export function getQueryParam(name) {
  const u = new URL(window.location.href);
  const v = u.searchParams.get(name);
  return v && v.trim() ? v.trim() : null;
}

export function getModeFromURL() {
  const v = getQueryParam("vesting");
  return v ? "vesting" : "default";
}

export function getChainFromURL() {
  // ?chain=arbitrum or ?chain=arbitrum-sepolia (fallback to arbitrum)
  const c = getQueryParam("chain");
  return c === "arbitrum" || c === "arbitrum-sepolia" ? c : "arbitrum";
}

export function isAddress(addr) {
  try {
    return ethers.isAddress(addr);
  } catch {
    return false;
  }
}

export function toBigIntSecondsFromLocal(inputValue) {
  // Works with <input type="datetime-local"> or ISO-like strings.
  const ms = new Date(inputValue).getTime();
  if (Number.isNaN(ms)) throw new Error("Invalid datetime");
  return BigInt(Math.floor(ms / 1000));
}

export function formatAmount(u256, decimals) {
  // u256: bigint | string | number
  const bn = typeof u256 === "bigint" ? u256 : BigInt(u256);
  const s = ethers.formatUnits(bn, decimals);
  return parseFloat(s).toLocaleString();
}

export function parseAmountToUnits(amountStr, decimals) {
  if (!amountStr || Number(amountStr) <= 0) throw new Error("Invalid amount");
  return ethers.parseUnits(amountStr, decimals); // returns bigint
}

export function short(addr, n = 4) {
  return addr ? `${addr.slice(0, 2 + n)}…${addr.slice(-n)}` : "";
}

export function onMetaMaskEvents({ onAccounts, onChain }) {
  if (!window.ethereum) return;
  window.ethereum.on?.("accountsChanged", onAccounts);
  window.ethereum.on?.("chainChanged", onChain);
}

export function offMetaMaskEvents({ onAccounts, onChain }) {
  if (!window.ethereum) return;
  window.ethereum.removeListener?.("accountsChanged", onAccounts);
  window.ethereum.removeListener?.("chainChanged", onChain);
}
