"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Dumbbell, UsersRound } from "lucide-react";

import { AvailabilityCard } from "@/components/AvailabilityCard";
import { AchievementsPanel } from "@/components/AchievementsPanel";
import { EventCard } from "@/components/EventCard";
import { GroupCard } from "@/components/GroupCard";
import { MatchRunner } from "@/components/MatchRunner";
import { SmartRecommendations } from "@/components/SmartRecommendations";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorMessage } from "@/components/ui/error-state";
import { LoadingPage } from "@/components/ui/loading-skeleton";
import { SectionCard } from "@/components/ui/section-card";
import { getEvents, getGroups } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { EventItem, Group } from "@/lib/types";
import { useAuthProfile } from "@/lib/use-auth-profile";

export default function DashboardPage() {
  const { user, profile, loading, error } = useAuthProfile();
  const { t } = useI18n();
  const [groups, setGroups] = useState<Group[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [dataError, setDataError] = useState("");

  const loadData = useCallback(async () => {
    if (!user) return;
    setDataError("");
    try {
      const [nextGroups, nextEvents] = await Promise.all([getGroups(user.id), getEvents(user.id)]);
      setGroups(nextGroups);
      setEvents(nextEvents);
    } catch (loadError) {
      setDataError(loadError instanceof Error ? loadError.message : "Could not load dashboard data.");
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!user) return;
    const supabase = getSupabaseBrowserClient();
    const eventsChannel = supabase
      .channel(`dashboard-events-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, (payload) => {
        if (process.env.NODE_ENV === "development") console.log("Realtime event change received", payload);
        loadData();
      })
      .subscribe();

    const notificationsChannel = supabase
      .channel(`dashboard-notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const notification = payload.new as { type?: string };
          if (notification.type === "event_created" || notification.type === "event_deleted") {
            if (process.env.NODE_ENV === "development") console.log("Realtime notification received", payload);
            loadData();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(notificationsChannel);
    };
  }, [loadData, user]);

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <LoadingPage />
      </main>
    );
  }

  if (error || !user || !profile) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <ErrorMessage message={error || "Profile required."} />
      </main>
    );
  }

  const now = new Date();
  const sortedEvents = [...events].sort((first, second) => {
    if (!first.event_time) return 1;
    if (!second.event_time) return -1;
    const firstTime = new Date(first.event_time).getTime();
    const secondTime = new Date(second.event_time).getTime();
    const firstIsUpcoming = firstTime >= now.getTime();
    const secondIsUpcoming = secondTime >= now.getTime();

    if (firstIsUpcoming !== secondIsUpcoming) {
      return firstIsUpcoming ? -1 : 1;
    }

    return firstIsUpcoming ? firstTime - secondTime : secondTime - firstTime;
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <PageHeader
        label={t("todaysBoard")}
        title={`${t("welcome")}, ${profile.full_name?.split(" ")[0] || profile.username}`}
        subtitle={profile.city ? `${profile.city} ${t("activeGroupsAndEvents")}` : t("addCityToImprove")}
        action={
          <Link href="/profile">
            <Button variant="secondary">{t("editProfile")}</Button>
          </Link>
        }
      />

      {dataError ? <ErrorMessage message={dataError} className="mb-6" /> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={Dumbbell} label={t("sports")} value={profile.sports_preferences?.length || 0} />
        <StatCard icon={UsersRound} label={t("groups")} value={groups.length} />
        <StatCard icon={CalendarDays} label={t("events")} value={events.length} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <AvailabilityCard userId={user.id} />
          <MatchRunner
            userId={user.id}
            city={profile.city}
            hasSports={Boolean(profile.sports_preferences?.length)}
            onMatched={loadData}
          />
          <SmartRecommendations profile={profile} />
          <AchievementsPanel userId={user.id} />
        </div>
        <div className="space-y-6">
          <SectionCard title={t("currentGroup")}>
            {groups.length ? (
              groups.slice(0, 1).map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  currentUserId={user.id}
                  currentUserProfile={profile}
                  onConfirmed={loadData}
                />
              ))
            ) : (
              <EmptyState
                icon={UsersRound}
                title={t("noGroupsYet")}
                description={t("noGroupsDescription")}
              />
            )}
          </SectionCard>
          <SectionCard
            title={t("events")}
            action={
              <Link href="/events" className="text-sm font-semibold text-primary hover:underline">
                {t("viewAll")}
              </Link>
            }
          >
            {sortedEvents.length ? (
              <div className="grid gap-3">
                {sortedEvents.slice(0, 3).map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={CalendarDays}
                title={t("noEventsYet")}
                description={t("noEventsDescription")}
              />
            )}
          </SectionCard>
        </div>
      </div>
    </main>
  );
}
