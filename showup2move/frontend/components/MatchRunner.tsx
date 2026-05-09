"use client";

import { useState } from "react";
import { Shuffle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAvailability, runMatching } from "@/lib/api";

function todayLocal() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function MatchRunner({
  userId,
  city,
  hasSports = true,
  onMatched
}: {
  userId?: string;
  city?: string;
  hasSports?: boolean;
  onMatched?: () => void;
}) {
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setLoading(true);
    setResult("");
    setError("");
    if (!hasSports) {
      setError("Select at least one sport in your profile before running the matcher.");
      setLoading(false);
      return;
    }
    try {
      if (userId) {
        const availability = await getAvailability(userId, todayLocal());
        if (availability.is_available !== true) {
          setError("Mark yourself available today before running the matcher.");
          return;
        }
      }
      const data = await runMatching({
        date: todayLocal(),
        city,
        max_distance_km: 10
      });
      setResult(
        data.created_groups > 0
          ? `Matcher created ${data.created_groups} groups.`
          : data.message || "Not enough available players yet. Invite more friends or try another sport."
      );
      onMatched?.();
    } catch (matchError) {
      setError(matchError instanceof Error ? matchError.message : "Could not run matcher.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle>Smart matching</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Runs today&apos;s availability through sport group sizing and captain selection.
        </p>
        <Button onClick={run} disabled={loading}>
          <Shuffle className="h-4 w-4" />
          {loading ? "Matching..." : "Run matcher"}
        </Button>
        {result ? <p className="text-sm font-medium">{result}</p> : null}
        {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
