"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorMessage, SuccessMessage } from "@/components/ui/error-state";
import { getProfile } from "@/lib/api";
import { getCurrentSession, loginWithEmail, signUpWithEmail } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { t } = useI18n();

  useEffect(() => {
    async function redirectIfLoggedIn() {
      const session = await getCurrentSession();
      if (!session?.user) return;
      try {
        await getProfile(session.user.id);
        router.replace(next);
      } catch {
        router.replace("/profile");
      }
    }

    redirectIfLoggedIn();
  }, [next, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const result =
        mode === "login"
          ? await loginWithEmail(email, password)
          : await signUpWithEmail(email, password);

      const userId = result.user?.id || result.session?.user.id;
      if (!userId) {
        setMessage(t("auth.checkEmailConfirm"));
        return;
      }

      try {
        await getProfile(userId);
        router.replace(next);
      } catch {
        router.replace("/profile");
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : t("auth.authFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto grid min-h-[calc(100vh-65px)] max-w-7xl items-center gap-10 px-4 py-12 md:px-8 lg:grid-cols-2">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">{t("auth.joinNextMatch")}</p>
        <h1 className="mt-3 text-5xl font-black leading-tight">{t("auth.login")} / {t("auth.register")}</h1>
        <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
          {t("auth.loginRegisterSubtitle")}
        </p>
      </div>
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-2xl">{mode === "login" ? t("auth.login") : t("auth.register")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-5">
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
              <Button type="button" variant={mode === "login" ? "default" : "ghost"} onClick={() => setMode("login")}>
                <LogIn className="h-4 w-4" />
                {t("auth.login")}
              </Button>
              <Button
                type="button"
                variant={mode === "register" ? "default" : "ghost"}
                onClick={() => setMode("register")}
              >
                <UserPlus className="h-4 w-4" />
                {t("auth.register")}
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="alex@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t("auth.passwordPlaceholder")}
                minLength={6}
                required
              />
              {mode === "login" ? (
                <div className="text-right">
                  <Link href="/forgot-password" className="text-sm font-semibold text-primary hover:underline">
                    {t("auth.forgotPassword")}
                  </Link>
                </div>
              ) : null}
            </div>
            <Button className="w-full" disabled={loading}>
              {loading ? t("common.loading") : mode === "login" ? t("auth.login") : t("auth.register")}
            </Button>
            {message ? <SuccessMessage message={message} /> : null}
            {error ? <ErrorMessage message={error} /> : null}
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
