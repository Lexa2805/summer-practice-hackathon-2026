"use client";

import { FormEvent, useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkAchievements, createEvent, getWeatherRecommendation } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { showToast } from "@/lib/toast";
import type { Group, Sport, WeatherRecommendation } from "@/lib/types";

export function EventForm({
  sports,
  groups = [],
  userId,
  city,
  preselectedGroupId = "",
  onCreated
}: {
  sports: Sport[];
  groups?: Group[];
  userId: string;
  city?: string;
  preselectedGroupId?: string;
  onCreated?: () => void;
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState("Pickup game");
  const [sportId, setSportId] = useState(sports[0]?.id || "");
  const [groupId, setGroupId] = useState(preselectedGroupId);
  const [location, setLocation] = useState("Local sports court");
  const [time, setTime] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [weather, setWeather] = useState<WeatherRecommendation | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState("");

  // Sync sport default when sports list loads.
  useEffect(() => {
    if ((!sportId || !sports.some((sport) => sport.id === sportId)) && sports[0]?.id) setSportId(sports[0].id);
  }, [sportId, sports]);

  // Sync preselected group when the prop or groups list arrives.
  useEffect(() => {
    if (preselectedGroupId && groups.some((group) => group.id === preselectedGroupId)) {
      setGroupId(preselectedGroupId);
    }
  }, [preselectedGroupId, groups]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);
    setError("");
    try {
      const sport = sports.find((item) => item.id === sportId);
      await createEvent({
        title,
        sport_id: sportId,
        sport_name: sport?.name,
        group_id: groupId || null,
        created_by: userId,
        location_name: location,
        event_time: time ? new Date(time).toISOString() : null,
        price_estimate: 0,
        weather_summary: weather?.summary || null,
        weather_score: weather?.score ?? 0
      });
      setSaved(true);
      const achievementResult = await checkAchievements(userId);
      achievementResult.unlocked_now?.forEach((item) =>
        showToast(`Achievement unlocked: ${item.title}`, "success")
      );
      onCreated?.();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create event.");
    }
  }

  async function checkWeather() {
    setWeatherError("");
    setWeather(null);
    const sport = sports.find((item) => item.id === sportId);
    const selectedSport = sport?.name || "";
    const eventDate = time ? time.slice(0, 10) : new Date().toISOString().slice(0, 10);

    if (!city) {
      setWeatherError("Add a city in your profile to check weather.");
      return;
    }

    if (!selectedSport) {
      setWeatherError("Select a sport to check weather.");
      return;
    }

    setWeatherLoading(true);
    try {
      const result = await getWeatherRecommendation(city, selectedSport, eventDate);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("createEvent")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sport">Sport</Label>
            <select
              id="sport"
              value={sportId}
              onChange={(event) => setSportId(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {sports.map((sport) => (
                <option key={sport.id} value={sport.id}>
                  {sport.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="group">Group (optional)</Label>
            <select
              id="group"
              value={groupId}
              onChange={(event) => setGroupId(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">No group — independent event</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.sport_name || "Matched group"} — {group.city || "group event"}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Linking to a group notifies its members and connects the event chat to the group.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" value={location} onChange={(event) => setLocation(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time">Event time</Label>
            <Input id="time" type="datetime-local" value={time} onChange={(event) => setTime(event.target.value)} />
          </div>
          <div className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">{t("weather")}</p>
                <p className="text-xs text-muted-foreground">
                  {city ? `City: ${city}` : "Add a city to your profile to enable checks."}
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" disabled={weatherLoading} onClick={checkWeather}>
                {weatherLoading ? "Checking..." : "Check weather"}
              </Button>
            </div>
            {weather ? (
              <div className="mt-3 rounded-md bg-background p-3 text-sm">
                <p className="font-semibold">{weather.recommendation}</p>
                <p className="text-xs text-muted-foreground">{weather.summary}</p>
                <p className="mt-1 text-xs font-semibold text-primary">Score: {weather.score}</p>
              </div>
            ) : null}
            {weatherError ? <p className="mt-2 text-xs font-semibold text-destructive">{weatherError}</p> : null}
          </div>
          <Button type="submit" disabled={!sportId}>
            <Plus className="h-4 w-4" />
            {t("createEvent")}
          </Button>
          {saved ? <p className="text-sm font-medium text-primary">Event created.</p> : null}
          {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
        </form>
      </CardContent>
    </Card>
  );
}
