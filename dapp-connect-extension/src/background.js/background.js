// cavin.muse — Burner Dapp Connect: background service worker (SCAFFOLD) DRY-RUN ONLY. No network calls. No signing. No key material. Testnet-only allowlist. Public burner addresses only.
const BURNER_EVM = "0x6a18969EB94600138bbc70E1E3f1F38BCDa28aD8";
const BURNER_SOLANA = "CYjU7mQMZc3MnbziyfRLdvrhxpHQSvfQA6rMQu86SmRn";
const TESTNET_CHAINS = {5042002: "Arc Testnet", 11155111: "Ethereum Sepolia", 84532: "Base Sepolia", 421614: "Arbitrum Sepolia", 11155420: "Optimism Sepolia", 80002: "Polygon Amoy", 97: "BNB Smart Chain Testnet", 43113: "Avalanche Fuji"};
const MAINNET_CHAIN_IDS = new Set([1, 10, 56, 137, 8453, 42161, 43114, 5042, 250, 100, 324, 59144, 81457]);
function isTestnetChainId(chainId) { const id = typeof chainId === "string" ? parseInt(chainId, 16) : Number(chainId); if (MAINNET_CHAIN_IDS.has(id)) return false; return Object.prototype.hasOwnProperty.call(TESTNET_CHAINS, id); }
function dryRunStatus() { return {mode: "dry-run", liveConnection: false, signingEnabled: false, network: "testnet-only", burnerEvm: BURNER_EVM, burnerSolana: BURNER_SOLANA, testnetChains: TESTNET_CHAINS}; }
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message.type !== "string") { sendResponse({ ok: false, error: "unknown message" }); return false; }
  switch (message.type) {
    case "GET_STATUS": sendResponse({ ok: true, status: dryRunStatus() }); break;
    case "CHECK_CHAIN": sendResponse({ ok: true, chainId: message.chainId ?? null, allowedTestnet: isTestnetChainId(message.chainId) }); break;
    case "CONNECT": case "SIGN": case "SEND_TRANSACTION": sendResponse({ ok: false, error: `Refused: ${message.type} is disabled in dry-run scaffold mode. No wallet is connected and nothing is signed.` }); break;
    default: sendResponse({ ok: false, error: `unknown message type: ${message.type}` });
  }
  return false;
});
chrome.runtime.onInstalled.addListener(() => { chrome.storage.local.set({ dryRun: true, network: "testnet-only", burnerEvm: BURNER_EVM, burnerSolana: BURNER_SOLANA }); });
