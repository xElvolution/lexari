import { AsyncLocalStorage } from "node:async_hooks";
import type { NextRequest } from "next/server";
import type { NextResponse } from "next/server";
import { OKXFacilitatorClient } from "@okxweb3/x402-core";
import {
  withX402FromHTTPServer,
  x402HTTPResourceServer,
  x402ResourceServer,
} from "@okxweb3/x402-next";
import { ExactEvmScheme } from "@okxweb3/x402-evm/exact/server";
import { TEMPLATES, type PaymentRecord } from "@/lib/schemas";

/**
 * x402 payment gating for the two paid routes (OKX seller SDK).
 * Network: X Layer (eip155:196), token USDT0, scheme "exact" (EIP-3009,
 * gas-subsidized), syncSettle: payment confirmed on-chain before we
 * return a jobId.
 *
 * PAYMENTS_DISABLED=1 (or missing OKX creds) short-circuits to a
 * passthrough so the whole product works locally before creds arrive.
 */

export const X_LAYER = "eip155:196";
export const USDT0 = "0x779Ded0c9e1022225f8E0630b35a9b54bE713736";

const paymentsDisabled = () =>
  process.env.PAYMENTS_DISABLED === "1" || !process.env.OKX_API_KEY;

type Settlement = { txHash: string | null; payer: string | null };
const settlementStore = new AsyncLocalStorage<{ value: Settlement | null }>();
// Fallback if the adapter loses the ALS context across async boundaries;
// single-request-at-a-time payment volume makes this safe enough at launch.
let lastSettlement: Settlement | null = null;

type Handler = (req: NextRequest) => Promise<NextResponse>;

let httpServerPromise: Promise<x402HTTPResourceServer> | null = null;

async function buildHttpServer(): Promise<x402HTTPResourceServer> {
  const facilitator = new OKXFacilitatorClient({
    apiKey: process.env.OKX_API_KEY!,
    secretKey: process.env.OKX_SECRET_KEY!,
    passphrase: process.env.OKX_PASSPHRASE!,
    syncSettle: true,
  });

  const resourceServer = new x402ResourceServer(facilitator).register(
    X_LAYER,
    new ExactEvmScheme(),
  );

  resourceServer.onAfterSettle(async (ctx) => {
    const settlement: Settlement = {
      txHash: ctx.result.transaction ?? null,
      payer: ctx.result.payer ?? null,
    };
    const store = settlementStore.getStore();
    if (store) store.value = settlement;
    lastSettlement = settlement;
  });

  const routes: Record<string, unknown> = {};
  for (const t of Object.values(TEMPLATES)) {
    routes[`POST /api/v1/${t.id}`] = {
      accepts: {
        scheme: "exact",
        network: X_LAYER,
        payTo: process.env.PAY_TO!,
        price: t.priceUsd,
        maxTimeoutSeconds: 300,
      },
      description: `Lexari ${t.id}: branded motion-graphics MP4 render. POST the input JSON, receive a jobId, poll /api/v1/jobs/{id} for the video.`,
      mimeType: "application/json",
    };
  }

  const httpServer = new x402HTTPResourceServer(
    resourceServer,
    routes as ConstructorParameters<typeof x402HTTPResourceServer>[1],
  );
  await resourceServer.initialize();
  return httpServer;
}

function getHttpServer(): Promise<x402HTTPResourceServer> {
  if (!httpServerPromise) httpServerPromise = buildHttpServer();
  return httpServerPromise;
}

/** Gate a route handler behind x402 payment. */
export function withPayment(
  _templateId: keyof typeof TEMPLATES,
  handler: Handler,
): Handler {
  return async (req: NextRequest) => {
    if (paymentsDisabled()) {
      return settlementStore.run({ value: null }, () => handler(req));
    }
    const httpServer = await getHttpServer();
    const gated = withX402FromHTTPServer(handler, httpServer);
    lastSettlement = null;
    return settlementStore.run({ value: null }, () =>
      gated(req),
    ) as Promise<NextResponse>;
  };
}

/** Settlement details for the current request (call inside a gated handler). */
export function payment(templateId: keyof typeof TEMPLATES): PaymentRecord {
  const t = TEMPLATES[templateId];
  const amountAtomic = String(
    Math.round(parseFloat(t.priceUsd.replace("$", "")) * 1_000_000),
  );
  const settlement = paymentsDisabled()
    ? null
    : (settlementStore.getStore()?.value ?? lastSettlement);
  return {
    network: X_LAYER,
    txHash: settlement?.txHash ?? null,
    payer: settlement?.payer ?? null,
    amount: amountAtomic,
    asset: USDT0,
  };
}
