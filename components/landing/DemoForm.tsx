"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Reveal, SectionTitle } from "./Reveal";

/** Zero-setup judge/user path: free watermarked 720p Launch Reel. */
export default function DemoForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    productName: "",
    oneLiner: "",
    f1: "",
    f2: "",
    f3: "",
    screenshot: "",
    brandColor: "#6C5CE7",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/demo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productName: form.productName,
          oneLiner: form.oneLiner,
          features: [form.f1, form.f2, form.f3],
          screenshots: [form.screenshot],
          brandColor: form.brandColor,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.issues
            ? data.issues.map((i: { path: string; message: string }) => `${i.path}: ${i.message}`).join(" · ")
            : (data.message ?? data.error ?? "something went wrong"),
        );
        return;
      }
      router.push(`/jobs/${data.jobId}`);
    } catch {
      setError("network error — try again");
    } finally {
      setSubmitting(false);
    }
  }

  const input =
    "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-[15px] text-zinc-100 placeholder-zinc-600 outline-none transition-colors focus:border-[#6C5CE7]/70";

  return (
    <section id="try" className="relative mx-auto max-w-3xl px-6 py-32">
      <SectionTitle
        kicker="Try it"
        title="Render one free, right now"
        sub="720p, watermarked, no wallet needed. Two per day — enough to see exactly what buyers get."
      />
      <Reveal>
        <form
          onSubmit={submit}
          className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.03] p-8"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <input required maxLength={40} placeholder="Product name" value={form.productName} onChange={set("productName")} className={input} />
            <div className="flex items-center gap-3">
              <input type="color" value={form.brandColor} onChange={set("brandColor")} className="h-12 w-14 cursor-pointer rounded-lg border border-white/10 bg-transparent" aria-label="Brand color" />
              <span className="text-sm text-zinc-500">Brand color</span>
            </div>
          </div>
          <input required minLength={10} maxLength={120} placeholder="One-liner — what does it do?" value={form.oneLiner} onChange={set("oneLiner")} className={input} />
          <input required minLength={3} maxLength={80} placeholder="Feature 1" value={form.f1} onChange={set("f1")} className={input} />
          <input required minLength={3} maxLength={80} placeholder="Feature 2" value={form.f2} onChange={set("f2")} className={input} />
          <input required minLength={3} maxLength={80} placeholder="Feature 3" value={form.f3} onChange={set("f3")} className={input} />
          <input required type="url" placeholder="Screenshot URL (https://…, min 400px wide)" value={form.screenshot} onChange={set("screenshot")} className={input} />

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-gradient-to-r from-[#6C5CE7] to-[#4ADEDE] py-4 text-base font-semibold text-black transition-transform hover:scale-[1.01] disabled:opacity-60"
          >
            {submitting ? "Queueing your render…" : "Render my launch reel — free"}
          </button>
        </form>
      </Reveal>
    </section>
  );
}
