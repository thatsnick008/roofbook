"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { AlertTriangle, Building2, CloudOff, Eye, EyeOff, ShieldCheck, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";

export const SIGNED_IN_KEY = "pcc-has-signed-in";

const ERROR_MESSAGES: Record<string, string> = {
  Configuration: "Sign-in is temporarily unavailable. Please try again shortly.",
  CredentialsSignin: "That email and password don't match."
};

export function AuthGate({ children }: { children: React.ReactNode }) {
  return (
    <React.Suspense fallback={null}>
      <AuthGateInner>{children}</AuthGateInner>
    </React.Suspense>
  );
}

function AuthGateInner({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const searchParams = useSearchParams();
  const [offlineAllowed, setOfflineAllowed] = React.useState(false);
  const authError = searchParams?.get("error") ?? null;
  const resetToken = searchParams?.get("reset");

  React.useEffect(() => {
    if (status === "authenticated") {
      window.localStorage.setItem(SIGNED_IN_KEY, "1");
      setOfflineAllowed(false);
      return;
    }
    if (status === "unauthenticated") {
      setOfflineAllowed(!navigator.onLine && window.localStorage.getItem(SIGNED_IN_KEY) === "1");
    }
  }, [status]);

  if (status === "loading") {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="flex flex-col items-center gap-3 text-muted">
          <div className="grid h-12 w-12 animate-pulse place-items-center rounded-2xl bg-brand text-white">
            <Building2 size={22} />
          </div>
          <p className="text-sm">Opening Roofbook…</p>
        </div>
      </div>
    );
  }

  if (status === "authenticated" || offlineAllowed) {
    return (
      <>
        {offlineAllowed ? (
          <div className="flex items-center justify-center gap-2 bg-warning/15 px-4 py-2 text-xs font-semibold text-warning">
            <WifiOff size={14} /> Offline — working from your local copy. Changes sync when you reconnect.
          </div>
        ) : null}
        {children}
      </>
    );
  }

  return <SignInCard initialError={authError} resetToken={resetToken} />;
}

function SignInCard({ initialError, resetToken }: { initialError: string | null; resetToken: string | null }) {
  const router = useRouter();
  const [mode, setMode] = React.useState<"signin" | "signup">("signin");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [forgot, setForgot] = React.useState(false);
  const [resetPassword, setResetPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(
    initialError ? (ERROR_MESSAGES[initialError] ?? "Sign-in failed. Please try again.") : null
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!email.trim() || password.length < 8) {
      setError("Enter your email and a password with at least 8 characters.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "signup") {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password })
        });
        const result = await response.json();
        if (!response.ok) {
          setError(result.error ?? "Could not create your account.");
          setSubmitting(false);
          return;
        }
      }

      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setError(
          mode === "signup" ? "Account created, but sign-in failed. Try signing in below." : "That email and password don't match."
        );
        setMode("signin");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const recover = async () => {
    setSubmitting(true);
    const response = await fetch(resetToken ? "/api/auth/reset-password" : "/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(resetToken ? { token: resetToken, password: resetPassword } : { email })
    });
    const result = await response.json();
    setError(result.error ?? result.message);
    setSubmitting(false);
    if (response.ok && resetToken) {
      router.replace("/");
      setForgot(false);
    }
  };

  return (
    <div className="relative z-10 grid min-h-screen place-items-center px-5 py-12">
      <div className="w-full max-w-md">
        <div className="card overflow-hidden">
          <div className="bg-gradient-to-br from-brand to-brand/60 px-7 py-8 text-white">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 backdrop-blur">
              <Building2 size={24} />
            </div>
            <h1 className="mt-4 text-2xl font-bold">Roofbook</h1>
            <p className="mt-1 text-sm text-white/80">
              Your portfolio, loans, rent, expenses and tax reporting — synced across every device.
            </p>
          </div>

          <div className="px-7 py-7">
            <div className="mb-5 flex gap-1 rounded-2xl border border-border bg-bg/50 p-1.5">
              {(["signin", "signup"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setMode(item);
                    setError(null);
                  }}
                  className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    mode === item ? "bg-brand text-white" : "text-muted hover:text-fg"
                  }`}
                >
                  {item === "signin" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>

            {mode === "signin" ? (
              <button type="button" className="mb-4 text-left text-sm font-semibold text-brand" onClick={() => setForgot(true)}>
                Forgot password?
              </button>
            ) : null}

            {forgot ? (
              <div className="mb-4 rounded-2xl border border-brand/30 bg-brand/5 p-4">
                <p className="text-sm font-semibold">{resetToken ? "Choose a new password" : "Reset your password"}</p>
                <p className="mt-1 text-xs text-muted">
                  {resetToken ? "Use at least 8 characters." : "We will email a secure reset link if the account exists."}
                </p>
                {resetToken ? (
                  <Input className="mt-3" type="password" minLength={8} value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} placeholder="New password" />
                ) : null}
                <Button type="button" className="mt-3 w-full" onClick={recover} disabled={submitting}>
                  {submitting ? "Please wait…" : resetToken ? "Set new password" : "Email reset link"}
                </Button>
              </div>
            ) : null}

            {error ? (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-negative/30 bg-negative/10 px-3.5 py-3 text-sm text-negative">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <form onSubmit={submit} className="space-y-4">
              {mode === "signup" ? (
                <Field label="Name">
                  <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
                </Field>
              ) : null}
              <Field label="Email">
                <Input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </Field>
              <Field label="Password" hint={mode === "signup" ? "At least 8 characters." : undefined}>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    minLength={8}
                    required
                    className="pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>

              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                {submitting ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
              </Button>
            </form>

            <ul className="mt-5 space-y-2 text-sm text-muted">
              <li className="flex items-start gap-2">
                <ShieldCheck size={16} className="mt-0.5 shrink-0 text-positive" /> Your password is never stored in
                plain text, and your data is only ever visible to your account.
              </li>
              <li className="flex items-start gap-2">
                <CloudOff size={16} className="mt-0.5 shrink-0 text-brand" /> Works offline — records are cached on
                this device and sync automatically once you&apos;re back online.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
