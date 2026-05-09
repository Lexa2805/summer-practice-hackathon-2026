"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Sparkles, UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addGroupMembers, createDirectConversation, getAvailableUsers, getTeammateRecommendations } from "@/lib/api";
import type { AvailableUser, Group, Profile, TeammateRecommendation } from "@/lib/types";

export function FindTeammateModal({
  group,
  currentUserProfile,
  isOpen,
  onClose,
  onAdded
}: {
  group: Group;
  currentUserProfile: Profile;
  isOpen: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<TeammateRecommendation[]>([]);
  const [candidateProfiles, setCandidateProfiles] = useState<Record<string, AvailableUser>>({});
  const [loading, setLoading] = useState(false);
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [messagingIds, setMessagingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setRecommendations([]);
      setError("");
      return;
    }

    async function fetchRecommendations() {
      setLoading(true);
      setError("");
      try {
        const today = new Date().toISOString().split("T")[0];
        const candidates = await getAvailableUsers(today, group.city || currentUserProfile.city);
        
        const existingMemberIds = new Set(group.members?.map((m) => m.id) || []);
        existingMemberIds.add(currentUserProfile.id);
        
        const filteredCandidates = candidates.filter((c) => !existingMemberIds.has(c.id));
        setCandidateProfiles(Object.fromEntries(filteredCandidates.map((candidate) => [candidate.id, candidate])));
        
        if (filteredCandidates.length === 0) {
          setLoading(false);
          return;
        }

        const data = await getTeammateRecommendations(
          { ...currentUserProfile, group_sport: group.sport_name },
          filteredCandidates as unknown as Record<string, unknown>[]
        );
        
        setRecommendations(data.recommendations || []);
      } catch (err) {
        setError("Failed to find teammate with AI.");
      } finally {
        setLoading(false);
      }
    }

    fetchRecommendations();
  }, [isOpen, group, currentUserProfile]);

  if (!isOpen) return null;

  async function handleAdd(userId: string) {
    setAddingIds((prev) => new Set(prev).add(userId));
    setError("");
    try {
      await addGroupMembers(group.id, [userId], currentUserProfile.id);
      setRecommendations((prev) => prev.filter((r) => r.user_id !== userId));
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add teammate.");
    } finally {
      setAddingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  }

  async function handleMessage(userId: string) {
    setMessagingIds((prev) => new Set(prev).add(userId));
    setError("");
    try {
      const conversation = await createDirectConversation(currentUserProfile.id, userId);
      onClose();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Teammate Match
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {error && <p className="mb-4 text-sm font-medium text-destructive">{error}</p>}
          
          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {loading ? (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 animate-pulse text-primary" />
                Finding best teammates...
              </p>
            ) : recommendations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No strong recommendations found yet.</p>
            ) : (
              recommendations.map((rec) => {
                const candidate = candidateProfiles[rec.user_id];
                const displayName = rec.full_name || candidate?.full_name || candidate?.username || "Player";
                return (
                <div key={rec.user_id} className="flex flex-col gap-2 rounded-md border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                        {candidate?.avatar_url ? (
                          <img src={candidate.avatar_url} alt={displayName} className="h-full w-full object-cover" />
                        ) : (
                          initials(displayName)
                        )}
                      </div>
                      <p className="truncate text-sm font-bold">{displayName}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        Compatibility: {rec.score}%
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={messagingIds.has(rec.user_id)}
                        onClick={() => handleMessage(rec.user_id)}
                      >
                        <MessageCircle className="mr-1 h-3 w-3" />
                        {messagingIds.has(rec.user_id) ? "Opening..." : "Message"}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={addingIds.has(rec.user_id)}
                        onClick={() => handleAdd(rec.user_id)}
                      >
                        <UserPlus className="mr-1 h-3 w-3" />
                        {addingIds.has(rec.user_id) ? "Adding..." : "Add to group"}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{rec.reason}</p>
                  {rec.shared_sports && rec.shared_sports.length > 0 && (
                    <p className="text-[10px] uppercase text-muted-foreground/70">
                      Plays: {rec.shared_sports.join(", ")}
                    </p>
                  )}
                </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
