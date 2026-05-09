"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDays, Crown, MapPin, MessageCircle, UsersRound, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { confirmParticipation, declineParticipation } from "@/lib/api";
import type { Group } from "@/lib/types";

export function GroupCard({
  group,
  currentUserId,
  onConfirmed
}: {
  group: Group;
  currentUserId?: string;
  onConfirmed?: () => void;
}) {
  const [confirmed, setConfirmed] = useState(Boolean(group.current_user_confirmed));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    if (!currentUserId) return;
    setSaving(true);
    setError("");
    try {
      await confirmParticipation(group.id, currentUserId);
      setConfirmed(true);
      onConfirmed?.();
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : "Could not confirm participation.");
    } finally {
      setSaving(false);
    }
  }

  async function decline() {
    if (!currentUserId) return;
    setSaving(true);
    setError("");
    try {
      await declineParticipation(group.id, currentUserId);
      setConfirmed(false);
      onConfirmed?.();
    } catch (declineError) {
      setError(declineError instanceof Error ? declineError.message : "Could not decline participation.");
    } finally {
      setSaving(false);
    }
  }

  function initials(name?: string) {
    return (name || "Player")
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{group.sport_name || "Matched group"}</CardTitle>
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Crown className="h-4 w-4 text-accent" />
              {group.captain_name || group.captain_id || "Captain pending"}
            </p>
          </div>
          <Badge className="bg-muted text-foreground">{group.status}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 text-sm font-medium sm:grid-cols-3">
          <span className="flex items-center gap-2">
            <UsersRound className="h-4 w-4 text-primary" />
            {group.member_count || group.members?.length || 0} members
          </span>
          {group.match_date ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              {group.match_date}
            </span>
          ) : null}
          {group.city ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {group.city}
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Your status: {confirmed ? "confirmed" : "waiting for confirmation"}
        </p>
        <div className="mt-4 flex -space-x-2">
          {(group.members || []).slice(0, 5).map((member) => (
            <div
              key={member.id}
              className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-card bg-secondary text-xs font-bold text-secondary-foreground"
              title={member.full_name}
            >
              {member.avatar_url ? (
                <img src={member.avatar_url} alt={member.full_name} className="h-full w-full object-cover" />
              ) : (
                initials(member.full_name)
              )}
            </div>
          ))}
        </div>
        {group.members?.length ? (
          <div className="mt-4 space-y-2">
            {group.members.slice(0, 6).map((member) => (
              <div key={member.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">
                  {member.full_name || member.username}
                  {member.id === group.captain_id ? <Crown className="ml-2 inline h-3.5 w-3.5 text-accent" /> : null}
                </span>
                <span className="shrink-0 text-muted-foreground">
                  {member.skill_level || "intermediate"} - {member.confirmed ? "confirmed" : "pending"}
                </span>
              </div>
            ))}
          </div>
        ) : null}
        {group.explanations?.length ? (
          <div className="mt-4 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            {group.explanations.slice(0, 3).map((explanation) => (
              <p key={explanation}>{explanation}</p>
            ))}
          </div>
        ) : null}
        {error ? <p className="mt-3 text-sm font-medium text-destructive">{error}</p> : null}
      </CardContent>
      <CardFooter className="grid gap-2 sm:grid-cols-2">
        {currentUserId && !confirmed ? (
          <Button onClick={confirm} disabled={saving}>
            {saving ? "Confirming..." : "Confirm participation"}
          </Button>
        ) : null}
        {currentUserId ? (
          <Button onClick={decline} disabled={saving} variant="outline">
            <X className="h-4 w-4" />
            {saving ? "Saving..." : "Decline"}
          </Button>
        ) : null}
        <Link href="/chat" className="w-full sm:col-span-2">
          <Button className="w-full" variant="secondary">
            <MessageCircle className="h-4 w-4" />
            Open chat
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
