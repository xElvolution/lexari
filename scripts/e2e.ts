import "dotenv/config";
import { createHash } from "node:crypto";

/**
 * Buyer-side end-to-end test against a running instance.
 *
 *   BASE_URL=http://localhost:3000 npx tsx scripts/e2e.ts          # free demo path
 *   BASE_URL=https://… BUYER_PRIVATE_KEY=0x… npx tsx scripts/e2e.ts --paid
 *
 * Paid mode drives the full x402 flow (402 → sign EIP-3009 → 202) with
 * @okxweb3/x402-fetch, then polls to done, downloads the MP4, and verifies
 * the receipt hashes.
 */

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const PAID = process.argv.includes("--paid");

const INPUT = {
  productName: "Vaultline",
  oneLiner: "Every yield strategy on every chain, one dashboard.",
  features: [
    "Live APY across 40+ protocols",
    "One-click position migration",
    "Risk scoring on every vault",
  ],
  screenshots: ["https://placehold.co/1600x1000/png"],
  brandColor: "#00B894",
};

async function main() {
  console.log(`[e2e] target ${BASE} · mode ${PAID ? "PAID x402" : "free demo"}`);

  // 1. validate (free)
  const v = await fetch(`${BASE}/api/v1/validate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ template: "launch-reel", input: INPUT }),
  }).then((r) => r.json());
  assert(v.valid === true, `validate: ${JSON.stringify(v)}`);
  console.log("[e2e] ✓ validate ok, price", v.price);

  // 2. create job
  let jobId: string;
  if (PAID) {
    const key = process.env.BUYER_PRIVATE_KEY;
    assert(!!key, "BUYER_PRIVATE_KEY required for --paid");

    const bare = await fetch(`${BASE}/api/v1/launch-reel`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(INPUT),
    });
    assert(bare.status === 402, `expected 402 first, got ${bare.status}`);
    const requirements = await bare.json();
    console.log(
      "[e2e] ✓ got 402 with requirements:",
      JSON.stringify(requirements).slice(0, 300),
    );

    const { wrapFetchWithPayment, x402Client } = await import(
      "@okxweb3/x402-fetch"
    );
    const { ExactEvmScheme } = await import("@okxweb3/x402-evm/exact/client");
    const { toClientEvmSigner } = await import("@okxweb3/x402-evm");
    const { privateKeyToAccount } = await import("viem/accounts");
    const account = privateKeyToAccount(key as `0x${string}`);
    const client = new x402Client().register(
      "eip155:196",
      new ExactEvmScheme(toClientEvmSigner(account)),
    );
    const payFetch = wrapFetchWithPayment(fetch, client);

    const paid = await payFetch(`${BASE}/api/v1/launch-reel`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(INPUT),
    });
    assert(paid.status === 202, `expected 202 after payment, got ${paid.status}`);
    const created = await paid.json();
    jobId = created.jobId;
    console.log("[e2e] ✓ paid & created job", jobId);
  } else {
    const res = await fetch(`${BASE}/api/demo`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(INPUT),
    });
    const created = await res.json();
    assert(res.status === 202, `demo create failed: ${JSON.stringify(created)}`);
    jobId = created.jobId;
    console.log("[e2e] ✓ created demo job", jobId);
  }

  // 3. poll to done
  const started = Date.now();
  let job: Record<string, unknown>;
  for (;;) {
    job = await fetch(`${BASE}/api/v1/jobs/${jobId}`).then((r) => r.json());
    const status = job.status as string;
    process.stdout.write(
      `\r[e2e] status=${status} progress=${job.progress}% (${Math.round((Date.now() - started) / 1000)}s)   `,
    );
    if (status === "done") break;
    assert(status !== "failed", `\njob failed: ${job.error}`);
    assert(Date.now() - started < 15 * 60_000, "\ntimeout after 15min");
    await new Promise((r) => setTimeout(r, 10_000));
  }
  console.log(`\n[e2e] ✓ done in ${Math.round((Date.now() - started) / 1000)}s`);

  // 4. download + verify hashes
  const mp4 = new Uint8Array(
    await fetch(job.downloadUrl as string).then((r) => r.arrayBuffer()),
  );
  const hash = "sha256:" + createHash("sha256").update(mp4).digest("hex");
  assert(
    hash === job.outputHash,
    `output hash mismatch: ${hash} != ${job.outputHash}`,
  );
  console.log(`[e2e] ✓ downloaded ${(mp4.length / 1e6).toFixed(1)}MB, sha256 matches receipt`);

  if (job.receiptUrl) {
    const receipt = await fetch(job.receiptUrl as string).then((r) => r.json());
    assert(receipt.outputHash === hash, "receipt outputHash mismatch");
    console.log(
      `[e2e] ✓ receipt ok · payment tx: ${receipt.payment?.txHash ?? "(demo, none)"}`,
    );
  }

  console.log("[e2e] ALL CHECKS PASSED");
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    console.error(`\n[e2e] FAIL: ${msg}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("\n[e2e] error:", e);
  process.exit(1);
});
