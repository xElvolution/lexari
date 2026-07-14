import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";

/**
 * Minimal session auth: scrypt password hashing + opaque session tokens in
 * an httpOnly cookie, stored in Neon. No external auth service needed.
 */

const COOKIE = "lexari_session";
const SESSION_DAYS = 30;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const test = scryptSync(password, salt, 64);
  const known = Buffer.from(hash, "hex");
  return test.length === known.length && timingSafeEqual(test, known);
}

export interface User {
  id: string;
  email: string;
  name: string | null;
}

export async function createUser(email: string, password: string, name?: string): Promise<User> {
  const { rows } = await db().query(
    `insert into users (email, password_hash, name) values ($1, $2, $3) returning id, email, name`,
    [email.toLowerCase().trim(), hashPassword(password), name?.trim() || null],
  );
  return rows[0] as User;
}

export async function findUserByEmail(email: string) {
  const { rows } = await db().query(
    `select id, email, name, password_hash from users where email = $1`,
    [email.toLowerCase().trim()],
  );
  return rows[0] as (User & { password_hash: string }) | undefined;
}

export async function startSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  await db().query(
    `insert into sessions (token, user_id, expires_at) values ($1, $2, $3)`,
    [token, userId, expires],
  );
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
  return token;
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    await db().query(`delete from sessions where token = $1`, [token]);
    jar.delete(COOKIE);
  }
}

export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const { rows } = await db().query(
    `select u.id, u.email, u.name from sessions s
     join users u on u.id = s.user_id
     where s.token = $1 and s.expires_at > now()`,
    [token],
  );
  return (rows[0] as User) ?? null;
}
