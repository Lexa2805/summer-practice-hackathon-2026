"use client";

import { useEffect, useState } from "react";
import { Award, Lock } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAchievements } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Achievement } from "@/lib/types";

export function AchievementsPanel({ userId }: { userId: string }) {
    const { t } = useI18n();
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [totalPoints, setTotalPoints] = useState(0);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;
        async function load() {
            setError("");
            try {
                const data = await getAchievements(userId);
                if (!active) return;
                setAchievements(data.achievements || []);
                setTotalPoints(data.total_points || 0);
            } catch (loadError) {
                if (active) setError(loadError instanceof Error ? loadError.message : "Failed to fetch achievements.");
            }
        }

        load();
        return () => {
            active = false;
        };
    }, [userId]);

    return (
        <Card className="border-primary/20">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>{t("achievements")}</span>
                    <span className="text-sm text-muted-foreground">{totalPoints} pts</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
                {!achievements.length ? (
                    <p className="text-sm text-muted-foreground">No achievements yet.</p>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                        {achievements.map((achievement) => (
                            <div
                                key={achievement.id}
                                className="flex items-start gap-3 rounded-md border bg-background p-3"
                            >
                                <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                                    {achievement.unlocked ? (
                                        <Award className="h-4 w-4 text-primary" />
                                    ) : (
                                        <Lock className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </span>
                                <div>
                                    <p className="text-sm font-semibold">
                                        {achievement.title} {achievement.points ? `(${achievement.points} pts)` : ""}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {achievement.description || "Achievement locked"}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
