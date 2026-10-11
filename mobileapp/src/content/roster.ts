/** The marketplace roster the phone shows. Hiring still goes through the server. */
import type { ColorKey } from "@/components/avatar";

export type Specialist = { slug: string; name: string; job: string; quip: string; color: string; seed: number; face: ColorKey; free?: boolean };

/** Same seed and color as the web roster (webapp/content/appData.ts face(i)), so an agent looks the same everywhere. */
const FACE_COLORS: ColorKey[] = ["orange", "blue", "green", "yellow", "red", "teal", "pink", "sky", "purple", "lilac", "red", "green", "purple"];
const f = (i: number) => ({ seed: i * 11 + 5, face: FACE_COLORS[i] });

export const ROSTER: Specialist[] = [
  { slug: "scout", name: "Scout", job: "Web research", quip: "I read so you do not have to.", color: "#3b82f6", ...f(0) },
  { slug: "quill", name: "Quill", job: "Writing and edits", quip: "Give me a rough idea. I will give it back sharp.", color: "#f9a8d4", ...f(1) },
  { slug: "tally", name: "Tally", job: "Numbers and sheets", quip: "Messy sheet? Send it over.", color: "#34d399", ...f(2) },
  { slug: "frame", name: "Frame", job: "Design", quip: "Tell me the vibe, I will draw it.", color: "#fcd34d", ...f(3) },
  { slug: "echo", name: "Echo", job: "Community", quip: "Your channels, answered while you sleep.", color: "#c9b8ff", ...f(4) },
  { slug: "relay", name: "Relay", job: "Onchain watch", quip: "I watch the chain so you can look away.", color: "#14F1D9", ...f(5) },
  { slug: "patch", name: "Patch", job: "Code help", quip: "Point me at the bug. Smallest fix wins.", color: "#8b5cf6", ...f(8) },
  { slug: "pulse", name: "Pulse", job: "Social posts", quip: "I know what gets a reply.", color: "#f45b5b", ...f(9) },
  { slug: "ore", name: "ORE Miner", job: "ORE mining", quip: "Your server, your ORE. I run the rig.", color: "#F5A524", free: true, ...f(12) },
];

export const PLANS = [
  { id: "free", name: "Free", usd: 0, points: ["Your named agent", "A daily allowance"] },
  { id: "pro", name: "Pro", usd: 20, points: ["5 seats", "Pay in SKR, SOL, or USDC"] },
  { id: "plus", name: "Max", usd: 60, points: ["20 seats", "Heavier daily work"] },
];

export const COINS: { id: string; name: string; color: string; logo: number }[] = [
  { id: "SKR", name: "Seeker", color: "#14F1D9", logo: require("../../assets/coins/skr.png") },
  { id: "USDC", name: "USD Coin", color: "#2775CA", logo: require("../../assets/coins/usdc.png") },
  { id: "USDT", name: "Tether", color: "#26A17B", logo: require("../../assets/coins/usdt.png") },
  { id: "SOL", name: "Solana", color: "#9945FF", logo: require("../../assets/coins/sol.png") },
  { id: "BONK", name: "Bonk", color: "#F8A21B", logo: require("../../assets/coins/bonk.png") },
  { id: "JUP", name: "Jupiter", color: "#2BB8A2", logo: require("../../assets/coins/jup.png") },
];

export function specialist(slug: string | undefined): Specialist | undefined {
  return ROSTER.find((r) => r.slug === slug);
}
