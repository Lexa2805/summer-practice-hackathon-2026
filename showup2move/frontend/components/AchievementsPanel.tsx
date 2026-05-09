"use client";

import { useEffect, useMemo, useState } from "react";
import { Award, Lock, Trophy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { getAchievements } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Achievement } from "@/lib/types";

export function AchievementsPanel({ userId }: { userId: string }) {
  const { t } = useI18n();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await getAchievements(userId);
        if (!active) return;
        setAchievements(data.achievements || []);
        setTotalPoints(data.total_points || 0);
      } catch {
        if (active) {
          setAchievements([]);
          setTotalPoints(0);
          setError(t("profilePage.unavailableAchievements"));
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [t, userId]);

  const sortedAchievements = useMemo(() => {
    return [...achievements].sort((first, second) => {
      if (first.unlocked !== second.unlocked) return first.unlocked ? -1 : 1;
      return (second.points || 0) - (first.points || 0);
    });
  }, [achievements]);

  const unlockedCount = achievements.filter((achievement) => achievement.unlocked).length;
  const lockedCount = Math.max(achievements.length - unlockedCount, 0);

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              {t("profilePage.achievements")}
            </CardTitle>
            <CardDescription>{t("profilePage.progressDescription")}</CardDescription>
          </div>
          <Badge className="shrink-0 border-primary/30 bg-primary/10 text-primary">{totalPoints} pts</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            <LoadingSkeleton className="h-16 w-full" />
            <LoadingSkeleton className="h-16 w-full" />
            <LoadingSkeleton className="h-16 w-full" />
          </div>
        ) : error ? (
          <div className="rounded-md border bg-background p-4">
            <p className="text-sm font-medium">{error}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("profilePage.profileStillWorks")}</p>
          </div>
        ) : !sortedAchievements.length ? (
          <div className="rounded-md border bg-background p-4">
            <p className="text-sm font-medium">{t("profilePage.noAchievements")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("profilePage.milestonesAppear")}
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-md border bg-background p-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">{t("profilePage.unlocked")}</p>
                <p className="mt-1 text-2xl font-black">{unlockedCount}</p>
              </div>
              <div className="rounded-md border bg-background p-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">{t("profilePage.locked")}</p>
                <p className="mt-1 text-2xl font-black">{lockedCount}</p>
              </div>
            </div>
            <div className="grid gap-3">
              {sortedAchievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`flex items-start gap-3 rounded-md border bg-background p-3 ${
                    achievement.unlocked ? "border-primary/30" : ""
                  }`}
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                    {achievement.unlocked ? (
                      <Award className="h-4 w-4 text-primary" />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{achievement.title}</p>
                      {achievement.points ? (
                        <span className="text-xs font-semibold text-primary">{achievement.points} pts</span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {achievement.description || (achievement.unlocked ? t("profilePage.unlockedMilestone") : t("profilePage.achievementLocked"))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
