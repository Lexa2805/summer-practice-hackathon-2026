"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, UsersRound, Shuffle } from "lucide-react";

import { GroupCard } from "@/components/GroupCard";
import { MatchRunner } from "@/components/MatchRunner";
import { SmartRecommendations } from "@/components/SmartRecommendations";
import { CreateGroupModal } from "@/components/CreateGroupModal";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorMessage } from "@/components/ui/error-state";
import { LoadingPage } from "@/components/ui/loading-skeleton";
import { SectionCardWithBorder } from "@/components/ui/section-card";
import { getGroups } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Group } from "@/lib/types";
import { useAuthProfile } from "@/lib/use-auth-profile";

export default function GroupsPage() {
  const { user, profile, loading, error } = useAuthProfile();
  const { t } = useI18n();
  const [groups, setGroups] = useState<Group[]>([]);
  const [dataError, setDataError] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const loadGroups = useCallback(async () => {
    if (!user) return;
    setDataError("");
    try {
      setGroups(await getGroups(user.id));
    } catch (loadError) {
      setDataError(loadError instanceof Error ? loadError.message : t("groupsPage.couldNotLoad"));
    }
  }, [t, user]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

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
        label={t("groupsPage.label")}
        title={t("groupsPage.title")}
        subtitle={t("groupsPage.subtitle")}
      />

      {dataError ? <ErrorMessage message={dataError} className="mb-6" /> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div>
          {groups.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {groups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  currentUserId={user.id}
                  currentUserProfile={profile}
                  onConfirmed={loadGroups}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={UsersRound}
              title={t("groupsPage.noGroups")}
              description={t("groupsPage.noGroupsDescription")}
              action={() => setIsCreateOpen(true)}
              actionLabel={t("groupsPage.createNewGroup")}
            />
          )}
        </div>

        <div className="space-y-6">
          <SectionCardWithBorder
            title={t("matcher.smartMatching")}
            description={t("groupsPage.smartMatchingDescription")}
          >
            <MatchRunner
              userId={user.id}
              city={profile?.city}
              hasSports={Boolean(profile?.sports_preferences?.length)}
              onMatched={loadGroups}
            />
          </SectionCardWithBorder>

          <SectionCardWithBorder
            title={t("groupsPage.manualPlanning")}
            description={t("groupsPage.manualPlanningDescription")}
          >
            <Button className="w-full" onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              {t("groupsPage.createNewGroup")}
            </Button>
          </SectionCardWithBorder>

          {profile ? <SmartRecommendations profile={profile} /> : null}

          <Button variant="outline" className="w-full" onClick={loadGroups}>
            <Shuffle className="h-4 w-4" />
            {t("groupsPage.refreshGroups")}
          </Button>
        </div>
      </div>

      <CreateGroupModal
        userId={user.id}
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={loadGroups}
      />
    </main>
  );
}
