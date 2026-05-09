"use client";

import { useCallback, useEffect, useState } from "react";

import { GroupCard } from "@/components/GroupCard";
import { MatchRunner } from "@/components/MatchRunner";
import { getGroups } from "@/lib/api";
import type { Group } from "@/lib/types";
import { useAuthProfile } from "@/lib/use-auth-profile";

export default function MatchesPage() {
  const { user, profile, loading, error } = useAuthProfile();
  const [groups, setGroups] = useState<Group[]>([]);
  const [dataError, setDataError] = useState("");

  const loadGroups = useCallback(async () => {
    if (!user) return;
    setDataError("");
    try {
      setGroups(await getGroups(user.id));
    } catch (loadError) {
      setDataError(loadError instanceof Error ? loadError.message : "Could not load groups.");
    }
  }, [user]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  if (loading) {
    return <main className="mx-auto max-w-6xl px-4 py-8 text-muted-foreground">Loading groups...</main>;
  }

  if (error || !user) {
    return <main className="mx-auto max-w-6xl px-4 py-8 text-destructive">{error || "Login required."}</main>;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Matched groups</p>
          <h1 className="mt-2 text-4xl font-black">Groups</h1>
        </div>
        <div className="max-w-sm">
          <MatchRunner
            userId={user.id}
            city={profile?.city}
            hasSports={Boolean(profile?.sports_preferences?.length)}
            onMatched={loadGroups}
          />
        </div>
      </div>
      {dataError ? (
        <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {dataError}
        </p>
      ) : null}
      {groups.length ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
        <p className="rounded-md border bg-card p-5 text-sm text-muted-foreground">
          No groups yet. Mark yourself available today and run the matcher.
        </p>
      )}
    </main>
  );
}
