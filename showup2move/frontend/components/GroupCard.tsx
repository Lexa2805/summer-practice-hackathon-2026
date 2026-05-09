"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDays, CalendarPlus, Crown, MapPin, MessageCircle, Sparkles, UsersRound, X, Trash2, UserPlus, Lightbulb } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AddMembersModal } from "@/components/AddMembersModal";
import { FindTeammateModal } from "@/components/FindTeammateModal";
import { ExplainMatchModal } from "@/components/ExplainMatchModal";
import { balanceTeams, checkAchievements, confirmParticipation, declineParticipation, deleteGroup, getCompatibilityScore } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { showToast } from "@/lib/toast";
import type { BalancedTeam, CompatibilityResult, Group, Profile, SkillLevel } from "@/lib/types";

export function GroupCard({
  group,
  currentUserId,
  currentUserProfile,
  onConfirmed
}: {
  group: Group;
  currentUserId?: string;
  currentUserProfile?: Profile | null;
  onConfirmed?: () => void;
}) {
  const [confirmed, setConfirmed] = useState(Boolean(group.current_user_confirmed));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [checkingCompatibility, setCheckingCompatibility] = useState(false);
  const [compatibility, setCompatibility] = useState<Record<string, CompatibilityResult>>({});
  const [isAddMembersOpen, setIsAddMembersOpen] = useState(false);
  const [isFindTeammateOpen, setIsFindTeammateOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [balancing, setBalancing] = useState(false);
  const [balancedTeams, setBalancedTeams] = useState<BalancedTeam[]>([]);
  const [balanceError, setBalanceError] = useState("");
  const [isExplainOpen, setIsExplainOpen] = useState(false);
  const { t } = useI18n();

  async function handleDelete() {
    if (!currentUserId || !window.confirm("Are you sure you want to delete this group?")) return;
    setDeleting(true);
    setError("");
    try {
      await deleteGroup(group.id, currentUserId);
      onConfirmed?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete group.");
      setDeleting(false);
    }
  }

  async function confirm() {
    if (!currentUserId) return;
    setSaving(true);
    setError("");
    try {
      await confirmParticipation(group.id, currentUserId);
      setConfirmed(true);
      onConfirmed?.();
      const achievementResult = await checkAchievements(currentUserId);
      achievementResult.unlocked_now?.forEach((item) =>
        showToast(`Achievement unlocked: ${item.title}`, "success")
      );
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

  async function checkCompatibility() {
    if (!currentUserProfile || !group.members?.length) return;
    setCheckingCompatibility(true);
    setError("");
    try {
      const currentSports =
        currentUserProfile.sports ||
        currentUserProfile.sports_preferences?.map((preference) => preference.sport_name).filter(Boolean) ||
        [];
      const currentSkill =
        currentUserProfile.sports_preferences?.find((preference) => preference.sport_name === group.sport_name)
          ?.skill_level || "intermediate";
      const currentPayload = {
        description: currentUserProfile.description,
        sports: currentSports,
        skill_level: currentSkill,
        city: currentUserProfile.city,
        availability: "today",
      };
      const candidates = group.members.filter((member) => member.id !== currentUserId).slice(0, 5);
      const results = await Promise.all(
        candidates.map(async (member) => {
          const result = await getCompatibilityScore(currentPayload, {
            description: member.description,
            sports: group.sport_name ? [group.sport_name] : [],
            skill_level: member.skill_level || "intermediate",
            city: member.city || group.city,
            availability: "today",
          });
          return [member.id, result] as const;
        })
      );
      setCompatibility((value) => ({ ...value, ...Object.fromEntries(results) }));
    } catch {
      setError("Could not load compatibility scores right now.");
    } finally {
      setCheckingCompatibility(false);
    }
  }

  async function runBalanceTeams() {
    if (!group.members?.length) {
      setBalanceError("Not enough members to balance teams.");
      return;
    }
    setBalancing(true);
    setBalanceError("");
    try {
      const players = group.members.map((member) => ({
        user_id: member.id,
        full_name: member.full_name || member.username || "Player",
        skill_level: (member.skill_level || "intermediate") as SkillLevel
      }));
      const result = await balanceTeams({
        sport: group.sport_name || "Sport",
        players,
        teams_count: 2
      });
      setBalancedTeams(result.teams || []);
    } catch (balanceError) {
      setBalanceError(balanceError instanceof Error ? balanceError.message : "Failed to balance teams.");
    } finally {
      setBalancing(false);
    }
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
                  {compatibility[member.id] ? (
                    <Badge className="ml-2 bg-primary/10 text-primary">
                      Compatibility: {compatibility[member.id].score}%
                    </Badge>
                  ) : null}
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
        {balancedTeams.length ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm font-semibold">Balanced teams</p>
            <div className="grid gap-3 md:grid-cols-2">
              {balancedTeams.map((team) => (
                <div key={team.name} className="rounded-md border bg-background p-3 text-sm">
                  <p className="font-semibold">
                    {team.name} (avg {team.average_skill})
                  </p>
                  <div className="mt-2 space-y-1 text-muted-foreground">
                    {team.players.map((player) => (
                      <p key={player.user_id}>
                        {player.full_name} - {player.skill_level}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {error ? <p className="mt-3 text-sm font-medium text-destructive">{error}</p> : null}
        {balanceError ? <p className="mt-3 text-sm font-medium text-destructive">{balanceError}</p> : null}
      </CardContent>
      <CardFooter className="grid gap-2 sm:grid-cols-2">
        <Button type="button" variant="outline" className="w-full sm:col-span-2" onClick={() => setIsExplainOpen(true)}>
          <Lightbulb className="mr-2 h-4 w-4 text-primary" />
          Explain match with AI
        </Button>
        {currentUserProfile && group.members?.some((member) => member.id !== currentUserId) ? (
          <Button type="button" variant="outline" disabled={checkingCompatibility} onClick={checkCompatibility}>
            <Sparkles className="h-4 w-4" />
            {checkingCompatibility ? "Checking..." : "Check compatibility"}
          </Button>
        ) : null}
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
        {currentUserId === group.captain_id ? (
          <Button type="button" variant="outline" className="w-full sm:col-span-2" onClick={() => setIsAddMembersOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add people
          </Button>
        ) : null}
        {currentUserProfile ? (
          <Button type="button" variant="outline" className="w-full sm:col-span-2" onClick={() => setIsFindTeammateOpen(true)}>
            <Sparkles className="mr-2 h-4 w-4 text-primary" />
            Find teammate with AI
          </Button>
        ) : null}
        {group.members?.length ? (
          <Button type="button" variant="outline" className="w-full sm:col-span-2" onClick={runBalanceTeams} disabled={balancing}>
            <Sparkles className="mr-2 h-4 w-4 text-primary" />
            {balancing ? "Balancing..." : t("balanceTeams")}
          </Button>
        ) : null}
        <Link href={`/events?group_id=${group.id}`} className="w-full sm:col-span-2">
          <Button className="w-full" variant="outline">
            <CalendarPlus className="mr-2 h-4 w-4" />
            {t("createEvent")}
          </Button>
        </Link>
        <Link href={`/groups/${group.id}/chat`} className="w-full sm:col-span-2">
          <Button className="w-full" variant="secondary">
            <MessageCircle className="mr-2 h-4 w-4" />
            {t("openChat")}
          </Button>
        </Link>
        {currentUserId === group.captain_id ? (
          <Button type="button" variant="destructive" className="w-full sm:col-span-2" disabled={deleting} onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            {deleting ? "Deleting..." : "Delete group"}
          </Button>
        ) : null}
      </CardFooter>

      {currentUserId && (
        <AddMembersModal
          groupId={group.id}
          userId={currentUserId}
          isOpen={isAddMembersOpen}
          onClose={() => setIsAddMembersOpen(false)}
          onAdded={() => {
            setIsAddMembersOpen(false);
            onConfirmed?.();
          }}
        />
      )}

      {currentUserProfile && (
        <FindTeammateModal
          group={group}
          currentUserProfile={currentUserProfile}
          isOpen={isFindTeammateOpen}
          onClose={() => setIsFindTeammateOpen(false)}
          onAdded={() => {
            setIsFindTeammateOpen(false);
            onConfirmed?.();
          }}
        />
      )}

      {isExplainOpen && (
        <ExplainMatchModal
          groupId={group.id}
          groupName={group.sport_name}
          onClose={() => setIsExplainOpen(false)}
        />
      )}
    </Card>
  );
}
