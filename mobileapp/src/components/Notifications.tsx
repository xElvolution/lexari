import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Bell, BellOff } from "lucide-react-native";
import { IconButton, Muted, Sheet, Skeleton, T, friendly } from "./ui";
import { usePrefs } from "@/state/prefs";
import { useSession } from "@/state/session";
import { api } from "@/lib/api";

type Item = { id: string; title: string; body?: string; read: boolean; at: number };

function ago(at: number) {
  const m = Math.max(1, Math.round((Date.now() - at) / 60000));
  return m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`;
}

/** Bell icon with an unread dot. Opens a bottom sheet with the latest notifications. */
export function NotifyBell() {
  const { token } = useSession();
  const { palette } = usePrefs();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [msg, setMsg] = useState("");

  const load = async () => {
    if (!token) return;
    try { const r = await api<{ unread: number; items: Item[] }>("/api/notifications", {}, token); setItems(r.items || []); setUnread(r.unread || 0); setMsg(""); }
    catch (e) { setItems([]); setMsg(friendly(e, "Notifications didn't load.")); }
  };
  useEffect(() => { load().catch(() => {}); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const show = () => {
    setOpen(true); load().catch(() => {});
    if (unread && token) api("/api/notifications", { method: "POST", body: "{}" }, token).then(() => setUnread(0)).catch(() => {});
  };

  return (
    <>
      <View>
        <IconButton label="Notifications" onPress={show}><Bell color={palette.ink} size={17} /></IconButton>
        {unread ? <View style={{ position: "absolute", right: 7, top: 7, width: 8, height: 8, borderRadius: 4, backgroundColor: "#ff5a7a", borderWidth: 1.5, borderColor: palette.tint }} /> : null}
      </View>
      <Sheet open={open} onClose={() => setOpen(false)} title="Notifications">
        <ScrollView style={{ maxHeight: 420 }}>
          {items === null ? <View style={{ gap: 10 }}><Skeleton h={48} r={12} /><Skeleton h={48} r={12} /></View> : null}
          {items?.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 28, gap: 8 }}>
              <BellOff color={palette.muted} size={26} />
              <Text style={[T.body, { color: palette.ink, fontWeight: "600" }]}>You're all caught up</Text>
              <Muted style={{ textAlign: "center" }}>{msg || "Approvals, receipts and agent replies will show up here."}</Muted>
            </View>
          ) : null}
          {(items || []).map((n) => (
            <View key={n.id} style={{ flexDirection: "row", gap: 10, paddingVertical: 10 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, marginTop: 6, backgroundColor: n.read ? "transparent" : palette.brand }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: palette.ink, fontSize: 13.5, fontWeight: "600" }}>{n.title}</Text>
                {n.body ? <Muted>{n.body}</Muted> : null}
              </View>
              <Muted>{ago(n.at)}</Muted>
            </View>
          ))}
        </ScrollView>
      </Sheet>
    </>
  );
}
