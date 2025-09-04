import { appState } from "../core/state.js";

export function $(id) {
  return document.getElementById(id);
}

export function toBigIntSecondsFromLocal(inputValue) {
  // Works with <input type="datetime-local"> or ISO-like strings.
  const ms = new Date(inputValue).getTime();
  if (Number.isNaN(ms)) throw new Error("Invalid datetime");
  return BigInt(Math.floor(ms / 1000));
}

export function toLocalFromSeconds(time) {
  const targetDate = new Date(time * 1000);
  const isoString = targetDate.toISOString();
  return isoString.slice(0, 16);
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

/**
 * Creates an HTML link to a blockchain explorer for a transaction, address, or contract.
 * @param {string} type - "tx" for transaction, "address" for wallet/contract.
 * @param {string} value - Transaction hash or address.
 * @param {number|string} chainId - The current chain ID.
 * @param {string} [label] - Optional label for the link text (defaults to value).
 * @returns {string} HTML string with link or plain text fallback.
 */

export function explorerLink(type, value, label) {
  const explorer = appState.getState("wallet.network").blockExplorer;
  const text = label || value;

  if (!explorer || !value) {
    return `<code>${text}</code>`;
  }

  // Normalize type to path
  let path = "";
  if (type === "tx") {
    path = `tx/${value}`;
    return `<code><a href="${explorer}${path}" target="_blank" rel="noopener">${text}</a></code>`;
  } else if (type === "address") {
    path = `address/${value}`;
    return `<code><a style="cursor: pointer;" href="${explorer}${path}" target="_blank" rel="noopener">${text}</a></code>`;
  } else {
    console.warn("Unknown explorer link type:", type);
    return `<code>${text}</code>`;
  }
}

/**
 * Returns a date string formatted for an <input type="datetime-local">,
 * set to a specified number of minutes in the future.
 * @param {number} minsFromNow - The number of minutes from now.
 * @returns {string} The formatted date string (e.g., "2025-08-15T16:21").
 */
export function getLocalDeadline(minsFromNow = 60) {
  // 1. Get the target date object
  const targetDate = new Date(Date.now() + minsFromNow * 60 * 1000);

  // 2. Use the built-in toISOString() method, which is the most reliable way
  //    It returns a UTC string like "2025-08-15T14:21:08.123Z"
  const isoString = targetDate.toISOString();

  // 3. Slice the string to get the "YYYY-MM-DDTHH:MM" part,
  //    which is exactly what the datetime-local input needs.
  return isoString.slice(0, 16);
}
