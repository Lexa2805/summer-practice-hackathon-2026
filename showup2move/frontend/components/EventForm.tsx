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
        showToast(`${t("errors.achievementUnlocked")} ${item.title}`, "success")
      );
      onCreated?.();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : t("eventsPage.failedCreate"));
    }
  }

  async function checkWeather() {
    setWeatherError("");
    setWeather(null);
    const sport = sports.find((item) => item.id === sportId);
    const selectedSport = sport?.name || "";
    const eventDate = time ? time.slice(0, 10) : new Date().toISOString().slice(0, 10);

    if (!city) {
      setWeatherError(t("eventsPage.addCityWeather"));
      return;
    }

    if (!selectedSport) {
      setWeatherError(t("eventsPage.selectSportWeather"));
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
          : t("eventsPage.failedWeather")
      );
    } finally {
      setWeatherLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("eventsPage.createEvent")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t("eventsPage.title")}</Label>
            <Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sport">{t("common.sport")}</Label>
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
            <Label htmlFor="group">{t("eventsPage.groupOptional")}</Label>
            <select
              id="group"
              value={groupId}
              onChange={(event) => setGroupId(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">{t("eventsPage.noGroupIndependent")}</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.sport_name || t("groupsPage.matchedGroup")} - {group.city || t("eventsPage.groupEvent")}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {t("eventsPage.groupHelp")}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">{t("eventsPage.location")}</Label>
            <Input id="location" value={location} onChange={(event) => setLocation(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time">{t("eventsPage.eventTime")}</Label>
            <Input id="time" type="datetime-local" value={time} onChange={(event) => setTime(event.target.value)} />
          </div>
          <div className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">{t("eventsPage.weather")}</p>
                <p className="text-xs text-muted-foreground">
                  {city ? `${t("common.city")}: ${city}` : t("eventsPage.weatherHelpNoCity")}
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" disabled={weatherLoading} onClick={checkWeather}>
                {weatherLoading ? t("common.checking") : t("eventsPage.checkWeather")}
              </Button>
            </div>
            {weather ? (
              <div className="mt-3 rounded-md bg-background p-3 text-sm">
                <p className="font-semibold">{weather.recommendation}</p>
                <p className="text-xs text-muted-foreground">{weather.summary}</p>
                <p className="mt-1 text-xs font-semibold text-primary">{t("common.score")}: {weather.score}</p>
              </div>
            ) : null}
            {weatherError ? <p className="mt-2 text-xs font-semibold text-destructive">{weatherError}</p> : null}
          </div>
          <Button type="submit" disabled={!sportId}>
            <Plus className="h-4 w-4" />
            {t("eventsPage.createEvent")}
          </Button>
          {saved ? <p className="text-sm font-medium text-primary">{t("eventsPage.eventCreated")}</p> : null}
          {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
        </form>
      </CardContent>
    </Card>
  );
}
