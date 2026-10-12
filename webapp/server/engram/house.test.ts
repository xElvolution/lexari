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
    // with a 0G key, Kimi is ready too (it runs on 0G when MOONSHOT_API_KEY is missing)
    assert.deepEqual(houseChain(modelById("qwen")!).map((m) => m.id), ["qwen", "kimi", "openai"]);
    assert.deepEqual(houseChain(modelById("kimi")!).map((m) => m.id), ["kimi", "qwen", "openai"]);
  });
});

test("Kimi and Qwen run on the 0G key when their own keys are missing", () => {
  const keep = { ...process.env };
  try {
    delete process.env.MOONSHOT_API_KEY; delete process.env.DASHSCOPE_API_KEY; process.env.ZG_COMPUTE_API_KEY = "sk-test-zg";
    const k = houseTarget(modelById("kimi")!)!, q = houseTarget(modelById("qwen")!)!;
    assert.equal(k.key, "sk-test-zg"); assert.equal(k.model, "kimi-k3"); assert.match(k.baseUrl!, /router-api\.0g\.ai/);
    assert.equal(q.model, "qwen3.8-max"); assert.equal(q.key, "sk-test-zg");
    process.env.MOONSHOT_API_KEY = "sk-direct";
    assert.equal(houseTarget(modelById("kimi")!)!.key, "sk-direct");
  } finally { process.env = keep; }
});
