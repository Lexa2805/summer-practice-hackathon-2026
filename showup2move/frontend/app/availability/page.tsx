"use client";

import { AvailabilityCard } from "@/components/AvailabilityCard";
import { MatchRunner } from "@/components/MatchRunner";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorMessage } from "@/components/ui/error-state";
import { LoadingPage } from "@/components/ui/loading-skeleton";
import { useI18n } from "@/lib/i18n";
import { useAuthProfile } from "@/lib/use-auth-profile";

export default function AvailabilityPage() {
  const { user, profile, loading, error } = useAuthProfile();
  const { t } = useI18n();

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <LoadingPage />
      </main>
    );
  }

  if (error || !user) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <ErrorMessage message={error || t("errors.loginRequired")} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <PageHeader
          label={t("showupPage.label")}
          title={t("showupPage.title")}
          subtitle={t("showupPage.subtitle")}
        />
        <div className="space-y-6">
          <AvailabilityCard userId={user.id} />
          <MatchRunner
            userId={user.id}
            city={profile?.city}
            hasSports={Boolean(profile?.sports_preferences?.length)}
          />
        </div>
      </div>
    </main>
  );
}
