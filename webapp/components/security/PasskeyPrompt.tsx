"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { passkeySupported } from "@/lib/mera";
import Icon from "../Icon";

const KEY = "lexari:ask-passkey";

/** Shown once, right after a new account is made with Google or email: "Add a passkey". */
export default function PasskeyPrompt() {
  const [on, setOn] = useState(false);
  useEffect(() => { try { setOn(localStorage.getItem(KEY) === "1" && passkeySupported() && !location.pathname.startsWith("/onboarding")); } catch { /* private mode */ } }, []);
  if (!on) return null;
  const done = () => { try { localStorage.removeItem(KEY); } catch { /* */ } setOn(false); };
  return (
    <div data-passkey-prompt role="dialog" aria-label="Add a passkey" className="fixed inset-x-3 bottom-24 z-40 mx-auto max-w-[420px] rounded-[22px] bg-card p-4 shadow-xl ring-1 ring-line">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-grape/12 text-brand-ink"><Icon name="lock" size={18} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-ink">Add a passkey</p>
          <p className="mt-0.5 text-[13px] leading-snug text-ink/65">Sign in next time with Face ID, Touch ID or a security key, and give each agent its own key.</p>
          <div className="mt-3 flex gap-2">
            <Link href="/settings#security" onClick={done} className="btn btn-brand btn-sm !h-9">Add a passkey</Link>
            <button onClick={done} className="btn btn-ghost btn-sm !h-9">Not now</button>
          </div>
        </div>
      </div>
    </div>
  );
}
