import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import PasskeyPrompt from "@/components/security/PasskeyPrompt";

export const metadata: Metadata = { title: "Lexari · Your agents" };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}<PasskeyPrompt /></AppShell>;
}
