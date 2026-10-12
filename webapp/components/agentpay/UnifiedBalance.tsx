"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useMask } from "@/lib/privacy";
import DepositPicker from "./DepositPicker";

type B = { totalUsd: number; assets: { asset: string; amount: number; usd: number; where: string[] }[]; partial: boolean };
const fmt = (n: number) => (+n.toFixed(n < 1 ? 6 : 4)).toLocaleString("en-US", { maximumFractionDigits: 6 });

/** One balance, like any app: a USD total and what it is made of. Where funds sit is an advanced detail. */
export default function UnifiedBalance({ agent, name }: { agent: string; name: string }) {
  const mask = useMask();
  const [b, setB] = useState<B | null>(null);
  const [dep, setDep] = useState(false);
  useEffect(() => { void api<B>(`/api/agents/balance?agent=${encodeURIComponent(agent)}`).then(setB).catch(() => setB(null)); }, [agent]);
  if (!b) return null;
  return (
    <div data-unified-balance={agent} className="rounded-2xl bg-card p-4 ring-1 ring-line">
      <div className="label text-[10px] text-ink/50">{name}&apos;s balance</div>
      <div className="mt-1 text-[28px] font-extrabold tabular-nums text-ink">{mask(`$${b.totalUsd.toFixed(2)}`)}</div>
      <div className="text-[12px] text-ink/55">Test funds. Your agent moves money to whichever chain a trade needs, with your Confirm.</div>
      <ul className="mt-3 divide-y divide-line">
        {b.assets.filter((x) => x.amount > 0).map((x) => (
          <li key={x.asset} className="flex items-center justify-between py-2 text-[13.5px]"><span className="font-bold text-ink">{x.asset}</span><span className="tabular-nums text-ink/80">{mask(fmt(x.amount))} <span className="text-ink/50">· {mask(`$${x.usd.toFixed(2)}`)}</span></span></li>
        ))}
        {!b.assets.some((x) => x.amount > 0) && <li className="py-2 text-[13px] text-ink/60">Nothing here yet. Fund {name} from your Lexari balance.</li>}
      </ul>
      <button onClick={() => setDep(true)} className="mt-3 w-full rounded-2xl bg-grape py-2.5 text-[14px] font-bold text-white">Deposit any coin</button>
      {dep && <DepositPicker agent={agent} name={name} onClose={() => setDep(false)} />}
      <details className="mt-2 text-[12.5px] text-ink/60">
        <summary className="cursor-pointer font-semibold">Advanced: where funds sit</summary>
        <ul className="mt-1">{b.assets.filter((x) => x.amount > 0).map((x) => <li key={x.asset}>{x.asset}: {x.where.join(", ")}</li>)}</ul>
        {b.partial && <p className="mt-1">Some networks didn&apos;t answer, so the total may be low.</p>}
      </details>
    </div>
  );
}
