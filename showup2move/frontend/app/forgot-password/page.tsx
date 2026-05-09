"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorMessage, SuccessMessage } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendPasswordResetEmail } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedEmail = email.trim();
    setError("");
    setMessage("");

    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError(t("auth.invalidEmail"));
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(trimmedEmail, `${window.location.origin}/reset-password`);
      setMessage(t("auth.passwordResetSent"));
    } catch {
      setError(t("auth.couldNotSendReset"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto grid min-h-[calc(100vh-65px)] max-w-7xl items-center gap-10 px-4 py-12 md:px-8 lg:grid-cols-2">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">{t("auth.accountRecovery")}</p>
        <h1 className="mt-3 text-5xl font-black leading-tight">{t("auth.forgotTitle")}</h1>
        <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
          {t("auth.forgotSubtitle")}
        </p>
      </div>
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-2xl">{t("auth.resetPassword")}</CardTitle>
          <CardDescription>{t("auth.resetDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-5">
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
            <Button className="w-full" disabled={loading}>
              <Mail className="h-4 w-4" />
              {loading ? t("common.sending") : t("auth.sendResetLink")}
            </Button>
            {message ? <SuccessMessage message={message} /> : null}
            {error ? <ErrorMessage message={error} /> : null}
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("auth.backToLogin")}
            </Link>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
