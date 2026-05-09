"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDays, CalendarPlus, ChevronDown, Crown, Lightbulb, MapPin, MessageCircle, MoreHorizontal, Sparkles, Trash2, UserPlus, UsersRound, X } from "lucide-react";

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
  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false);
  const { t } = useI18n();
  const isCaptain = currentUserId === group.captain_id;
  const hasCompatibilityCandidates = Boolean(
    currentUserProfile && group.members?.some((member) => member.id !== currentUserId)
  );
  const hasMembers = Boolean(group.members?.length);

  async function handleDelete() {
    if (!currentUserId || !window.confirm(t("groupsPage.confirmDelete"))) return;
    setDeleting(true);
    setError("");
    try {
      await deleteGroup(group.id, currentUserId);
      onConfirmed?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("groupsPage.failedDelete"));
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
        showToast(`${t("errors.achievementUnlocked")} ${item.title}`, "success")
      );
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : t("groupsPage.couldNotConfirm"));
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
      setError(declineError instanceof Error ? declineError.message : t("groupsPage.couldNotDecline"));
    } finally {
      setSaving(false);
    }
  }

  function initials(name?: string) {
    return (name || t("common.player"))
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
      setError(t("groupsPage.couldNotCompatibility"));
    } finally {
      setCheckingCompatibility(false);
    }
  }

  async function runBalanceTeams() {
    if (!group.members?.length) {
      setBalanceError(t("groupsPage.notEnoughBalance"));
      return;
    }
    setBalancing(true);
    setBalanceError("");
    try {
      const players = group.members.map((member) => ({
        user_id: member.id,
        full_name: member.full_name || member.username || t("common.player"),
        skill_level: (member.skill_level || "intermediate") as SkillLevel
      }));
      const result = await balanceTeams({
        sport: group.sport_name || t("common.sport"),
        players,
        teams_count: 2
      });
      setBalancedTeams(result.teams || []);
    } catch (balanceError) {
      setBalanceError(balanceError instanceof Error ? balanceError.message : t("groupsPage.failedBalance"));
    } finally {
      setBalancing(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{group.sport_name || t("groupsPage.matchedGroup")}</CardTitle>
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Crown className="h-4 w-4 text-accent" />
              {group.captain_name || group.captain_id || t("groupsPage.captainPending")}
            </p>
          </div>
          <Badge className="bg-muted text-foreground">{group.status}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 text-sm font-medium sm:grid-cols-3">
          <span className="flex items-center gap-2">
            <UsersRound className="h-4 w-4 text-primary" />
            {group.member_count || group.members?.length || 0} {t("groupsPage.members")}
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
          {t("groupsPage.yourStatus")}: {confirmed ? t("common.confirmed") : t("groupsPage.waitingConfirmation")}
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
                  {member.skill_level ? t(`profilePage.${member.skill_level}`) : t("profilePage.intermediate")} - {member.confirmed ? t("common.confirmed") : t("common.pending")}
                  {compatibility[member.id] ? (
                    <Badge className="ml-2 bg-primary/10 text-primary">
                      {t("groupsPage.compatibility")}: {compatibility[member.id].score}%
                    </Badge>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
        ) : null}
        {balancedTeams.length ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm font-semibold">{t("groupsPage.balancedTeams")}</p>
            <div className="grid gap-3 md:grid-cols-2">
              {balancedTeams.map((team) => (
                <div key={team.name} className="rounded-md border bg-background p-3 text-sm">
                  <p className="font-semibold">
                    {team.name} ({t("groupsPage.average")} {team.average_skill})
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
      <CardFooter className="flex flex-col items-stretch gap-3">
        <div className="grid gap-2 sm:grid-cols-3">
          <Link href={`/events?group_id=${group.id}`} className="w-full">
            <Button className="w-full px-3" variant="outline" size="sm">
              <CalendarPlus className="h-4 w-4" />
              {t("eventsPage.createEvent")}
            </Button>
          </Link>
          <Link href={`/groups/${group.id}/chat`} className="w-full">
            <Button className="w-full px-3" variant="secondary" size="sm">
              <MessageCircle className="h-4 w-4" />
              {t("eventsPage.openGroupChat")}
            </Button>
          </Link>
          {currentUserId ? (
            !confirmed ? (
              <Button onClick={confirm} disabled={saving} size="sm" className="w-full px-3">
                {saving ? t("common.confirming") : t("common.confirm")}
              </Button>
            ) : (
              <Button onClick={decline} disabled={saving} variant="outline" size="sm" className="w-full px-3">
                <X className="h-4 w-4" />
                {saving ? t("common.saving") : t("common.decline")}
              </Button>
            )
          ) : null}
        </div>

        <div className="w-full">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 w-auto justify-start border border-border bg-background px-3"
            aria-expanded={isMoreActionsOpen}
            onClick={() => setIsMoreActionsOpen((value) => !value)}
          >
            <span className="flex items-center gap-2">
              <MoreHorizontal className="h-4 w-4" />
              {t("groupsPage.moreActions")}
            </span>
            <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${isMoreActionsOpen ? "rotate-180" : ""}`} />
          </Button>

          {isMoreActionsOpen ? (
            <div className="mt-2 space-y-4 rounded-md border bg-muted/20 px-3 py-3">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("groupsPage.insights")}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button type="button" variant="outline" className="justify-start" onClick={() => setIsExplainOpen(true)}>
                    <Lightbulb className="h-4 w-4 text-primary" />
                    {t("groupsPage.explainMatchAI")}
                  </Button>
                  {hasCompatibilityCandidates ? (
                    <Button type="button" variant="outline" className="justify-start" disabled={checkingCompatibility} onClick={checkCompatibility}>
                      <Sparkles className="h-4 w-4" />
                      {checkingCompatibility ? t("common.checking") : t("groupsPage.checkCompatibility")}
                    </Button>
                  ) : null}
                  {currentUserProfile ? (
                    <Button type="button" variant="outline" className="justify-start" onClick={() => setIsFindTeammateOpen(true)}>
                      <Sparkles className="h-4 w-4 text-primary" />
                      {t("groupsPage.findTeammateAI")}
                    </Button>
                  ) : null}
                  {hasMembers ? (
                    <Button type="button" variant="outline" className="justify-start" onClick={runBalanceTeams} disabled={balancing}>
                      <Sparkles className="h-4 w-4 text-primary" />
                      {balancing ? t("groupsPage.balancing") : t("groupsPage.balancedTeams")}
                    </Button>
                  ) : null}
                </div>
              </div>

              {isCaptain ? (
                <div className="space-y-2 border-t pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("groupsPage.management")}</p>
                  <Button type="button" variant="outline" className="w-full justify-start" onClick={() => setIsAddMembersOpen(true)}>
                    <UserPlus className="h-4 w-4" />
                    {t("groupsPage.addPeople")}
                  </Button>
                  <Button type="button" variant="ghost" className="w-full justify-start text-destructive hover:bg-destructive/10" disabled={deleting} onClick={handleDelete}>
                    <Trash2 className="h-4 w-4" />
                    {deleting ? t("common.deleting") : t("groupsPage.deleteGroup")}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
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
          autoRun
          onClose={() => setIsExplainOpen(false)}
        />
      )}
    </Card>
  );
}
