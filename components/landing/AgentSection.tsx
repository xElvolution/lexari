"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Reveal, SectionTitle } from "./Reveal";

const FloatingKnot = dynamic(() => import("./FloatingKnot"), { ssr: false });

const MCP_SNIPPET = (base: string) => `claude mcp add --transport http renderreel ${base}/api/mcp/mcp

# then, in any conversation:
# "Make a launch reel for my product — here's the brief and two screenshots"`;

const CURL_SNIPPET = (base: string) => `# 1. validate for free
curl -X POST ${base}/api/v1/validate \\
  -H 'content-type: application/json' \\
  -d '{"template":"launch-reel","input":{...}}'

# 2. request → 402 with payment requirements
curl -X POST ${base}/api/v1/launch-reel -d @brief.json

# 3. pay with any x402 client (e.g. @okxweb3/x402-fetch),
#    retry with X-PAYMENT header → 202 { jobId }

# 4. poll until done → downloadUrl + receiptUrl
curl ${base}/api/v1/jobs/<jobId>`;

const AGENT_LOOP = `// inside any content/report agent — motion design in a loop
const clip = await mcp.call("renderreel", "create_stat_clip", {
  title: "Weekly On-Chain Report",
  stats: metricsFromMyAnalysis,   // the agent's own numbers
  brandColor: "#4ADEDE",
});
// → pays $2 in USDT0, gets an MP4 to attach to its report`;

export default function AgentSection() {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://renderreel.app";
  const tabs = [
    { id: "mcp", label: "MCP (agents)", code: MCP_SNIPPET(base) },
    { id: "curl", label: "HTTP + x402", code: CURL_SNIPPET(base) },
    { id: "loop", label: "In an agent loop", code: AGENT_LOOP },
  ];
  const [active, setActive] = useState("mcp");
  const [copied, setCopied] = useState(false);

  const current = tabs.find((t) => t.id === active)!;

  return (
    <section id="agents" className="relative mx-auto max-w-5xl px-6 py-32">
      <div className="pointer-events-none absolute -right-16 top-0 hidden h-[340px] w-[340px] overflow-hidden opacity-30 lg:block">
        <FloatingKnot />
      </div>
      <SectionTitle
        kicker="Agent-native"
        title="Machines are the customers here"
        sub="A report agent renders its numbers as a clip every week. A launch agent ships the video with the release. That's motion design as infrastructure — priced per call, not per seat."
      />
      <Reveal>
        <div className="overflow-hidden rounded-3xl border border-line bg-elev">
          <div className="flex items-center justify-between border-b border-line px-4">
            <div className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActive(tab.id);
                    setCopied(false);
                  }}
                  className={`px-5 py-4 text-sm font-medium transition-colors ${
                    active === tab.id
                      ? "border-b-2 border-[#6C5CE7] text-white"
                      : "text-faint hover:text-muted"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(current.code).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                });
              }}
              className="rounded-lg border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:text-white"
            >
              {copied ? "copied ✓" : "copy"}
            </button>
          </div>
          <pre className="overflow-x-auto p-6 text-[13.5px] leading-relaxed text-[#9FE8E8]">
            {current.code}
          </pre>
        </div>
      </Reveal>
    </section>
  );
}
