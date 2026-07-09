import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";

/** Deterministic key ordering so the same logical input always hashes identically. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, sortKeys(v)]),
    );
  }
  return value;
}

export function sha256Json(value: unknown): string {
  return (
    "sha256:" + createHash("sha256").update(canonicalJson(value)).digest("hex")
  );
}

export function sha256File(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    createReadStream(path)
      .on("data", (chunk) => hash.update(chunk))
      .on("end", () => resolve("sha256:" + hash.digest("hex")))
      .on("error", reject);
  });
}
