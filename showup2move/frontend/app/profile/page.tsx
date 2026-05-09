"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ProfileForm } from "@/components/ProfileForm";
import { getSports } from "@/lib/api";
import type { Sport } from "@/lib/types";
import { useAuthProfile } from "@/lib/use-auth-profile";

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading, error } = useAuthProfile({ requireProfile: false });
  const [sports, setSports] = useState<Sport[]>([]);
  const [sportsError, setSportsError] = useState("");

  useEffect(() => {
    async function loadSports() {
      try {
        setSports(await getSports());
      } catch (loadError) {
        setSportsError(loadError instanceof Error ? loadError.message : "Could not load sports.");
      }
    }

    loadSports();
  }, []);

  if (loading) {
    return <main className="mx-auto max-w-4xl px-4 py-8 text-muted-foreground">Checking account...</main>;
  }

  if (error || !user) {
    return <main className="mx-auto max-w-4xl px-4 py-8 text-destructive">{error || "Login required."}</main>;
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Sports identity</p>
        <h1 className="mt-2 text-4xl font-black">Profile</h1>
        {!profile ? (
          <p className="mt-2 text-muted-foreground">Create your profile before opening the dashboard.</p>
        ) : null}
      </div>
      {sportsError ? (
        <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {sportsError}
        </p>
      ) : null}
      <ProfileForm userId={user.id} profile={profile} sports={sports} onSaved={() => router.push("/dashboard")} />
    </main>
  );
}
