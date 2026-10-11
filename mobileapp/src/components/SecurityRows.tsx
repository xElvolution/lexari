import { useEffect, useState } from "react";
import { Switch } from "react-native";
import { router } from "expo-router";
import { Fingerprint, KeyRound, Lock, ScanFace } from "lucide-react-native";
import { Row } from "./ui";
import { usePrefs } from "@/state/prefs";
import { bioInfo, bioUnlock, type Bio } from "@/lib/bio";
import { clearPin, hasPin } from "@/lib/pin";
import { grape } from "@/theme/colors";

/** App lock, biometrics and PIN controls. Shared by Settings and Security. */
export function SecurityRows() {
  const { palette, lockOn, bioOn, setLock, setBio } = usePrefs();
  const [bio, setBioInfo] = useState<Bio | null>(null);
  const [pin, setPin] = useState(false);
  useEffect(() => { bioInfo().then(setBioInfo).catch(() => {}); hasPin().then(setPin).catch(() => {}); }, [lockOn]);
  const sw = { trackColor: { true: grape, false: palette.tint }, thumbColor: "#fff" };
  const BioIcon = bio?.face ? ScanFace : Fingerprint;

  const toggleLock = async (on: boolean) => {
    if (on) { if (!pin && !bioOn) { router.push("/security-setup?mode=pin"); return; } setLock(true); return; }
    if (bioOn && bio?.ok && !(await bioUnlock("Turn off app lock"))) return;
    setLock(false);
  };
  const toggleBio = async (on: boolean) => {
    if (on && !(await bioUnlock(`Turn on ${bio?.label || "biometrics"}`))) return;
    setBio(on); if (on) setLock(true);
  };

  return (
    <>
      <Row icon={<Lock color={palette.brand} size={16} />} title="App lock" detail={lockOn ? "Asks when Lexari opens" : "Off"} right={<Switch value={lockOn} onValueChange={toggleLock} {...sw} />} />
      {bio?.ok ? <Row icon={<BioIcon color={palette.brand} size={16} />} title={bio.label} detail={bioOn ? "On" : "Off"} right={<Switch value={bioOn} onValueChange={toggleBio} {...sw} />} /> : null}
      <Row icon={<KeyRound color={palette.brand} size={16} />} title={pin ? "Change PIN" : "Set a 6-digit PIN"} detail={pin ? "Backup for biometrics" : "Unlock with a PIN"} onPress={() => router.push("/security-setup?mode=pin")} />
      {pin ? <Row icon={<KeyRound color="#ff6b81" size={16} />} title="Remove PIN" danger onPress={async () => { if (bioOn && bio?.ok && !(await bioUnlock("Remove your PIN"))) return; await clearPin(); setPin(false); if (!bioOn) setLock(false); }} /> : null}
    </>
  );
}
