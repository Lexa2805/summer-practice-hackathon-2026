"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Dumbbell, UsersRound } from "lucide-react";

import { AvailabilityCard } from "@/components/AvailabilityCard";
import { EventCard } from "@/components/EventCard";
import { GroupCard } from "@/components/GroupCard";
import { MatchRunner } from "@/components/MatchRunner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getEvents, getGroups } from "@/lib/api";
import type { EventItem, Group } from "@/lib/types";
import { useAuthProfile } from "@/lib/use-auth-profile";

export default function DashboardPage() {
  const { user, profile, loading, error } = useAuthProfile();
  const [groups, setGroups] = useState<Group[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [dataError, setDataError] = useState("");

  const loadData = useCallback(async () => {
    if (!user) return;
    setDataError("");
    try {
      const [nextGroups, nextEvents] = await Promise.all([getGroups(user.id), getEvents()]);
      setGroups(nextGroups);
      setEvents(nextEvents);
    } catch (loadError) {
      setDataError(loadError instanceof Error ? loadError.message : "Could not load dashboard data.");
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return <main className="mx-auto max-w-6xl px-4 py-8 text-muted-foreground">Loading dashboard...</main>;
  }

  if (error || !user || !profile) {
    return <main className="mx-auto max-w-6xl px-4 py-8 text-destructive">{error || "Profile required."}</main>;
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
  const stats = [
    { Icon: Dumbbell, label: "Sports", value: profile.sports_preferences?.length || 0 },
    { Icon: UsersRound, label: "Groups", value: groups.length },
    { Icon: CalendarDays, label: "Events", value: events.length }
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Today&apos;s board</p>
          <h1 className="mt-2 text-4xl font-black">
            Welcome, {profile.full_name?.split(" ")[0] || profile.username}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {profile.city ? `${profile.city} active groups and events.` : "Add your city to improve local matching."}
          </p>
        </div>
        <Link href="/profile">
          <Button variant="secondary">Edit profile</Button>
        </Link>
      </div>

      {dataError ? (
        <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {dataError}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map(({ Icon, label, value }) => (
          <Card key={label}>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-1 text-3xl font-black">{value}</p>
              </div>
              <Icon className="h-8 w-8 text-primary" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <AvailabilityCard userId={user.id} />
          <MatchRunner
            userId={user.id}
            city={profile.city}
            hasSports={Boolean(profile.sports_preferences?.length)}
            onMatched={loadData}
          />
        </div>
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 text-2xl font-black">Current group</h2>
            {groups.length ? (
              groups.slice(0, 1).map((group) => (
                <GroupCard key={group.id} group={group} currentUserId={user.id} onConfirmed={loadData} />
              ))
            ) : (
              <p className="rounded-md border bg-card p-5 text-sm text-muted-foreground">
                No groups yet. Mark yourself available and run the matcher.
              </p>
            )}
          </section>
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-2xl font-black">Events</h2>
              <Link href="/events" className="text-sm font-semibold text-primary">
                View all
              </Link>
            </div>
            {sortedEvents.length ? (
              <div className="grid gap-3">
                {sortedEvents.slice(0, 3).map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <p className="rounded-md border bg-card p-5 text-sm text-muted-foreground">
                No events yet.
              </p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
