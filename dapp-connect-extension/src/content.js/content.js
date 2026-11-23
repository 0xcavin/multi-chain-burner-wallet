// cavin.muse — Burner Dapp Connect: content script (SCAFFOLD, DRY-RUN ONLY)
// Runs at document_start on the narrow testnet-only match list in
// manifest.json. It injects EVM (window.ethereum-style) and Solana
// (window.solana-style) provider STUBS into the page.
//
// What the stubs DO:
//   - Advertise the PUBLIC burner addresses (EVM + Solana) as the account.
//   - Answer read-only calls (eth_chainId, eth_blockNumber-style reads are
//     refused with "use an explorer/RPC yourself" — no network from here).
//   - Report the testnet chain id (Arc Testnet 5042002 by default).
//
// What the stubs NEVER do:
//   - Sign anything (eth_sendTransaction, personal_sign, eth_sign,
//     signTransaction, signMessage all throw a dry-run refusal).
//   - Connect a real wallet, hold keys, or touch mainnet.
//   - Send any data anywhere. No fetch/XHR in this file at all.
//
// A dapp calling these stubs sees a wallet-shaped object that refuses to
// transact. That is the point: Cavin can test that a testnet dapp detects a
// provider and reads the burner address, without any live connection.

(() => {
  "use strict";

  // Public burner addresses only — never a seed or private key.
  const BURNER_EVM = "0x6a18969EB94600138bbc70E1E3f1F38BCDa28aD8";
  const BURNER_SOLANA = "CYjU7mQMZc3MnbziyfRLdvrhxpHQSvfQA6rMQu86SmRn";

  // Testnet chain ids (hex). Mainnet ids are refused, never returned.
  const TESTNET_CHAIN_HEX = {
    "0x4cef52": "Arc Testnet",
    "0xaa36a7": "Ethereum Sepolia",
    "0x14a34": "Base Sepolia",
    "0x66eee": "Arbitrum Sepolia",
    "0xaa37dc": "Optimism Sepolia",
    "0x13882": "Polygon Amoy",
    "0x61": "BNB Smart Chain Testnet",
    "0xa869": "Avalanche Fuji",
  };
  const DEFAULT_CHAIN_HEX = "0x4cef52"; // Arc Testnet 5042002
  const DRY_RUN_ERROR = "cavin.muse burner scaffold: dry-run mode — signing and transactions are disabled. No wallet is connected.";

  // The code injected into the page context. Kept as a string so the
  // content-script world and the page world stay separate, and so the
  // provider shape is visible in one place for review.
  const INJECTED = `
(function () {
  "use strict";
  var BURNER_EVM = ${JSON.stringify(BURNER_EVM)};
  var BURNER_SOLANA = ${JSON.stringify(BURNER_SOLANA)};
  var TESTNET_CHAIN_HEX = ${JSON.stringify(TESTNET_CHAIN_HEX)};
  var DEFAULT_CHAIN_HEX = ${JSON.stringify(DEFAULT_CHAIN_HEX)};
  var DRY_RUN_ERROR = ${JSON.stringify(DRY_RUN_ERROR)};
  var currentChainHex = DEFAULT_CHAIN_HEX;

  function dryRunRefusal(method) {
    var err = new Error(DRY_RUN_ERROR + " (refused method: " + method + ")");
    err.code = 4001;
    return err;
  }

  // ---- EVM stub: window.ethereum ----
  var listeners = {};
  var ethereum = {
    isMetaMask: false,
    isCavinBurnerScaffold: true,
    isDryRun: true,
    selectedAddress: BURNER_EVM,
    chainId: currentChainHex,
    on: function (event, fn) { (listeners[event] = listeners[event] || []).push(fn); },
    removeListener: function (event, fn) {
      listeners[event] = (listeners[event] || []).filter(function (f) { return f !== fn; });
    },
    request: function (args) {
      var method = args && args.method;
      switch (method) {
        case "eth_chainId":
          return Promise.resolve(currentChainHex);
        case "eth_accounts":
        case "eth_requestAccounts":
          // Public address only, dry-run: the dapp may display it, but
          // no session is created and nothing is signed.
          return Promise.resolve([BURNER_EVM]);
        case "net_version":
          return Promise.resolve(String(parseInt(currentChainHex, 16)));
        case "wallet_switchEthereumChain": {
          var target = args.params && args.params[0] && args.params[0].chainId;
          if (target && TESTNET_CHAIN_HEX[target]) {
            currentChainHex = target;
            ethereum.chainId = target;
            (listeners["chainChanged"] || []).forEach(function (fn) { fn(target); });
            return Promise.resolve(null);
          }
          return Promise.reject(new Error("Refused: only testnet chains are allowed: " + Object.keys(TESTNET_CHAIN_HEX).join(", ")));
        }
        case "eth_sendTransaction":
        case "eth_signTransaction":
        case "personal_sign":
        case "eth_sign":
        case "eth_signTypedData":
        case "eth_signTypedData_v4":
        case "wallet_addEthereumChain":
          return Promise.reject(dryRunRefusal(method));
        default:
          return Promise.reject(new Error("cavin.muse burner scaffold: method not supported in dry-run mode: " + method));
      }
    },
  };

  // ---- Solana stub: window.solana ----
  var solana = {
    isPhantom: false,
    isCavinBurnerScaffold: true,
    isDryRun: true,
    isConnected: false,
    publicKey: null,
    connect: function () {
      // Dry-run: report the public key, create no session, sign nothing.
      solana.isConnected = true;
      solana.publicKey = { toString: function () { return BURNER_SOLANA; }, toBase58: function () { return BURNER_SOLANA; } };
      return Promise.resolve({ publicKey: solana.publicKey });
    },
    disconnect: function () {
      solana.isConnected = false;
      solana.publicKey = null;
      return Promise.resolve();
    },
    signTransaction: function () { return Promise.reject(dryRunRefusal("signTransaction")); },
    signAllTransactions: function () { return Promise.reject(dryRunRefusal("signAllTransactions")); },
    signMessage: function () { return Promise.reject(dryRunRefusal("signMessage")); },
    signAndSendTransaction: function () { return Promise.reject(dryRunRefusal("signAndSendTransaction")); },
    on: function () {},
  };

  try {
    Object.defineProperty(window, "ethereum", { value: ethereum, writable: false, configurable: false });
  } catch (e) { window.ethereum = ethereum; }
  try {
    Object.defineProperty(window, "solana", { value: solana, writable: false, configurable: false });
  } catch (e) { window.solana = solana; }
  window.dispatchEvent(new Event("cavin-burner-scaffold-ready"));
})();
`;

  function inject() {
    const script = document.createElement("script");
    script.textContent = INJECTED;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inject, { once: true });
  }
  inject();
})();
