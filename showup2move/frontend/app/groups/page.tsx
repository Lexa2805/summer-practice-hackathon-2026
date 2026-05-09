"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, UsersRound, Sparkles, Shuffle } from "lucide-react";

import { GroupCard } from "@/components/GroupCard";
import { MatchRunner } from "@/components/MatchRunner";
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
      setDataError(loadError instanceof Error ? loadError.message : "Could not load groups. Please check if the backend is running.");
    }
  }, [user]);

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
        <ErrorMessage message={error || "Login required."} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <PageHeader
        label="YOUR MATCHED GROUPS"
        title={t("groups")}
        subtitle="Groups are sets of matched people. Each group has its own chat and can have multiple events."
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
              title="No groups yet"
              description="Mark yourself available today and run the matcher, or create your own group."
              action={() => setIsCreateOpen(true)}
              actionLabel="Create new group"
            />
          )}
        </div>

        <div className="space-y-6">
          <SectionCardWithBorder
            title="Smart Matching"
            description="Let our AI automatically match you with a nearby group based on your preferences and skill level."
          >
            <MatchRunner
              userId={user.id}
              city={profile?.city}
              hasSports={Boolean(profile?.sports_preferences?.length)}
              onMatched={loadGroups}
            />
          </SectionCardWithBorder>

          <SectionCardWithBorder
            title="Manual Planning"
            description="Start your own group and invite people manually or use AI to find teammates."
          >
            <Button className="w-full" onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Create new group
            </Button>
          </SectionCardWithBorder>

          <Button variant="outline" className="w-full" onClick={loadGroups}>
            <Shuffle className="h-4 w-4" />
            Refresh groups
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
