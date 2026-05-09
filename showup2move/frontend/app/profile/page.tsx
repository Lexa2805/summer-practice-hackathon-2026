"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AchievementsPanel } from "@/components/AchievementsPanel";
import { FitnessIntegrationsPanel } from "@/components/FitnessIntegrationsPanel";
import { ProfileForm } from "@/components/ProfileForm";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorMessage } from "@/components/ui/error-state";
import { LoadingPage } from "@/components/ui/loading-skeleton";
import { getSports } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Sport } from "@/lib/types";
import { useAuthProfile } from "@/lib/use-auth-profile";

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading, error } = useAuthProfile({ requireProfile: false });
  const { t } = useI18n();
  const [sports, setSports] = useState<Sport[]>([]);
  const [sportsError, setSportsError] = useState("");

  useEffect(() => {
    async function loadSports() {
      try {
        setSports(await getSports());
      } catch (loadError) {
        setSportsError(loadError instanceof Error ? loadError.message : t("profilePage.couldNotLoadSports"));
      }
    }

    loadSports();
  }, [t]);

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
      <PageHeader
        label={t("profilePage.label")}
        title={t("profilePage.title")}
        subtitle={!profile ? t("profilePage.createFirst") : undefined}
      />
      {sportsError ? <ErrorMessage message={sportsError} className="mb-6" /> : null}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <ProfileForm userId={user.id} profile={profile} sports={sports} onSaved={() => router.push("/dashboard")} />
        <div className="space-y-6">
          <AchievementsPanel userId={user.id} />
          <FitnessIntegrationsPanel userId={user.id} />
        </div>
      </div>
    </main>
  );
}
