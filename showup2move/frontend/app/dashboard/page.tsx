"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Dumbbell,
  Edit3,
  UserRound,
  UsersRound,
  XCircle
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { ErrorMessage } from "@/components/ui/error-state";
import { LoadingPage } from "@/components/ui/loading-skeleton";
import { getAvailability, getEvents, getGroups } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { EventItem, Group } from "@/lib/types";
import { useAuthProfile } from "@/lib/use-auth-profile";

type AvailabilitySnapshot = {
  user_id: string;
  date: string;
  is_available: boolean | null;
};

function todayLocal() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const { user, profile, loading, error } = useAuthProfile();
  const { t } = useI18n();
  const [groups, setGroups] = useState<Group[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySnapshot | null>(null);
  const [loadedAt, setLoadedAt] = useState(0);
  const [summaryErrors, setSummaryErrors] = useState({
    groups: "",
    events: "",
    availability: ""
  });

  const loadData = useCallback(async () => {
    if (!user) return;
    setSummaryErrors({ groups: "", events: "", availability: "" });

    const [groupsResult, eventsResult, availabilityResult] = await Promise.allSettled([
      getGroups(user.id),
      getEvents(user.id),
      getAvailability(user.id, todayLocal())
    ]);

    if (groupsResult.status === "fulfilled") {
      setGroups(groupsResult.value);
    } else {
      setSummaryErrors((value) => ({ ...value, groups: t("dashboard.couldNotLoadSummary") }));
    }

    if (eventsResult.status === "fulfilled") {
      setEvents(eventsResult.value);
    } else {
      setSummaryErrors((value) => ({ ...value, events: t("dashboard.couldNotLoadSummary") }));
    }

    if (availabilityResult.status === "fulfilled") {
      setAvailability(availabilityResult.value);
    } else {
      setSummaryErrors((value) => ({ ...value, availability: t("dashboard.couldNotLoadSummary") }));
    }

    setLoadedAt(Date.now());
  }, [t, user]);

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
        <ErrorMessage message={error || t("dashboard.profileRequired")} />
      </main>
    );
  }

  const upcomingEvents = events
    .filter((event) => event.event_time && new Date(event.event_time).getTime() >= loadedAt)
    .sort((first, second) => {
      return new Date(first.event_time || 0).getTime() - new Date(second.event_time || 0).getTime();
    });
  const sportsCount = profile.sports_preferences?.length || 0;
  const profileFields = [
    profile.full_name,
    profile.username,
    profile.description,
    profile.city,
    sportsCount > 0 ? String(sportsCount) : ""
  ];
  const profileCompleteness = Math.round((profileFields.filter(Boolean).length / profileFields.length) * 100);
  const availabilityValue = summaryErrors.availability
    ? "--"
    : availability?.is_available === true
      ? t("common.available")
      : availability?.is_available === false
        ? t("dashboard.unavailable")
        : t("dashboard.notAnswered");
  const AvailabilityIcon =
    availability?.is_available === true ? CheckCircle2 : availability?.is_available === false ? XCircle : Clock3;
  const availabilityHelp = summaryErrors.availability
    ? t("dashboard.couldNotLoadSummary")
    : availability?.is_available === true
      ? t("dashboard.availableHelp")
      : availability?.is_available === false
        ? t("dashboard.unavailableHelp")
        : t("dashboard.unansweredHelp");

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <PageHeader
        label={t("dashboard.label")}
        title={`${t("dashboard.welcome")}, ${profile.full_name?.split(" ")[0] || profile.username}`}
        subtitle={profile.city ? `${profile.city} ${t("dashboard.activeGroupsAndEvents")}` : t("dashboard.addCityToImprove")}
        action={
          <Link href="/profile">
            <Button variant="secondary">{t("dashboard.editProfile")}</Button>
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Dumbbell} label={t("dashboard.sports")} value={sportsCount} />
        <StatCard icon={UsersRound} label={t("dashboard.groups")} value={summaryErrors.groups ? "--" : groups.length} />
        <StatCard icon={CalendarDays} label={t("dashboard.upcomingEvents")} value={summaryErrors.events ? "--" : upcomingEvents.length} />
        <StatCard icon={AvailabilityIcon} label={t("dashboard.availability")} value={availabilityValue} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_380px]">
        <div className="space-y-6">
          <Card className="border-primary/20">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>{t("dashboard.profileSummary")}</CardTitle>
                  <CardDescription>{t("dashboard.profileSummaryDescription")}</CardDescription>
                </div>
                <Badge className="w-fit border-primary/30 bg-primary/10 text-primary">
                  {profileCompleteness}% {t("dashboard.complete")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-md border bg-background p-4">
                <p className="text-sm font-medium text-muted-foreground">{t("common.city")}</p>
                <p className="mt-1 font-bold">{profile.city || t("dashboard.addYourCity")}</p>
              </div>
              <div className="rounded-md border bg-background p-4">
                <p className="text-sm font-medium text-muted-foreground">{t("dashboard.sports")}</p>
                <p className="mt-1 font-bold">{sportsCount ? `${sportsCount} ${t("dashboard.selected")}` : t("dashboard.chooseSports")}</p>
              </div>
              <div className="rounded-md border bg-background p-4">
                <p className="text-sm font-medium text-muted-foreground">{t("nav.profile")}</p>
                <p className="mt-1 font-bold">{profile.description ? t("dashboard.profileReady") : t("dashboard.needsDetails")}</p>
              </div>
              <Link href="/profile" className="sm:col-span-3">
                <Button variant="outline" className="w-full sm:w-auto">
                  <Edit3 className="h-4 w-4" />
                  {t("dashboard.editProfile")}
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle>{t("dashboard.quickActions")}</CardTitle>
              <CardDescription>{t("dashboard.quickActionsDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Link href="/showup">
                <Button className="w-full justify-start">
                  <CheckCircle2 className="h-4 w-4" />
                  {t("dashboard.goToShowUp")}
                </Button>
              </Link>
              <Link href="/groups">
                <Button variant="outline" className="w-full justify-start">
                  <UsersRound className="h-4 w-4" />
                  {t("dashboard.viewGroups")}
                </Button>
              </Link>
              <Link href="/events">
                <Button variant="outline" className="w-full justify-start">
                  <CalendarDays className="h-4 w-4" />
                  {t("dashboard.viewEvents")}
                </Button>
              </Link>
              <Link href="/profile">
                <Button variant="outline" className="w-full justify-start">
                  <UserRound className="h-4 w-4" />
                  {t("dashboard.editProfile")}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.availabilityStatus")}</CardTitle>
              <CardDescription>{t("dashboard.availabilityStatusDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 rounded-md border bg-background p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                  <AvailabilityIcon className="h-5 w-5 text-primary" />
                </span>
                <div>
                  <p className="font-bold">{availabilityValue}</p>
                  <p className="text-sm text-muted-foreground">{availabilityHelp}</p>
                </div>
              </div>
              <Link href="/showup">
                <Button variant="outline" className="w-full">
                  <CheckCircle2 className="h-4 w-4" />
                  {t("dashboard.goToShowUp")}
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.upcomingEvents")}</CardTitle>
              <CardDescription>{t("dashboard.upcomingDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border bg-background p-4">
                <p className="text-3xl font-black">{summaryErrors.events ? "--" : upcomingEvents.length}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {summaryErrors.events
                    ? summaryErrors.events
                    : upcomingEvents.length
                      ? `${t("dashboard.next")}: ${upcomingEvents[0].title}`
                      : t("dashboard.noUpcomingEvents")}
                </p>
              </div>
              <Link href="/events">
                <Button variant="outline" className="w-full">
                  <CalendarDays className="h-4 w-4" />
                  {t("dashboard.viewEvents")}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
