import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import Chrome from "@/components/Chrome";
import { nav, searchIndex } from "@/lib/docs";
import "./globals.css";

const display = Fraunces({ subsets: ["latin"], variable: "--f-display", axes: ["SOFT", "WONK", "opsz"], style: ["normal", "italic"] });
const body = Inter({ subsets: ["latin"], variable: "--f-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--f-mono" });

export const metadata: Metadata = {
  metadataBase: new URL("https://docs.lexari.ai"),
  title: { default: "Lexari Docs", template: "%s · Lexari Docs" },
  description: "How Lexari works: personalized AI agents that work onchain, with one USD balance and a Confirm card for every payment.",
  openGraph: { title: "Lexari Docs", description: "Personalized AI agents that work onchain.", siteName: "Lexari Docs" },
};
export const viewport: Viewport = { themeColor: "#ECE8DC", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <Chrome nav={nav()} index={searchIndex()}>{children}</Chrome>
      </body>
    </html>
  );
}
