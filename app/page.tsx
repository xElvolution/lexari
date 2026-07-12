import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import Gallery from "@/components/landing/Gallery";
import AgentSection from "@/components/landing/AgentSection";
import Pricing from "@/components/landing/Pricing";
import DemoForm from "@/components/landing/DemoForm";
import ReceiptsFeed from "@/components/landing/ReceiptsFeed";
import SmoothScroll from "@/components/landing/SmoothScroll";
import Cursor from "@/components/landing/Cursor";
import Ambient from "@/components/site/Ambient";
import Nav from "@/components/site/Nav";
import Footer from "@/components/site/Footer";

export const revalidate = 30;

export default function Home() {
  return (
    <>
      <Ambient />
      <SmoothScroll />
      <Cursor />
      <Nav />
      <main className="relative">
        <Hero />
        <HowItWorks />
        <Gallery />
        <AgentSection />
        <Pricing />
        <DemoForm />
        <ReceiptsFeed />
      </main>
      <Footer />
    </>
  );
}
