import { NextResponse, type NextRequest } from "next/server";
import {
  createUser,
  endSession,
  findUserByEmail,
  startSession,
  verifyPassword,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST { action: "signup"|"login"|"logout", email, password, name? } */
export async function POST(req: NextRequest) {
  let body: { action?: string; email?: string; password?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (body.action === "logout") {
    await endSession();
    return NextResponse.json({ ok: true });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "enter a valid email" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "password must be at least 8 characters" }, { status: 400 });
  }

  try {
    if (body.action === "signup") {
      const existing = await findUserByEmail(email);
      if (existing) {
        return NextResponse.json({ error: "an account with this email already exists" }, { status: 409 });
      }
      const user = await createUser(email, password, body.name);
      await startSession(user.id);
      return NextResponse.json({ user: { email: user.email, name: user.name } });
    }

    // login
    const user = await findUserByEmail(email);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ error: "wrong email or password" }, { status: 401 });
    }
    await startSession(user.id);
    return NextResponse.json({ user: { email: user.email, name: user.name } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "auth failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
