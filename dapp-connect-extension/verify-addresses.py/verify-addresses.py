#!/usr/bin/env python3
"""Verify Cavin's burner addresses from the seed in the VM — DRY-RUN, no network. Derives BOTH addresses from the mnemonic stored in the existing chmod-600 backup file and checks them against the expected PUBLIC addresses: EVM (m/44'/60'/0'/0/0) -> 0x6a18969EB94600138bbc70E1E3f1F38BCDa28aD8, Solana (m/44'/501'/0'/0') -> CYjU7mQMZc3MnbziyfRLdvrhxpHQSvfQA6rMQu86SmRn. SECURITY: prints ONLY the two derived public addresses and MATCH/MISMATCH. Never prints the mnemonic or any private key."""
import argparse, json, sys
from pathlib import Path
from bip_utils import Bip39SeedGenerator, Bip44, Bip44Coins, Bip44Changes, Bip32Slip10Ed25519
from solders.keypair import Keypair
EXPECTED_EVM = "0x6a18969EB94600138bbc70E1E3f1F38BCDa28aD8"
EXPECTED_SOLANA = "CYjU7mQMZc3MnbziyfRLdvrhxpHQSvfQA6rMQu86SmRn"
DEFAULT_BACKUP = Path.home() / "workspace" / "crypto" / "cavin-burner" / "cavin-burner-backup.json"
def derive(mnemonic: str):
    seed = Bip39SeedGenerator(mnemonic).Generate()
    evm_ctx = (Bip44.FromSeed(seed, Bip44Coins.ETHEREUM).Purpose().Coin().Account(0).Change(Bip44Changes.CHAIN_EXT).AddressIndex(0))
    evm_addr = evm_ctx.PublicKey().ToAddress()
    sol_ctx = Bip32Slip10Ed25519.FromSeed(seed).DerivePath("m/44'/501'/0'/0'")
    sol_kp = Keypair.from_seed(sol_ctx.PrivateKey().Raw().ToBytes())
    return evm_addr, str(sol_kp.pubkey())
def main() -> int:
    parser = argparse.ArgumentParser(description="Verify burner EVM + Solana addresses from the VM seed backup.")
    parser.add_argument("--backup", type=Path, default=DEFAULT_BACKUP)
    args = parser.parse_args()
    backup = json.loads(args.backup.read_text())
    mnemonic = backup["mnemonic"]
    evm_addr, sol_addr = derive(mnemonic)
    evm_ok = evm_addr == EXPECTED_EVM
    sol_ok = sol_addr == EXPECTED_SOLANA
    print("cavin.muse burner address verification — dry-run, local only")
    print(f"  EVM    derived: {evm_addr}")
    print(f"  EVM    expected: {EXPECTED_EVM}")
    print(f"  EVM    match: {'YES' if evm_ok else 'NO — MISMATCH, STOP'}")
    print(f"  Solana derived: {sol_addr}")
    print(f"  Solana expected: {EXPECTED_SOLANA}")
    print(f"  Solana match: {'YES' if sol_ok else 'NO — MISMATCH, STOP'}")
    if evm_ok and sol_ok:
        print("VERIFY_OK: both burner addresses match. Extension scaffold may be marked verified.")
        return 0
    print("VERIFY_FAIL: address mismatch — do NOT mark verified, do NOT publish.", file=sys.stderr)
    return 1
if __name__ == "__main__":
    sys.exit(main())
