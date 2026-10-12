import { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, View } from "react-native";
import { api } from "@/lib/api";
import { METAMASK_DAPP } from "@/lib/walletLink";
import { Label, T, useC } from "@/web/kit";

type D = { id: string; agent: string; delegator: string; maxWei: string; spentWei: string; expiresAt: number };
type V = { agents: { slug: string; name: string; address: string }[]; delegations: D[] };
const mon = (w: string) => +(Number(BigInt(w)) / 1e18).toFixed(4);

/** MetaMask on the phone: set up a smart account and delegate capped MON to an agent inside MetaMask Mobile (its
 *  browser runs the same flow as the web, including the on-chain revoke). Live delegations show and revoke here. */
export default function MetaMaskPhone({ token }: { token: string | null }) {
  const k = useC();
  const [v, setV] = useState<V | null>(null);
  const [busy, setBusy] = useState("");
  const load = useCallback(() => { if (token) api<V>("/api/delegations", {}, token).then(setV, () => setV(null)); }, [token]);
  useEffect(load, [load]);
  const name = (s: string) => v?.agents.find((a) => a.slug === s)?.name || s;
  const revoke = async (id: string) => { setBusy(id); try { setV(await api<V>(`/api/delegations?id=${id}`, { method: "DELETE" }, token)); } finally { setBusy(""); } };
  return (
    <View testID="metamask-phone" style={{ marginTop: 18, borderRadius: 22, borderWidth: 1, borderColor: k.line, backgroundColor: k.card, padding: 16 }}>
      <Label s={9.5} c={k.ink45}>MetaMask</Label>
      <T f="bold" s={16} style={{ marginTop: 4 }}>Delegate capped spending to an agent</T>
      <T s={13} c={k.ink60} style={{ marginTop: 4, lineHeight: 18 }}>Opens Lexari in MetaMask Mobile. Set up your MetaMask smart account on Monad testnet, then sign a delegation with a MON cap and an expiry. Each send still waits for your Confirm. Revoke there to also disable it on chain.</T>
      <Pressable onPress={() => void Linking.openURL(METAMASK_DAPP)} style={{ marginTop: 12, height: 46, borderRadius: 999, backgroundColor: "#f6851b", alignItems: "center", justifyContent: "center" }}><T f="bold" s={14.5} c="#fff">Set up in MetaMask</T></Pressable>
      {v?.delegations.map((d) => (
        <View key={d.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, borderTopWidth: 1, borderTopColor: k.line, marginTop: 10 }}>
          <View style={{ flex: 1 }}><T f="semi" s={13.5}>{name(d.agent)}</T><T s={12} c={k.ink60}>{`${mon(d.spentWei)} of ${mon(d.maxWei)} MON · until ${new Date(d.expiresAt).toLocaleDateString()}`}</T></View>
          <Pressable disabled={!!busy} onPress={() => void revoke(d.id)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, backgroundColor: k.tint }}><T f="bold" s={12}>{busy === d.id ? "…" : "Revoke"}</T></Pressable>
        </View>
      ))}
    </View>
  );
}
