"use client";

import { useState } from "react";
import { Shuffle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SectionCardWithBorder } from "@/components/ui/section-card";
import { ErrorMessage, SuccessMessage } from "@/components/ui/error-state";
import { getAvailability, runMatching } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

function todayLocal() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function MatchRunner({
  userId,
  city,
  hasSports = true,
  onMatched
}: {
  userId?: string;
  city?: string;
  hasSports?: boolean;
  onMatched?: () => void;
}) {
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { t } = useI18n();

  async function run() {
    setLoading(true);
    setResult("");
    setError("");
    if (!hasSports) {
      setError(t("matcher.noSports"));
      setLoading(false);
      return;
    }
    try {
      if (userId) {
        const availability = await getAvailability(userId, todayLocal());
        if (availability.is_available !== true) {
          setError(t("matcher.markAvailable"));
          return;
        }
      }
      const data = await runMatching({
        date: todayLocal(),
        city,
        max_distance_km: 10
      });
      setResult(
        data.created_groups > 0
          ? t("matcher.createdGroups", { count: data.created_groups })
          : data.message || t("matcher.notEnough")
      );
      onMatched?.();
    } catch (matchError) {
      setError(matchError instanceof Error ? matchError.message : t("matcher.couldNotRun"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SectionCardWithBorder
      title={t("matcher.smartMatching")}
      description={t("matcher.description")}
    >
      <div className="space-y-4">
        <Button onClick={run} disabled={loading} className="w-full">
          <Shuffle className="h-4 w-4" />
          {loading ? t("matcher.matching") : t("matcher.runMatcher")}
        </Button>
        {result ? <SuccessMessage message={result} /> : null}
        {error ? <ErrorMessage message={error} /> : null}
      </div>
    </SectionCardWithBorder>
  );
}
