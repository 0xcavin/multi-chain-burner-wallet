# cavin.muse — Burner Dapp Connect (Testnet Dry-Run Scaffold)

A browser-extension **scaffold** (scripts + docs only) that stubs an EVM
(`window.ethereum`-style) and Solana (`window.solana`-style) provider for
Cavin's **burner wallet only**, on **testnets only**, in **dry-run mode only**.

## What it is

- `manifest.json` — Manifest V3, minimal permissions (`storage` only, no
  `host_permissions`). Content script matches a narrow, explicit list of
  testnet sites only (Arc testnet explorer, Circle faucet, Sepolia faucet,
  Solana faucet). No mainnet URL is listed anywhere.
- `src/background.js` — service worker. Answers status/chain checks, keeps a
  testnet-only chain allowlist (Arc Testnet 5042002, Sepolia 11155111, Base
  Sepolia 84532, Arbitrum Sepolia 421614, OP Sepolia 11155420, Amoy 80002,
  BSC Testnet 97, Fuji 43113). Refuses `CONNECT` / `SIGN` /
  `SEND_TRANSACTION` by design. No network calls.
- `src/content.js` — injects the provider stubs into the page. Read-only
  calls (`eth_chainId`, `eth_accounts`) return the **public** burner EVM
  address and the testnet chain id. Every signing/transaction method
  (`eth_sendTransaction`, `personal_sign`, `eth_signTypedData_v4`,
  Solana `signTransaction` / `signMessage` / `signAndSendTransaction`)
  throws a dry-run refusal. No fetch/XHR anywhere in this file.
- `popup/popup.html` + `popup/popup.js` — popup stub showing the burner EVM
  + Solana public addresses, the allowed testnets, and dry-run status. The
  "Connect" button asks the background worker, which refuses it.
- `verify-addresses.py` — derives the EVM address (`m/44'/60'/0'/0/0`) and
  the Solana address (Phantom path `m/44'/501'/0'/0'`) from the seed in the
  VM backup and checks them against the expected public addresses (see
  below). Prints addresses + MATCH/MISMATCH only — never the seed or keys.

Public burner addresses (only these appear in the extension files):

| Chain | Address |
|---|---|
| EVM (all EVM testnets) | `0x6a18969EB94600138bbc70E1E3f1F38BCDa28aD8` |
| Solana (devnet) | `CYjU7mQMZc3MnbziyfRLdvrhxpHQSvfQA6rMQu86SmRn` |
| BTC SegWit | `bc1qnw40xgm2pmqlw23zfehzfamazxx9h0k8qdf835` |
| TRON | `THZZagYxo7vaS4z1NUVoDTBRyEDAoMzntJ` |

## What it is NOT

- **Not a live connector.** Nothing in this folder connects a wallet to a
  dapp, creates a session, signs, or moves funds. Any dapp that calls the
  stub gets a refusal for every transaction/signing method.
- **Not a real wallet.** No seed, mnemonic, or private key exists anywhere
  in this folder or in the extension. The extension knows only public
  addresses.
- **Not mainnet-capable.** Mainnet chain ids are refused in the background
  worker, mainnet chain switches are refused in the content script, and no
  mainnet URL is in the manifest match list.
- **Not published or installed anywhere.** Loading it is a manual, local
  step for Cavin (below).

## How to load it unpacked (Cavin, manual, local only)

1. Open Chrome/Brave → `chrome://extensions` → turn on **Developer mode**.
2. **Load unpacked** → pick this folder
   (`~/workspace/crypto/cavin-burner/dapp-connect-extension/`).
3. Open the popup: it must show **DRY-RUN ONLY — TESTNET ONLY**, the two
   burner addresses above, and the testnet list.
4. Visit a matched testnet page (e.g. the Arc testnet explorer) and in
   DevTools console check `window.ethereum.isCavinBurnerScaffold === true`
   and `window.solana.isDryRun === true`. Try a signing call — it must
   reject with the dry-run error.
5. To unload: remove the extension from `chrome://extensions`. Nothing
   persists except the `storage.local` dry-run flag + public addresses.

Do **not** widen the manifest match list, add a signing path, or point it at
a mainnet dapp without a separate review and Cavin's explicit go-ahead.

## How the verify script works

`verify-addresses.py` reads the mnemonic from the existing backup file
`~/workspace/crypto/cavin-burner/cavin-burner-backup.json` (chmod 600, stays
in the VM) and re-derives both addresses with the same libraries and paths
as `../generate_wallet.py`:

- EVM: BIP44 `m/44'/60'/0'/0/0` via `bip_utils`
- Solana: SLIP-0010 Ed25519 `m/44'/501'/0'/0'` via `bip_utils` +
  `solders.Keypair.from_seed` (Phantom path)

It compares each derived address to the expected public address above and
exits `0` only if **both** match, `1` otherwise. On mismatch: STOP — do not
mark anything verified, do not publish.

```bash
~/workspace/crypto/venv/bin/python verify-addresses.py
# venv python is required: it has bip_utils + solders installed.
# System python3 does NOT have them.
```

Syntax checks for the extension JS:

```bash
node --check src/background.js
node --check src/content.js
node --check popup/popup.js
python3 -m json.tool manifest.json > /dev/null
```

## Testnet-only rules

- Burner wallet only. Never connect a holding wallet. Never fund from a
  holding wallet — testnet funds come from faucets only.
- Testnet first, always. Mainnet is blocked in code (allowlist + refusal
  paths), not just by convention.
- Dry-run by default. Any live mode would be a separate, reviewed change
  with Cavin's explicit go-ahead — not an edit to this scaffold.
- Verify first (DYOR): a dapp gets added to the manifest match list only
  after its legitimacy is verified, same rule as @airdropfind.

## Seed safety

- The 12-word seed and all private keys live **only** in
  `~/workspace/crypto/cavin-burner/cavin-burner-backup.json` (chmod 600, in
  the VM). They are never printed, copied, pasted, or committed.
- This folder contains **public addresses only**. The verify script holds
  the mnemonic in memory only while deriving, and never prints or writes it.
- Never upload the backup file or the seed to GitHub, a dapp, or any
  website. If this folder is published, only the files listed here go —
  never the backup.
