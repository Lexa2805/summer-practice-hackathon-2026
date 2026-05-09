"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAvailability, setAvailability } from "@/lib/api";

export function AvailabilityCard({ userId }: { userId: string }) {
  const [status, setStatus] = useState<"yes" | "no" | "idle">("idle");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const today = useMemo(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
  }, []);

  useEffect(() => {
    async function loadStatus() {
      try {
        const saved = await getAvailability(userId, today);
        if (saved.is_available === true) setStatus("yes");
        if (saved.is_available === false) setStatus("no");
      } catch {
        setStatus("idle");
      }
    }

    loadStatus();
  }, [today, userId]);

  async function respond(isAvailable: boolean) {
    setLoading(true);
    setMessage("");
    setError("");
    try {
      await setAvailability({
        user_id: userId,
        date: today,
        is_available: isAvailable,
        preferred_time: "evening"
      });
      setStatus(isAvailable ? "yes" : "no");
      setMessage(isAvailable ? "You are available today." : "You are marked unavailable today.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save availability.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="text-2xl">ShowUpToday?</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Mark today and the matcher can place you in a group for sports you already like.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Button
            className="h-14"
            disabled={loading}
            onClick={() => respond(true)}
            variant={status === "yes" ? "default" : "outline"}
          >
            <Check className="h-5 w-5" />
            Yes
          </Button>
          <Button
            className="h-14"
            disabled={loading}
            onClick={() => respond(false)}
            variant={status === "no" ? "destructive" : "outline"}
          >
            <X className="h-5 w-5" />
            No
          </Button>
        </div>
        {status !== "idle" ? (
          <p className="rounded-md bg-muted px-3 py-2 text-sm font-medium">
            Saved for {today}: {status === "yes" ? "available" : "not available"}.
          </p>
        ) : null}
        {message ? <p className="text-sm font-medium text-primary">{message}</p> : null}
        {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
