"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorMessage, SuccessMessage } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentSession, updatePassword } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type RecoveryStatus = "checking" | "ready" | "invalid" | "updated";

function getUrlRecoveryError() {
  if (typeof window === "undefined") return "";

  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  return (
    searchParams.get("error_description") ||
    hashParams.get("error_description") ||
    searchParams.get("error") ||
    hashParams.get("error") ||
    ""
  );
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<RecoveryStatus>("checking");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const supabase = getSupabaseBrowserClient();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session?.user) {
        setStatus("ready");
        setError("");
      }
    });

    async function restoreRecoverySession() {
      const urlError = getUrlRecoveryError();
      if (urlError) {
        setStatus("invalid");
        setError(t("auth.resetInvalid"));
        return;
      }

      try {
        const session = await getCurrentSession();
        if (!active) return;

        if (session?.user) {
          setStatus("ready");
          return;
        }

        window.setTimeout(async () => {
          if (!active) return;
          try {
            const refreshedSession = await getCurrentSession();
            if (!active) return;
            if (refreshedSession?.user) {
              setStatus("ready");
            } else {
              setStatus("invalid");
              setError(t("auth.resetInvalidRequest"));
            }
          } catch {
            if (!active) return;
            setStatus("invalid");
            setError(t("auth.resetInvalidRequest"));
          }
        }, 1200);
      } catch {
        if (!active) return;
        setStatus("invalid");
        setError(t("auth.resetInvalidRequest"));
      }
    }

    restoreRecoverySession();

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [t]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 6) {
      setError(t("auth.passwordMin"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("auth.passwordsDoNotMatch"));
      return;
    }

    setLoading(true);
    try {
      await updatePassword(password);
      setStatus("updated");
      setMessage(t("auth.passwordUpdated"));

      const session = await getCurrentSession();
      window.setTimeout(() => {
        router.replace(session?.user ? "/dashboard" : "/login");
      }, 1400);
    } catch {
      setError(t("auth.resetInvalid"));
      setStatus("invalid");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto grid min-h-[calc(100vh-65px)] max-w-7xl items-center gap-10 px-4 py-12 md:px-8 lg:grid-cols-2">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">{t("auth.accountRecovery")}</p>
        <h1 className="mt-3 text-5xl font-black leading-tight">{t("auth.setNewPassword")}</h1>
        <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
          {t("auth.setNewPasswordSubtitle")}
        </p>
      </div>
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-2xl">{t("auth.updatePassword")}</CardTitle>
          <CardDescription>{t("auth.passwordMin")}</CardDescription>
        </CardHeader>
        <CardContent>
          {status === "checking" ? (
            <div className="rounded-md border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
              {t("auth.checkingResetLink")}
            </div>
          ) : null}

          {status === "invalid" ? (
            <div className="space-y-5">
              <ErrorMessage message={error || t("auth.resetInvalidRequest")} />
              <Button type="button" className="w-full" onClick={() => router.push("/forgot-password")}>
                <RotateCcw className="h-4 w-4" />
                {t("auth.requestNewReset")}
              </Button>
            </div>
          ) : null}

          {status === "ready" || status === "updated" ? (
            <form onSubmit={submit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password">{t("auth.newPassword")}</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={t("auth.passwordPlaceholder")}
                  minLength={6}
                  disabled={status === "updated"}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">{t("auth.confirmPassword")}</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder={t("auth.repeatPasswordPlaceholder")}
                  minLength={6}
                  disabled={status === "updated"}
                  required
                />
              </div>
              <Button className="w-full" disabled={loading || status === "updated"}>
                <KeyRound className="h-4 w-4" />
                {loading ? t("common.updating") : t("auth.updatePassword")}
              </Button>
              {message ? <SuccessMessage message={message} /> : null}
              {error ? <ErrorMessage message={error} /> : null}
            </form>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
