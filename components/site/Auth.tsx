"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "motion/react";

interface User {
  email: string;
  name: string | null;
}
interface AuthCtx {
  user: User | null;
  loading: boolean;
  open: (mode?: "login" | "signup") => void;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  loading: true,
  open: () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | "login" | "signup">(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, loading, open: (m = "login") => setModal(m), logout }}>
      {children}
      <AnimatePresence>
        {modal && (
          <AuthModal
            mode={modal}
            onClose={() => setModal(null)}
            onSuccess={(u) => {
              setUser(u);
              setModal(null);
            }}
            switchMode={setModal}
          />
        )}
      </AnimatePresence>
    </Ctx.Provider>
  );
}

function AuthModal({
  mode,
  onClose,
  onSuccess,
  switchMode,
}: {
  mode: "login" | "signup";
  onClose: () => void;
  onSuccess: (u: User) => void;
  switchMode: (m: "login" | "signup") => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: mode, email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "something went wrong");
        return;
      }
      onSuccess(data.user);
    } catch {
      setError("network error");
    } finally {
      setBusy(false);
    }
  };

  const input =
    "w-full rounded-xl border border-line bg-surface px-4 py-3 text-[15px] text-ink outline-none transition-colors focus:border-line-strong placeholder:text-faint";

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.35 }}
        className="relative w-full max-w-md rounded-3xl border border-line p-8"
        style={{ background: "var(--elev)" }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg font-display text-lg font-bold text-black"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
          >
            L
          </span>
          <span className="font-display text-lg font-bold">Lexari</span>
        </div>

        <h2 className="mt-6 font-display text-2xl font-bold">
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {mode === "signup"
            ? "Save your renders and unlock paid 1080p exports."
            : "Sign in to your Lexari account."}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          {mode === "signup" && (
            <input className={input} placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
          )}
          <input className={input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          <input className={input} type="password" placeholder="Password (min 8 chars)" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} required />

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl py-3 text-[15px] font-semibold text-black transition-transform hover:scale-[1.01] disabled:opacity-60"
            style={{ background: "linear-gradient(90deg, var(--accent), var(--accent2))" }}
          >
            {busy ? "…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-muted">
          {mode === "signup" ? (
            <>Already have an account?{" "}
              <button onClick={() => switchMode("login")} className="font-semibold text-ink hover:underline">Sign in</button>
            </>
          ) : (
            <>New to Lexari?{" "}
              <button onClick={() => switchMode("signup")} className="font-semibold text-ink hover:underline">Create one</button>
            </>
          )}
        </div>

        <button onClick={onClose} className="absolute right-5 top-5 text-faint hover:text-ink" aria-label="Close">✕</button>
      </motion.div>
    </motion.div>
  );
}
