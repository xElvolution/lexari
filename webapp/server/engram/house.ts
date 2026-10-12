/**
 * SERVER ONLY. Open models Lexari serves on its own provider keys (content/models.ts HOUSE). All three speak the
 * OpenAI Chat Completions API, so they stream through the same code as models on your own key (server/engram/byo.ts),
 * but usage is billed like Lamina at the model's price (the meter prices it; the person's key is never involved).
 *
 * Env (server only, never in the repo):
 *   MOONSHOT_API_KEY   Kimi (Moonshot AI)            MOONSHOT_BASE_URL   default https://api.moonshot.ai/v1     KIMI_MODEL   default kimi-k3
 *   DASHSCOPE_API_KEY  Qwen (Alibaba Model Studio)   DASHSCOPE_BASE_URL  default https://dashscope-intl.aliyuncs.com/compatible-mode/v1   QWEN_MODEL default qwen3.8-max
 *   ZG_COMPUTE_API_KEY 0G Compute Router (sk-...)    ZG_COMPUTE_BASE_URL default https://router-api.0g.ai/v1     ZG_COMPUTE_MODEL default glm-5.2
 * A model whose key is missing is listed as unavailable and can't be picked.
 */
import { HOUSE, modelById, type HouseProvider, type ModelInfo } from "@/content/models";
import type { ByoTarget } from "./byo";

type Spec = { key: string; base: string; baseDefault: string; model: string; modelDefault: string; who: string; extra?: Record<string, unknown> };
const SPECS: Record<HouseProvider, Spec> = {
  moonshot: { key: "MOONSHOT_API_KEY", base: "MOONSHOT_BASE_URL", baseDefault: "https://api.moonshot.ai/v1", model: "KIMI_MODEL", modelDefault: "kimi-k3", who: "Kimi",
    // K3 always reasons; "low" keeps chat replies quick (temperature is fixed by Moonshot, so none is sent).
    extra: { reasoning_effort: "low" } },
  dashscope: { key: "DASHSCOPE_API_KEY", base: "DASHSCOPE_BASE_URL", baseDefault: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1", model: "QWEN_MODEL", modelDefault: "qwen3.8-max", who: "Qwen",
    extra: { enable_thinking: false } },
  zg: { key: "ZG_COMPUTE_API_KEY", base: "ZG_COMPUTE_BASE_URL", baseDefault: "https://router-api.0g.ai/v1", model: "ZG_COMPUTE_MODEL", modelDefault: "glm-5.2", who: "0G Compute",
    extra: { chat_template_kwargs: { enable_thinking: false } } },
};

/** The env var names, for setup docs and the health page. */
export const HOUSE_ENV = Object.fromEntries(Object.entries(SPECS).map(([p, s]) => [p, { key: s.key, baseUrl: s.base, model: s.model }])) as Record<HouseProvider, { key: string; baseUrl: string; model: string }>;

export function houseReady(m: ModelInfo) {
  return !!m.house && !!process.env[SPECS[m.house.provider].key]?.trim();
}

/** The provider call for one open model, or null when its key isn't set. */
export function houseTarget(m: ModelInfo): ByoTarget | null {
  if (!m.house) return null;
  const s = SPECS[m.house.provider];
  const key = process.env[s.key]?.trim();
  if (!key) return null;
  const base = (process.env[s.base]?.trim() || s.baseDefault).replace(/\/+$/, "");
  return { provider: "custom", model: process.env[s.model]?.trim() || s.modelDefault, key, baseUrl: base, label: m.label, who: s.who, extra: s.extra, house: true };
}

/**
 * The order a turn on an open model tries: the model itself, then its fallbacks that are ready on this server.
 * Lamina is the caller's last resort.
 */
export function houseChain(m: ModelInfo): ModelInfo[] {
  if (!m.house) return [];
  const out = [m, ...m.house.fallback.map((id) => modelById(id)).filter((x): x is ModelInfo => !!x && !!x.house)];
  return out.filter((x, i) => out.findIndex((y) => y.id === x.id) === i && houseReady(x));
}

export const houseModels = () => HOUSE.map((m) => ({ id: m.id, ready: houseReady(m) }));
