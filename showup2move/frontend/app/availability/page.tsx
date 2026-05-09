"use client";

import { AvailabilityCard } from "@/components/AvailabilityCard";
import { MatchRunner } from "@/components/MatchRunner";
import { useAuthProfile } from "@/lib/use-auth-profile";

export default function AvailabilityPage() {
  const { user, profile, loading, error } = useAuthProfile();

  if (loading) {
    return <main className="mx-auto max-w-6xl px-4 py-8 text-muted-foreground">Loading ShowUpToday...</main>;
  }

  if (error || !user) {
    return <main className="mx-auto max-w-6xl px-4 py-8 text-destructive">{error || "Login required."}</main>;
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[0.85fr_1.15fr]">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Daily intent</p>
        <h1 className="mt-2 text-4xl font-black">ShowUpToday?</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          One answer gives the backend enough signal to build same-day groups by sport.
        </p>
      </div>
      <div className="space-y-6">
        <AvailabilityCard userId={user.id} />
        <MatchRunner
          userId={user.id}
          city={profile?.city}
          hasSports={Boolean(profile?.sports_preferences?.length)}
        />
      </div>
    </main>
  );
}
