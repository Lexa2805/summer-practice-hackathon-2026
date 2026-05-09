"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SectionCardWithBorder } from "@/components/ui/section-card";
import { ErrorMessage, SuccessMessage } from "@/components/ui/error-state";
import { checkAchievements, getAvailability, setAvailability } from "@/lib/api";
import { showToast } from "@/lib/toast";
import { useI18n } from "@/lib/i18n";

export function AvailabilityCard({ userId }: { userId: string }) {
  const { t } = useI18n();
  const [status, setStatus] = useState<"yes" | "no" | "idle">("idle");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const today = useMemo(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
  }, []);

  useEffect(() => {
    async function loadStatus() {
      try {
        const saved = await getAvailability(userId, today);
        if (saved.is_available === true) setStatus("yes");
        if (saved.is_available === false) setStatus("no");
      } catch {
        setStatus("idle");
      }
    }

    loadStatus();
  }, [today, userId]);

  async function respond(isAvailable: boolean) {
    setLoading(true);
    setMessage("");
    setError("");
    try {
      await setAvailability({
        user_id: userId,
        date: today,
        is_available: isAvailable,
        preferred_time: "evening"
      });
      setStatus(isAvailable ? "yes" : "no");
      setMessage(isAvailable ? t("showupPage.youAreAvailable") : t("showupPage.youAreUnavailable"));
      const achievementResult = await checkAchievements(userId);
      achievementResult.unlocked_now?.forEach((item) =>
        showToast(`${t("errors.achievementUnlocked")} ${item.title}`, "success")
      );
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("showupPage.couldNotSave"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SectionCardWithBorder
      title={t("showupPage.cardTitle")}
      description={t("showupPage.cardDescription")}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Button
            className="h-16 text-lg"
            disabled={loading}
            onClick={() => respond(true)}
            variant={status === "yes" ? "default" : "outline"}
          >
            <Check className="h-5 w-5" />
            {t("common.yes")}
          </Button>
          <Button
            className="h-16 text-lg"
            disabled={loading}
            onClick={() => respond(false)}
            variant={status === "no" ? "destructive" : "outline"}
          >
            <X className="h-5 w-5" />
            {t("common.no")}
          </Button>
        </div>
        {status !== "idle" ? (
          <div className="rounded-md bg-muted px-4 py-3 text-sm font-medium">
            {t("showupPage.savedFor")} {today}: {status === "yes" ? t("showupPage.available") : t("showupPage.notAvailable")}.
          </div>
        ) : null}
        {message ? <SuccessMessage message={message} /> : null}
        {error ? <ErrorMessage message={error} /> : null}
      </div>
    </SectionCardWithBorder>
  );
}
