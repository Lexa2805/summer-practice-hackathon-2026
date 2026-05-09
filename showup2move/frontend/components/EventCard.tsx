"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarClock, CloudSun, MessageCircle, MapPin, Trash2, UsersRound, WalletCards, UserCheck, UserPlus, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InviteModal } from "@/components/InviteModal";
import { CaptainPlanModal } from "@/components/CaptainPlanModal";
import { getEventCalendarUrl, getWeatherRecommendation, updateEventParticipation } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { EventItem, WeatherRecommendation } from "@/lib/types";

export function EventCard({
  event,
  currentUserId,
  city,
  showWeather = false,
  canDelete = false,
  deleting = false,
  onDelete
}: {
  event: EventItem;
  currentUserId?: string;
  city?: string;
  showWeather?: boolean;
  canDelete?: boolean;
  deleting?: boolean;
  onDelete?: (event: EventItem) => void;
}) {
  const { t } = useI18n();
  const when = event.event_time ? new Date(event.event_time).toLocaleString() : "Time pending";
  const isPast = event.event_time ? new Date(event.event_time) < new Date() : false;
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [weather, setWeather] = useState<WeatherRecommendation | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState("");
  const [participationLoading, setParticipationLoading] = useState(false);
  const [isCaptainPlanOpen, setIsCaptainPlanOpen] = useState(false);
  const canExportCalendar = Boolean(event.event_time);

  const isUserAttending = event.participants?.some(
    (p) => p.user_id === currentUserId && p.status === "attending"
  ) || event.created_by === currentUserId;

  const participantCount = event.participant_count || 0;

  const sportName = event.sport_name || "";
  const isOutdoor = new Set(["running", "football", "tennis"]).has(sportName.toLowerCase());

  useEffect(() => {
    if (event.weather_summary) {
      setWeather({
        city: city || "",
        sport: sportName,
        recommendation: event.weather_summary || "",
        score: event.weather_score || 0,
        summary: event.weather_summary || ""
      });
    }
  }, [city, event.weather_score, event.weather_summary, sportName]);

  async function downloadCalendar() {
    if (!canExportCalendar) {
      setCalendarError("Add an event time before exporting to calendar.");
      return;
    }
    setCalendarError("");
    setCalendarLoading(true);
    try {
      const response = await fetch(getEventCalendarUrl(event.id));
      if (!response.ok) {
        throw new Error("Calendar export failed");
      }
      const ics = await response.text();
      const blob = new Blob([ics], { type: "text/calendar" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${event.title || "showup2move-event"}.ics`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setCalendarError("Failed to export calendar.");
    } finally {
      setCalendarLoading(false);
    }
  }

  async function loadWeather() {
    setWeatherError("");
    if (!city) {
      setWeatherError("Add a city in your profile to check weather.");
      return;
    }
    if (!sportName) {
      setWeatherError("Sport is required for weather checks.");
      return;
    }

    setWeatherLoading(true);
    try {
      const date = event.event_time
        ? new Date(event.event_time).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);
      const result = await getWeatherRecommendation(city, sportName, date);
      setWeather(result);
    } catch (weatherFetchError) {
      setWeatherError(
        weatherFetchError instanceof Error
          ? weatherFetchError.message
          : "Failed to fetch weather recommendation."
      );
    } finally {
      setWeatherLoading(false);
    }
  }

  async function toggleParticipation() {
    if (!currentUserId) return;
    setParticipationLoading(true);
    try {
      const newStatus = isUserAttending ? "declined" : "attending";
      await updateEventParticipation(event.id, currentUserId, newStatus);
      // Reload the page to refresh event data
      window.location.reload();
    } catch (error) {
      console.error("Failed to update participation:", error);
    } finally {
      setParticipationLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle>{event.title}</CardTitle>
          <div className="flex flex-wrap justify-end gap-2">
            <Badge className="border-accent/30 bg-accent/10 text-foreground">
              {event.sport_name || "Sport"}
            </Badge>
            {event.event_time ? (
              <Badge className="bg-muted text-foreground">{isPast ? "Past" : "Upcoming"}</Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          {event.location_name || "Location pending"}
        </p>
        <p className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" />
          {when}
        </p>
        <p className="flex items-center gap-2">
          <WalletCards className="h-4 w-4 text-primary" />
          {event.price_estimate ? `${event.price_estimate} RON estimate` : "Free or split later"}
        </p>
        <p className="flex items-center gap-2">
          <UsersRound className="h-4 w-4 text-primary" />
          {participantCount} {participantCount === 1 ? t("participant") : t("participants")}
        </p>
        {event.group_id ? (
          <p className="flex items-center gap-2 text-sm">
            Group event
            {event.group_id ? (
              <Link
                href={`/groups/${event.group_id}/chat`}
                className="ml-1 font-medium text-primary hover:underline"
              >
                (open group chat)
              </Link>
            ) : null}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2 pt-1">
          {currentUserId && event.group_captain_id === currentUserId && event.group_id ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCaptainPlanOpen(true)}
            >
              <Sparkles className="h-4 w-4 text-primary" />
              Generate captain plan
            </Button>
          ) : null}
          {currentUserId && event.created_by !== currentUserId ? (
            <Button
              type="button"
              variant={isUserAttending ? "default" : "secondary"}
              size="sm"
              disabled={participationLoading}
              onClick={toggleParticipation}
            >
              {isUserAttending ? (
                <>
                  <UserCheck className="h-4 w-4" />
                  {participationLoading ? "Updating..." : t("attending")}
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  {participationLoading ? "Joining..." : t("joinEvent")}
                </>
              )}
            </Button>
          ) : null}
          <Link href={`/events/${event.id}/chat`} className="inline-flex">
            <Button variant="secondary" size="sm">
              <MessageCircle className="h-4 w-4" />
              {t("openChat")}
            </Button>
          </Link>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={calendarLoading || !canExportCalendar}
            onClick={downloadCalendar}
          >
            <CalendarClock className="h-4 w-4" />
            {calendarLoading ? "Exporting..." : t("addToCalendar")}
          </Button>
          {currentUserId ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setInviteOpen(true)}>
              <UsersRound className="h-4 w-4" />
              {t("inviteFriend")}
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={deleting}
              onClick={() => onDelete?.(event)}
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? "Deleting..." : t("delete")}
            </Button>
          ) : null}
        </div>
        {calendarError ? <p className="text-sm font-medium text-destructive">{calendarError}</p> : null}
        {showWeather && isOutdoor ? (
          <div className="rounded-md border border-primary/20 bg-muted/20 p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 font-semibold">
                <CloudSun className="h-4 w-4 text-primary" />
                {t("weather")}
              </span>
              <Button type="button" variant="outline" size="sm" disabled={weatherLoading} onClick={loadWeather}>
                {weatherLoading ? "Checking..." : "Check"}
              </Button>
            </div>
            {weather ? (
              <div className="mt-2 space-y-1">
                <p className="font-semibold">{weather.recommendation}</p>
                <p className="text-xs text-muted-foreground">{weather.summary}</p>
                <p className="text-xs font-semibold text-primary">Score: {weather.score}</p>
              </div>
            ) : null}
            {weatherError ? <p className="mt-2 text-xs font-semibold text-destructive">{weatherError}</p> : null}
          </div>
        ) : null}
      </CardContent>
      {currentUserId ? (
        <InviteModal
          event={event}
          currentUserId={currentUserId}
          isOpen={inviteOpen}
          onClose={() => setInviteOpen(false)}
        />
      ) : null}
      {currentUserId && event.group_id && isCaptainPlanOpen ? (
        <CaptainPlanModal
          groupId={event.group_id}
          eventId={event.id}
          eventTitle={event.title}
          onClose={() => setIsCaptainPlanOpen(false)}
        />
      ) : null}
    </Card>
  );
}
