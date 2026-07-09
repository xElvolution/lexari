import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import Gallery from "@/components/landing/Gallery";
import AgentSection from "@/components/landing/AgentSection";
import Pricing from "@/components/landing/Pricing";
import DemoForm from "@/components/landing/DemoForm";
import ReceiptsFeed from "@/components/landing/ReceiptsFeed";

export const revalidate = 30;

export default function Home() {
  return (
    <main className="relative">
      <Hero />
      <HowItWorks />
      <Gallery />
      <AgentSection />
      <Pricing />
      <DemoForm />
      <ReceiptsFeed />
      <footer className="border-t border-white/5 px-6 py-14 text-center text-sm text-zinc-600">
        <div className="font-display text-lg font-bold text-zinc-300">RenderReel</div>
        <div className="mt-2">
          Motion graphics, rendered by an agent · Live on{" "}
          <a href="https://www.okx.ai" className="text-[#8B7CFF] hover:underline" target="_blank" rel="noopener noreferrer">
            OKX.AI
          </a>{" "}
          · Paid in USDT0 on X Layer via x402
        </div>
      </footer>
    </main>
  );
}
