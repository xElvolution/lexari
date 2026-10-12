"use client";
/**
 * Mera (https://mera.category.xyz): one passkey, many keys. The passkey's WebAuthn PRF output is the root; from it we
 * derive a Solana sign-in key and a separate EVM key for every agent. Nothing secret leaves the browser or is stored.
 */
import { createEd25519SigningSession, createPasskeyWithPrfOutput, createSecp256k1SigningSession, getEvmAddress, getPasskeyPrfOutput, getSolanaAddress } from "@category-labs/mera";
import { toViemAccount } from "@category-labs/mera/viem";
import { hkdf } from "@noble/hashes/hkdf";
import { sha256 } from "@noble/hashes/sha256";
import { PublicKey } from "@solana/web3.js";
import { api } from "./api";
import type { WalletBridge } from "./walletBridge";

const CRED = "lexari-mera-cred";
const salt = new TextEncoder().encode("lexari.mera.v1");
const derive = (prf: Uint8Array, info: string) => hkdf(sha256, prf, salt, new TextEncoder().encode(info), 32);
const b64 = (bytes: Uint8Array) => { let s = ""; for (const b of bytes) s += String.fromCharCode(b); return btoa(s); };
export const passkeySupported = () => typeof window !== "undefined" && !!window.PublicKeyCredential;

/** Ask the passkey for its PRF output (create one when `create`). */
export async function passkeyRoot(create: boolean, name = "Lexari") {
  const rpId = location.hostname;
  if (create) {
    const r = await createPasskeyWithPrfOutput({ rp: { id: rpId, name: "Lexari" }, user: { name, displayName: name } });
    localStorage.setItem(CRED, JSON.stringify({ credentialId: r.credentialId, transports: r.transports }));
    return { prf: r.prfOutput, credentialId: r.credentialId };
  }
  const stored = localStorage.getItem(CRED);
  const r = await getPasskeyPrfOutput({ rpId, credential: stored ? JSON.parse(stored) : undefined });
  localStorage.setItem(CRED, JSON.stringify({ credentialId: r.credentialId }));
  return { prf: r.prfOutput, credentialId: r.credentialId };
}

/** The passkey's Solana sign-in key, as a wallet bridge the normal sign-in can use. */
export function signInBridge(prf: Uint8Array): WalletBridge {
  const s = createEd25519SigningSession({ privateKey: derive(prf, "signin/solana") });
  return { source: "adapter", name: "Passkey (Mera)", publicKey: new PublicKey(getSolanaAddress(s.publicKey)), signMessage: (m) => s.signMessage(m), signTransaction: () => Promise.reject(new Error("A passkey sign-in key doesn't sign transactions.")) };
}

/** A separate key for each agent from the same passkey. */
export function agentKey(prf: Uint8Array, slug: string) {
  const s = createSecp256k1SigningSession({ privateKey: derive(prf, `agent/${slug}/evm`) });
  return { address: getEvmAddress(s.publicKey), account: toViemAccount(s) };
}

/** Sign in with a passkey that is already linked to an account. Never creates an account. */
export async function passkeySignIn(create: boolean) {
  const { prf } = await passkeyRoot(create);
  const bridge = signInBridge(prf);
  const address = bridge.publicKey.toBase58();
  const ch = await api<{ linked: boolean; message?: string }>("/api/mera/signin", { body: { address } });
  if (ch.linked && ch.message) {
    const signature = b64(await bridge.signMessage(new TextEncoder().encode(ch.message)));
    return api<{ wallet: string }>("/api/mera/signin", { body: { address, message: ch.message, signature } });
  }
  // Accounts are only ever created with Google or email. A passkey only opens an account it was linked to.
  throw new Error("Account doesn't exist. Create an account with Google or email first, then add a passkey in Settings, Security.");
}

/** Link a passkey to this account and give every agent its own passkey key. */
export async function linkPasskey(slugs: string[], create: boolean) {
  const { prf, credentialId } = await passkeyRoot(create);
  const bridge = signInBridge(prf);
  const address = bridge.publicKey.toBase58();
  const proof = `Link this passkey to my Lexari account: ${address}`;
  const signature = b64(await bridge.signMessage(new TextEncoder().encode(proof)));
  const keys = await Promise.all(slugs.map(async (slug) => { const k = agentKey(prf, slug); return { agent: slug, address: k.address, signature: await k.account.signMessage({ message: `Lexari agent key for ${slug}: ${k.address}` }) }; }));
  return api<{ ok: true }>("/api/mera/keys", { body: { address, credentialId, proof, signature, keys } });
}
