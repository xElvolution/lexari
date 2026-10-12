"use client";

import { useCallback, useEffect, useState } from "react";
import { createPublicClient, createWalletClient, custom, formatEther, http, parseEther, type EIP1193Provider, type Hex } from "viem";
import Icon from "@/components/Icon";
import { api, friendly } from "@/lib/api";
import { toast } from "@/lib/store";

type View = { chainId: number; rpc: string; agents: { slug: string; name: string; address: string }[]; delegations: { id: string; agent: string; delegator: string; owner: string; maxWei: string; spentWei: string; expiresAt: number }[] };
type Announce = CustomEvent<{ info: { rdns: string; name: string }; provider: EIP1193Provider }>;

/** EIP-6963: find MetaMask among the injected wallets (falls back to window.ethereum when it says it is MetaMask). */
function findMetaMask(): Promise<EIP1193Provider | null> {
  return new Promise((resolve) => {
    let found: EIP1193Provider | null = null;
    const on = (e: Event) => { const d = (e as Announce).detail; if (d?.info?.rdns?.startsWith("io.metamask")) found = d.provider; };
    window.addEventListener("eip6963:announceProvider", on);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    setTimeout(() => {
      window.removeEventListener("eip6963:announceProvider", on);
      const eth = (window as unknown as { ethereum?: EIP1193Provider & { isMetaMask?: boolean } }).ethereum;
      resolve(found || (eth?.isMetaMask ? eth : null));
    }, 400);
  });
}

export default function MetaMaskDelegation() {
  const [v, setV] = useState<View | null>(null);
  const [owner, setOwner] = useState<Hex | null>(null);
  const [sa, setSa] = useState<{ address: Hex; deployed: boolean; mon: string } | null>(null);
  const [agent, setAgent] = useState("");
  const [maxMon, setMaxMon] = useState(1);
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(() => api<View>("/api/delegations").then((r) => { setV(r); setAgent((a) => a || r.agents[0]?.slug || ""); }).catch(() => setV(null)), []);
  useEffect(() => { void load(); }, [load]);

  const chain = v ? { id: v.chainId, name: "Monad Testnet", nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 }, rpcUrls: { default: { http: [v.rpc] } } } as const : null;

  const clients = async () => {
    const mm = await findMetaMask();
    if (!mm || !chain) throw new Error("MetaMask isn't installed in this browser.");
    const [acct] = (await mm.request({ method: "eth_requestAccounts" })) as Hex[];
    const hexId = `0x${chain.id.toString(16)}`;
    try { await mm.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexId }] }); }
    catch { await mm.request({ method: "wallet_addEthereumChain", params: [{ chainId: hexId, chainName: chain.name, nativeCurrency: chain.nativeCurrency, rpcUrls: [v!.rpc], blockExplorerUrls: ["https://testnet.monadexplorer.com"] }] }); }
    const walletClient = createWalletClient({ account: acct, chain, transport: custom(mm) });
    const publicClient = createPublicClient({ chain, transport: http(v!.rpc) });
    const { Implementation, toMetaMaskSmartAccount } = await import("@metamask/smart-accounts-kit");
    const smart = await toMetaMaskSmartAccount({ client: publicClient as never, implementation: Implementation.Hybrid, deployParams: [acct, [], [], []], deploySalt: "0x", signer: { walletClient: walletClient as never } });
    return { acct, walletClient, publicClient, smart };
  };
  const refresh = async (c: Awaited<ReturnType<typeof clients>>) => {
    const [code, bal] = await Promise.all([c.publicClient.getCode({ address: c.smart.address }), c.publicClient.getBalance({ address: c.smart.address })]);
    setOwner(c.acct); setSa({ address: c.smart.address, deployed: !!code && code !== "0x", mon: formatEther(bal) });
  };
  const run = async (key: string, fn: () => Promise<void>) => { setBusy(key); try { await fn(); } catch (e) { toast({ text: friendly(e, (e as Error).message?.slice(0, 140) || "MetaMask didn't finish.") }); } finally { setBusy(null); } };

  const connect = () => run("connect", async () => { await refresh(await clients()); });
  const deploy = () => run("deploy", async () => {
    const c = await clients();
    const { factory, factoryData } = await c.smart.getFactoryArgs();
    if (!factory || !factoryData) throw new Error("Your smart account is already set up.");
    const hash = await c.walletClient.sendTransaction({ account: c.acct, chain: c.walletClient.chain, to: factory, data: factoryData });
    await c.publicClient.waitForTransactionReceipt({ hash });
    await refresh(c); toast({ text: "Smart account set up on Monad testnet" });
  });
  const fund = () => run("fund", async () => {
    const c = await clients();
    const hash = await c.walletClient.sendTransaction({ account: c.acct, chain: c.walletClient.chain, to: c.smart.address, value: parseEther("1") });
    await c.publicClient.waitForTransactionReceipt({ hash });
    await refresh(c); toast({ text: "Sent 1 test MON to your smart account" });
  });
  const delegate = () => run("delegate", async () => {
    const target = v?.agents.find((a) => a.slug === agent);
    if (!target) throw new Error("Pick an agent.");
    const c = await clients();
    const { createDelegation } = await import("@metamask/smart-accounts-kit");
    const expiresAt = Date.now() + days * 86_400_000;
    const delegation = createDelegation({
      to: target.address as Hex, from: c.smart.address, environment: c.smart.environment,
      scope: { type: "nativeTokenTransferAmount", maxAmount: parseEther(String(maxMon)) },
      caveats: [{ type: "timestamp", afterThreshold: 0, beforeThreshold: Math.floor(expiresAt / 1000) }],
    });
    const signature = await c.smart.signDelegation({ delegation });
    const plain = JSON.parse(JSON.stringify({ ...delegation, signature }, (_k, x) => (typeof x === "bigint" ? `0x${x.toString(16)}` : x)));
    const r = await api<View>("/api/delegations", { body: { agent, owner: c.acct, delegation: plain, maxMon, expiresAt } });
    setV(r); toast({ text: `${target.name} can now spend up to ${maxMon} MON from your smart account, after you confirm each send` });
  });
  const revoke = (id: string) => run(id, async () => { setV(await api<View>(`/api/delegations?id=${id}`, { method: "DELETE" })); toast({ text: "Delegation revoked" }); });

  if (!v) return null;
  return (
    <div className="mt-6 rounded-2xl p-4 ring-1 ring-line" data-metamask-delegation>
      <div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-[12px] bg-[#f6851b] text-white"><Icon name="wallet" size={17} /></span>
        <div><div className="text-[15px] font-bold text-ink">MetaMask delegation</div><div className="text-[12.5px] text-ink/60">Let an agent spend capped MON from your MetaMask smart account on Monad testnet. Caveats are checked onchain, and every send waits for your Confirm.</div></div></div>
      {!sa ? (
        <button disabled={!!busy} onClick={connect} className="mt-3 h-10 w-full rounded-full bg-[#f6851b] text-[14px] font-bold text-white disabled:opacity-50">{busy === "connect" ? "Connecting…" : "Connect MetaMask"}</button>
      ) : (
        <div className="mt-3 space-y-2 text-[13px]">
          <div className="rounded-xl bg-tint/60 p-3"><div className="text-ink/60">Owner {owner?.slice(0, 6)}…{owner?.slice(-4)}</div><div className="font-mono text-[12px] text-ink">Smart account {sa.address}</div><div className="text-ink/70">{sa.deployed ? "Set up" : "Not set up yet"} · {Number(sa.mon).toFixed(4)} MON</div></div>
          <div className="flex gap-2">
            {!sa.deployed && <button disabled={!!busy} onClick={deploy} className="h-9 flex-1 rounded-full bg-tint font-bold text-ink disabled:opacity-50">{busy === "deploy" ? "Setting up…" : "Set up smart account"}</button>}
            <button disabled={!!busy} onClick={fund} className="h-9 flex-1 rounded-full bg-tint font-bold text-ink disabled:opacity-50">{busy === "fund" ? "Sending…" : "Add 1 MON"}</button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={agent} onChange={(e) => setAgent(e.target.value)} className="h-9 rounded-full bg-tint px-3 font-semibold text-ink">{v.agents.map((a) => <option key={a.slug} value={a.slug}>{a.name}</option>)}</select>
            <select value={maxMon} onChange={(e) => setMaxMon(Number(e.target.value))} className="h-9 rounded-full bg-tint px-3 font-semibold text-ink">{[0.1, 0.5, 1, 5].map((m) => <option key={m} value={m}>Up to {m} MON</option>)}</select>
            <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="h-9 rounded-full bg-tint px-3 font-semibold text-ink">{[1, 7, 30].map((d) => <option key={d} value={d}>{d} day{d > 1 ? "s" : ""}</option>)}</select>
            <button disabled={!!busy || !sa.deployed} onClick={delegate} className="h-9 rounded-full bg-grape px-4 font-bold text-white disabled:opacity-40">{busy === "delegate" ? "Sign in MetaMask…" : "Delegate"}</button>
          </div>
        </div>
      )}
      {v.delegations.length > 0 && (
        <ul className="mt-3 divide-y divide-line rounded-xl ring-1 ring-line">
          {v.delegations.map((d) => (
            <li key={d.id} className="flex items-center gap-2 px-3 py-2 text-[13px]">
              <span className="min-w-0 flex-1 truncate font-semibold text-ink">{v.agents.find((a) => a.slug === d.agent)?.name || d.agent} · {formatEther(BigInt(d.maxWei) - BigInt(d.spentWei))} of {formatEther(BigInt(d.maxWei))} MON left · until {new Date(d.expiresAt).toLocaleDateString()}</span>
              <button disabled={!!busy} onClick={() => revoke(d.id)} className="h-7 rounded-full bg-tint px-3 text-[12px] font-bold text-ink">Revoke</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
