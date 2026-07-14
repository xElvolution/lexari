import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import ThemeProvider from "@/components/site/ThemeProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-body" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "Lexari — motion graphics, rendered by an agent",
  description:
    "Pay-per-call motion-graphics render agent on OKX.AI. Structured JSON in, cinematic MP4 + verifiable on-chain receipt out. $5 launch reels, $2 stat clips, paid in USDT via x402 on X Layer.",
  metadataBase: process.env.NEXT_PUBLIC_BASE_URL
    ? new URL(process.env.NEXT_PUBLIC_BASE_URL)
    : undefined,
  openGraph: {
    title: "Lexari — motion graphics, rendered by an agent",
    description:
      "The first motion-design studio that agents can hire. JSON in, cinematic MP4 out, receipt on-chain.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${grotesk.variable}`}
      suppressHydrationWarning
    >
      <body className="font-body antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
