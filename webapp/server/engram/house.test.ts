import { test } from "node:test";
import assert from "node:assert/strict";
import { HOUSE, modelById, modelCatalog, enabledIds } from "@/content/models";
import { houseChain, houseReady, houseTarget } from "./house";

const KEYS = ["MOONSHOT_API_KEY", "DASHSCOPE_API_KEY", "ZG_COMPUTE_API_KEY", "QWEN_MODEL", "DASHSCOPE_BASE_URL"];
function withEnv(env: Record<string, string>, fn: () => void) {
  const before = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  for (const k of KEYS) delete process.env[k];
  Object.assign(process.env, env);
  try { fn(); } finally { for (const k of KEYS) { if (before[k] === undefined) delete process.env[k]; else process.env[k] = before[k]; } }
}

test("an open model without its key is unavailable, listed but never pickable", () => {
  withEnv({}, () => {
    for (const m of HOUSE) { assert.equal(houseReady(m), false); assert.equal(houseTarget(m), null); }
    const rows = modelCatalog([], {}, Object.fromEntries(HOUSE.map((m) => [m.id, false])));
    for (const m of HOUSE) { const r = rows.find((x) => x.m.id === m.id)!; assert.equal(r.unavailable, true); assert.equal(r.enabled, false); }
    assert.ok(!HOUSE.some((m) => enabledIds(rows).has(m.id)));
  });
});

test("Qwen on DashScope: OpenAI-compatible target from env, with overrides", () => {
  withEnv({ DASHSCOPE_API_KEY: "sk-test", QWEN_MODEL: "qwen3.8-flash", DASHSCOPE_BASE_URL: "https://dashscope-us.aliyuncs.com/compatible-mode/v1/" }, () => {
    const t = houseTarget(modelById("qwen")!)!;
    assert.equal(t.provider, "custom");
    assert.equal(t.model, "qwen3.8-flash");
    assert.equal(t.baseUrl, "https://dashscope-us.aliyuncs.com/compatible-mode/v1");
    assert.equal(t.house, true);
  });
  withEnv({ MOONSHOT_API_KEY: "sk-k" }, () => {
    const t = houseTarget(modelById("kimi")!)!;
    assert.equal(t.baseUrl, "https://api.moonshot.ai/v1");
    assert.equal(t.model, "kimi-k3");
  });
});

test("fallback chain keeps only ready providers, the picked model first", () => {
  withEnv({ DASHSCOPE_API_KEY: "a", ZG_COMPUTE_API_KEY: "b" }, () => {
    assert.deepEqual(houseChain(modelById("qwen")!).map((m) => m.id), ["qwen", "zg"]);
    assert.deepEqual(houseChain(modelById("kimi")!).map((m) => m.id), ["qwen", "zg"]);
  });
});
