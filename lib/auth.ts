import { createRemoteJWKSet, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "./db";

/**
 * Server-side auth: verifies Privy access tokens (ES256 JWTs in the
 * `privy-token` cookie) against Privy's JWKS, and mirrors users into our
 * Neon `users` table so jobs can reference user_id.
 */

export interface User {
  id: string;
  email: string;
  name: string | null;
}

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

const jwks = PRIVY_APP_ID
  ? createRemoteJWKSet(
      new URL(`https://auth.privy.io/api/v1/apps/${PRIVY_APP_ID}/jwks.json`),
    )
  : null;

/** Verify the Privy session and return (creating if needed) our local user. */
export async function currentUser(): Promise<User | null> {
  if (!jwks || !PRIVY_APP_ID) return null;
  const jar = await cookies();
  const token = jar.get("privy-token")?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: "privy.io",
      audience: PRIVY_APP_ID,
    });
    const privyDid = payload.sub;
    if (!privyDid) return null;

    // Mirror into users table keyed by the Privy DID (stored in email slot
    // when no email is present — wallet-only users).
    const { rows } = await db().query(
      `insert into users (email, password_hash, name)
       values ($1, 'privy', null)
       on conflict (email) do update set email = excluded.email
       returning id, email, name`,
      [privyDid],
    );
    return rows[0] as User;
  } catch {
    return null;
  }
}
