/**
 * The agent's own settings, changed from chat ("call yourself Nova", "be more playful", "switch to Qwen"). Each tool
 * prepares a Confirm card; only the person's Confirm applies it. The agent can change its name, face, persona and model,
 * and nothing else: grants, limits, wallets, keys and budgets have no tool here and are never written by this file.
 * Every change is an integration_actions row (the audit log), with the value it replaced.
 */
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { LOOKS, TONES } from "@/content/appData";
import { LAMINA, MODELS, keyModelInfo, modelById, parseKeyModel } from "@/content/models";
import { db } from "../db";
import { agents } from "../db/schema";
import { pickable } from "../models";
import { modelReady } from "../engram/cortex";
import { Reject } from "./reject";
import type { AgentRef, Executed, Prepared, ToolDef } from "./registry";

type Row = typeof agents.$inferSelect;
const NAME_RE = /^[\p{L}\p{N}][\p{L}\p{N} .'-]{0,39}$/u;

async function rowOf(agent: AgentRef): Promise<Row> {
  const [r] = await db().select().from(agents).where(and(eq(agents.userId, agent.userId), eq(agents.slug, agent.slug))).limit(1);
  if (!r) throw new Reject("I couldn't find my own settings.");
  return r;
}
const shownName = (r: Row) => ((r.meta as { nick?: string } | null)?.nick || r.name);
const toneLabel = (id: string) => TONES.find((t) => t.id === id)?.label ?? (id || "Default");
const offPlan = (title: string, rows: [string, string][], plan: Record<string, unknown>): Prepared => ({ title, rows, usdMicros: 0, chain: "lexari", plan, summary: title });

/** A clean name, or a Reject that says why. */
export function cleanName(raw: unknown): string {
  const name = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (!name) throw new Reject("Tell me the new name.");
  if (name.length > 40) throw new Reject("Names can be up to 40 characters.");
  if (/https?:|www\.|@|<|>/i.test(name) || !NAME_RE.test(name)) throw new Reject("Names use letters, numbers, spaces and . ' - only.");
  return name;
}

/** Resolves "qwen", "Kimi K3" or a model id to one the person switched on. */
export async function resolveModel(userId: string, raw: unknown): Promise<{ id: string; label: string }> {
  const q = String(raw ?? "").trim().toLowerCase();
  if (!q) throw new Reject("Which model should I switch to?");
  const named = MODELS.find((m) => m.id === q || m.label.toLowerCase() === q || m.short.toLowerCase() === q)
    ?? MODELS.find((m) => m.label.toLowerCase().includes(q) || q.includes(m.short.toLowerCase()));
  const id = named?.id ?? (parseKeyModel(String(raw).trim()) ? String(raw).trim() : null);
  if (!id) throw new Reject(`I don't know a model called "${String(raw).slice(0, 40)}". Settings > Models lists them.`);
  const info = modelById(id) ?? keyModelInfo(id);
  if (!info) throw new Reject("That model isn't in your list.");
  if (info.house && !modelReady(info)) throw new Reject(`${info.label} is unavailable on Lexari right now.`);
  if (!(await pickable(userId, id))) throw new Reject(`${info.label} is switched off. Switch it on in Settings > Models first.`);
  return { id, label: info.label };
}

/* ---------- rename ---------- */
const renameInput = z.object({ name: z.string().max(80) }).passthrough();
const rename: ToolDef = {
  name: "self.rename", connector: "self", risk: "sign", offchain: true, input: renameInput,
  hint: `self.rename {"name":"Nova"} : change your own name when the person asks; they confirm it.`,
  prepare: async (i: z.output<typeof renameInput>, agent) => {
    const name = cleanName(i.name);
    const r = await rowOf(agent);
    if (shownName(r) === name) throw new Reject(`I'm already called ${name}.`);
    return offPlan(`Rename to ${name}?`, [["Now", shownName(r)], ["New name", name], ...(r.asset ? [["ID card", "Your minted card keeps its printed name"] as [string, string]] : [])], { kind: "rename", name, was: shownName(r) });
  },
  execute: async (p: { name: string }, agent): Promise<Executed> => {
    const name = cleanName(p.name);
    const r = await rowOf(agent);
    // A hired specialist keeps its maker's name: yours is a nickname. Your own agents change their name itself.
    if (r.kind === "hired") await db().update(agents).set({ meta: sql`coalesce(${agents.meta}, '{}'::jsonb) || ${JSON.stringify({ nick: name })}::jsonb`, updatedAt: new Date() }).where(eq(agents.id, r.id));
    else await db().update(agents).set({ name, meta: sql`coalesce(${agents.meta}, '{}'::jsonb) - 'nick'`, updatedAt: new Date() }).where(eq(agents.id, r.id));
    return { sig: "", confirmed: true, rows: [["Done", `Now called ${name}`]], text: `Renamed to ${name}.` };
  },
};

/* ---------- face ---------- */
const faceInput = z.object({ seed: z.union([z.number(), z.string()]).optional(), look: z.string().max(20).optional() }).passthrough();
const pickSeed = (cur: unknown) => { const pool = LOOKS.filter((l): l is number => typeof l === "number" && l !== cur); return pool[Math.floor(Math.random() * pool.length)]; };
const setAvatar: ToolDef = {
  name: "self.setavatar", connector: "self", risk: "sign", offchain: true, input: faceInput,
  hint: `self.setAvatar {"seed":41} : a new face for yourself (seed 1 to 999, or {} for a surprise); the person confirms it.`,
  prepare: async (i: z.output<typeof faceInput>, agent) => {
    const r = await rowOf(agent);
    if (r.kind === "hired") throw new Reject("I keep my maker's face, so I can't change it.");
    const cur = (r.lookJson as { v?: unknown })?.v;
    const n = i.seed !== undefined ? Number(i.seed) : NaN;
    const seed = Number.isInteger(n) && n >= 1 && n <= 999 ? n : pickSeed(cur);
    if (seed === cur) throw new Reject("That's already my face.");
    return offPlan("New face?", [["Face", `Style #${seed}`], ["Applies to", "Badge, chat and team"]], { kind: "avatar", seed, was: cur ?? null });
  },
  execute: async (p: { seed: number }, agent): Promise<Executed> => {
    const r = await rowOf(agent);
    if (r.kind === "hired") throw new Reject("A hired specialist keeps its maker's face.");
    const seed = Math.round(Number(p.seed));
    if (!(seed >= 1 && seed <= 999)) throw new Reject("That face isn't valid.");
    await db().update(agents).set({ lookJson: { v: seed }, updatedAt: new Date() }).where(eq(agents.id, r.id));
    return { sig: "", confirmed: true, rows: [["Done", "New face is on"]], text: "Changed my face." };
  },
};

/* ---------- persona ---------- */
const personaInput = z.object({ tone: z.string().max(40).optional(), about: z.string().max(600).optional(), bio: z.string().max(600).optional() }).passthrough();
function toneOf(raw: string | undefined) {
  if (!raw) return null;
  const q = raw.trim().toLowerCase();
  const t = TONES.find((x) => x.id === q || x.label.toLowerCase() === q) ?? TONES.find((x) => x.label.toLowerCase().includes(q) || q.includes(x.id));
  if (!t) throw new Reject(`Tones are ${TONES.map((x) => x.label.toLowerCase()).join(", ")}.`);
  return t.id;
}
const setPersona: ToolDef = {
  name: "self.setpersona", connector: "self", risk: "sign", offchain: true, input: personaInput,
  hint: `self.setPersona {"tone":"playful","about":"one or two lines about how you work"} : change your own tone (${TONES.map((t) => t.id).join(", ")}) and, for agents the person made, your short brief; they confirm it.`,
  prepare: async (i: z.output<typeof personaInput>, agent) => {
    const r = await rowOf(agent);
    if (r.kind === "hired") throw new Reject("I keep my maker's persona, so I can't change it.");
    const tone = toneOf(i.tone);
    const about = (i.about ?? i.bio)?.replace(/\s+/g, " ").trim() || null;
    if (about && r.kind !== "custom") throw new Reject("Only agents you made have a brief I can rewrite. I can change my tone.");
    if (!tone && !about) throw new Reject("Tell me the tone or the brief to use.");
    const rows: [string, string][] = [];
    if (tone) rows.push(["Tone", `${toneLabel(r.tone)} → ${toneLabel(tone)}`]);
    if (about) rows.push(["Brief", about.length > 120 ? `${about.slice(0, 118)}…` : about]);
    return offPlan("Change my persona?", rows, { kind: "persona", tone, about, was: { tone: r.tone, about: r.about } });
  },
  execute: async (p: { tone: string | null; about: string | null }, agent): Promise<Executed> => {
    const r = await rowOf(agent);
    if (r.kind === "hired") throw new Reject("A hired specialist keeps its maker's persona.");
    const tone = p.tone && TONES.some((t) => t.id === p.tone) ? p.tone : null;
    const about = r.kind === "custom" && p.about ? p.about.slice(0, 600) : null;
    await db().update(agents).set({ ...(tone ? { tone } : {}), ...(about ? { about } : {}), updatedAt: new Date() }).where(eq(agents.id, r.id));
    return { sig: "", confirmed: true, rows: [["Done", "Persona updated"]], text: "Updated my persona." };
  },
};

/* ---------- model ---------- */
const modelInput = z.object({ model: z.string().max(160) }).passthrough();
const setModel: ToolDef = {
  name: "self.setmodel", connector: "self", risk: "sign", offchain: true, input: modelInput,
  hint: `self.setModel {"model":"qwen"} : switch the model you answer with in every chat (only models switched on in Settings > Models); the person confirms it.`,
  prepare: async (i: z.output<typeof modelInput>, agent) => {
    const m = await resolveModel(agent.userId, i.model);
    const r = await rowOf(agent);
    const cur = r.model ? (modelById(r.model) ?? keyModelInfo(r.model))?.label ?? r.model : "Account default";
    if ((r.model ?? LAMINA.id) === m.id) throw new Reject(`I already answer with ${m.label}.`);
    return offPlan(`Switch to ${m.label}?`, [["Now", cur], ["New model", m.label], ["Applies to", "Every chat without its own model"]], { kind: "model", model: m.id, was: r.model });
  },
  execute: async (p: { model: string }, agent): Promise<Executed> => {
    const m = await resolveModel(agent.userId, p.model);
    const r = await rowOf(agent);
    await db().update(agents).set({ model: m.id, updatedAt: new Date() }).where(eq(agents.id, r.id));
    return { sig: "", confirmed: true, rows: [["Done", `Now answering with ${m.label}`]], text: `Switched to ${m.label}.` };
  },
};

export const SELF_TOOLS: ToolDef[] = [rename, setAvatar, setPersona, setModel];
export const SELF_HINT = "Your own settings: when the person asks you in this message to rename yourself, change your face, tone or model, use the matching self tool once; they see a Confirm card and nothing changes until they confirm. You can never change your integrations, spending limits, budgets, wallets or keys, and there is no tool for it: if asked, say the person changes those in Settings.";
