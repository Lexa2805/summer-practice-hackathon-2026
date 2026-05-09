"use client";

import { useState } from "react";
import { MessageCircle, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createDirectConversation, getAvailableUsers, getTeammateRecommendations } from "@/lib/api";
import type { AvailableUser, Profile, TeammateRecommendation } from "@/lib/types";

function todayLocal() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function SmartRecommendations({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<TeammateRecommendation[]>([]);
  const [candidateProfiles, setCandidateProfiles] = useState<Record<string, AvailableUser>>({});
  const [loading, setLoading] = useState(false);
  const [messagingIds, setMessagingIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadRecommendations() {
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const availableUsers = await getAvailableUsers(todayLocal(), profile.city);
      const candidates = availableUsers.filter((user) => user.id !== profile.id);
      setCandidateProfiles(Object.fromEntries(candidates.map((candidate) => [candidate.id, candidate])));
      if (!candidates.length) {
        setRecommendations([]);
        setMessage("No available teammates in your city yet.");
        return;
      }

      const currentSports =
        profile.sports ||
        profile.sports_preferences?.map((preference) => preference.sport_name).filter(Boolean) ||
        [];
      const result = await getTeammateRecommendations(
        {
          id: profile.id,
          description: profile.description,
          sports: currentSports,
          skill_level: profile.sports_preferences?.[0]?.skill_level || "intermediate",
          city: profile.city,
          availability: "today",
        },
        candidates.map((candidate) => ({
          id: candidate.id,
          full_name: candidate.full_name,
          description: candidate.description,
          sports: candidate.sports || [],
          skill_level: candidate.skill_level || "intermediate",
          city: candidate.city,
          availability: candidate.availability || "today",
        }))
      );
      setRecommendations(result.recommendations || []);
      if (!result.recommendations?.length) {
        setMessage("No strong teammate recommendations yet.");
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load teammate recommendations.");
    } finally {
      setLoading(false);
    }
  }

  async function handleMessage(userId: string) {
    setMessagingIds((prev) => new Set(prev).add(userId));
    setError("");
    try {
      const conversation = await createDirectConversation(profile.id, userId);
      router.push(`/messages/${conversation.id}`);
    } catch {
      setError("Could not start conversation.");
    } finally {
      setMessagingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
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
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle>Smart teammate recommendations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Find nearby available players with matching sports and compatible skill levels.
        </p>
        <Button type="button" onClick={loadRecommendations} disabled={loading}>
          <Sparkles className="h-4 w-4" />
          {loading ? "Finding teammates..." : "Find teammates"}
        </Button>
        {recommendations.length ? (
          <div className="space-y-3">
            {recommendations.map((recommendation) => {
              const candidate = candidateProfiles[recommendation.user_id];
              const displayName = recommendation.full_name || candidate?.full_name || candidate?.username || "Player";
              return (
              <div key={recommendation.user_id} className="rounded-md border bg-background p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                      {candidate?.avatar_url ? (
                        <img src={candidate.avatar_url} alt={displayName} className="h-full w-full object-cover" />
                      ) : (
                        initials(displayName)
                      )}
                    </div>
                    <p className="truncate font-semibold">{displayName}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                      {recommendation.score}%
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={messagingIds.has(recommendation.user_id)}
                      onClick={() => handleMessage(recommendation.user_id)}
                    >
                      <MessageCircle className="h-3 w-3" />
                      {messagingIds.has(recommendation.user_id) ? "Opening..." : "Message"}
                    </Button>
                  </div>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{recommendation.reason}</p>
                {recommendation.shared_sports?.length ? (
                  <p className="mt-1 text-xs font-medium text-muted-foreground">
                    Shared: {recommendation.shared_sports.join(", ")}
                  </p>
                ) : null}
              </div>
              );
            })}
          </div>
        ) : null}
        {message ? <p className="text-sm font-medium text-muted-foreground">{message}</p> : null}
        {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
