"use client";

import Capped from "../Capped";
import { useEffect, useState } from "react";
import { api, friendly } from "@/lib/api";
import { linkPasskey, passkeySupported } from "@/lib/mera";

type Keys = { passkeys: { address: string }[]; keys: { agent: string; address: string }[] };

/** One passkey, many keys (Mera): sign in with Face ID or Touch ID, and every agent gets its own key from it. */
export default function MeraKeys({ agents }: { agents: { slug: string; name: string }[] }) {
  const [k, setK] = useState<Keys | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const load = () => api<Keys>("/api/mera/keys").then(setK).catch(() => setK({ passkeys: [], keys: [] }));
  useEffect(() => { void load(); }, []);
  const go = async (create: boolean) => {
    setBusy(true); setErr("");
    try { await linkPasskey(agents.map((a) => a.slug), create); await load(); }
    catch (e) { setErr(friendly(e, "The passkey didn't finish.")); }
    setBusy(false);
  };
  const name = (s: string) => agents.find((a) => a.slug === s)?.name || s;
  return (
    <section data-mera className="mt-6"><h3 className="label mb-1 text-[9.5px] text-ink/50">Passkey</h3><div className="rounded-[22px] bg-card p-5 ring-1 ring-line max-[430px]:p-4">
      <p className=" text-[13.5px] text-ink/65">One passkey, many keys. Link a passkey to this account to sign in with Face ID, Touch ID or a security key, and each agent gets its own key derived from it. Powered by Mera; nothing secret is stored.</p>
      {!passkeySupported() && <p className="mt-2 text-[13px] text-ink/60">This browser doesn&apos;t support passkeys.</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button disabled={busy || !passkeySupported()} onClick={() => go(!k?.passkeys.length)} className="rounded-full bg-grape px-4 py-2.5 text-[14px] font-bold text-white disabled:opacity-50">{busy ? "Waiting for passkey…" : k?.passkeys.length ? "Refresh agent keys" : "Add a passkey"}</button>
        {!k?.passkeys.length && <button disabled={busy || !passkeySupported()} onClick={() => go(false)} className="rounded-full bg-tint px-4 py-2.5 text-[14px] font-bold text-ink disabled:opacity-50">Use a passkey I have</button>}
      </div>
      {err && <p className="mt-2 text-[13px] text-[#e5484d]">{err}</p>}
      {!!k?.keys.length && (
        <Capped className="mt-3"><ul className="divide-y divide-line">
          {k.keys.map((x) => <li key={x.agent} className="flex items-center justify-between py-2 text-[13.5px]"><span className="font-bold text-ink">{name(x.agent)}</span><span className="font-mono text-[12px] text-ink/70">{x.address.slice(0, 6)}…{x.address.slice(-4)}</span></li>)}
        </ul></Capped>
      )}
    </div></section>
  );
}
