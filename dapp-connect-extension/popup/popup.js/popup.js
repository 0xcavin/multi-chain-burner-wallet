// cavin.muse — Burner Dapp Connect: popup UI stub (SCAFFOLD, DRY-RUN ONLY). Read-only display. Connect button intentionally does NOT connect: it asks the background worker, which refuses CONNECT in dry-run mode. Public burner addresses only — no seed, no private keys, no signing.
document.addEventListener("DOMContentLoaded", () => {
  const statusEl = document.getElementById("status"); const evmEl = document.getElementById("evm"); const solanaEl = document.getElementById("solana"); const chainsEl = document.getElementById("chains"); const noticeEl = document.getElementById("notice"); const connectBtn = document.getElementById("connectBtn");
  chrome.runtime.sendMessage({ type: "GET_STATUS" }, (res) => {
    if (chrome.runtime.lastError || !res || !res.ok) { statusEl.textContent = "Background worker unavailable (extension not fully loaded?)."; return; }
    const s = res.status; statusEl.textContent = "Dry-run — no live connection. Signing disabled. Testnet only."; evmEl.textContent = s.burnerEvm; solanaEl.textContent = s.burnerSolana; chainsEl.innerHTML = ""; Object.entries(s.testnetChains).forEach(([chainId, name]) => { const li = document.createElement("li"); li.textContent = `${name} (chain ${chainId})`; chainsEl.appendChild(li); });
  });
  connectBtn.addEventListener("click", () => { chrome.runtime.sendMessage({ type: "CONNECT" }, (res) => { noticeEl.textContent = (res && res.error) || "Refused: CONNECT is disabled in dry-run scaffold mode."; }); });
});
