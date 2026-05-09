"use client";

import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import { Camera, Save, UserCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveProfile } from "@/lib/api";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { Profile, SkillLevel, Sport } from "@/lib/types";

const skillLevels: SkillLevel[] = ["beginner", "intermediate", "advanced"];
const maxAvatarSizeBytes = 5 * 1024 * 1024;

export function ProfileForm({
  userId,
  profile,
  sports,
  onSaved
}: {
  userId: string;
  profile: Profile | null;
  sports: Sport[];
  onSaved?: (profile: Profile) => void;
}) {
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState<Profile>({
    id: userId,
    full_name: profile?.full_name || "",
    username: profile?.username || "",
    description: profile?.description || "",
    avatar_url: profile?.avatar_url || null,
    city: profile?.city || "",
    latitude: profile?.latitude ?? null,
    longitude: profile?.longitude ?? null,
    sports_preferences: profile?.sports_preferences || []
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarStatus, setAvatarStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const preferencesBySport = useMemo(() => {
    return new Map((form.sports_preferences || []).map((item) => [item.sport_id, item]));
  }, [form.sports_preferences]);

  const initials = useMemo(() => {
    const source = form.full_name || form.username || "User";
    return source
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
  }, [form.full_name, form.username]);

  function buildProfilePayload(source: Profile = form) {
    return {
      ...source,
      latitude: source.latitude === null || Number.isNaN(Number(source.latitude)) ? null : Number(source.latitude),
      longitude: source.longitude === null || Number.isNaN(Number(source.longitude)) ? null : Number(source.longitude)
    };
  }

  function updatePreference(sportId: string, skillLevel: SkillLevel) {
    const current = preferencesBySport.get(sportId);
    const next = current
      ? (form.sports_preferences || []).map((item) =>
          item.sport_id === sportId ? { ...item, skill_level: skillLevel } : item
        )
      : [...(form.sports_preferences || []), { sport_id: sportId, skill_level: skillLevel }];
    setForm((value) => ({ ...value, sports_preferences: next }));
  }

  function toggleSport(sportId: string) {
    const current = preferencesBySport.get(sportId);
    const next = current
      ? (form.sports_preferences || []).filter((item) => item.sport_id !== sportId)
      : [...(form.sports_preferences || []), { sport_id: sportId, skill_level: "intermediate" as SkillLevel }];
    setForm((value) => ({ ...value, sports_preferences: next }));
  }

  async function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setAvatarStatus(null);
    setSaved(false);

    if (!file.type.startsWith("image/")) {
      setAvatarStatus({ type: "error", message: "Please choose an image file." });
      return;
    }

    if (file.size > maxAvatarSizeBytes) {
      setAvatarStatus({ type: "error", message: "Profile photos must be 5MB or smaller." });
      return;
    }

    setUploadingAvatar(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase() || "avatar";
      const path = `${userId}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false
      });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      if (!data.publicUrl) {
        throw new Error("Could not create a public URL for the uploaded photo.");
      }

      const nextForm = { ...form, avatar_url: data.publicUrl };
      setForm(nextForm);

      if (profile) {
        await saveProfile(buildProfilePayload(nextForm));
        setAvatarStatus({ type: "success", message: "Profile photo uploaded and saved." });
      } else {
        setAvatarStatus({ type: "success", message: "Profile photo uploaded. Save your profile to keep it linked." });
      }
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Could not upload profile photo.";
      setAvatarStatus({
        type: "error",
        message: message.includes("row-level security")
          ? "Upload blocked by Supabase Storage policy. Run the avatars bucket policies from database_schema.sql."
          : message
      });
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");

    try {
      const payload = buildProfilePayload();
      const savedProfile = await saveProfile(payload);
      setSaved(true);
      setForm(savedProfile);
      onSaved?.(savedProfile);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile setup</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-5">
          <div className="flex flex-col gap-4 rounded-md border border-border bg-muted/30 p-4 sm:flex-row sm:items-center">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-background">
              {form.avatar_url ? (
                <img src={form.avatar_url} alt="Profile avatar" className="h-full w-full object-cover" />
              ) : initials ? (
                <span className="text-2xl font-black text-primary">{initials}</span>
              ) : (
                <UserCircle className="h-12 w-12 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <h2 className="text-lg font-bold">Profile photo</h2>
                <p className="text-sm text-muted-foreground">Use a clear image up to 5MB.</p>
              </div>
              <input
                ref={avatarInputRef}
                id="avatar_upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={uploadAvatar}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                disabled={uploadingAvatar}
                onClick={() => avatarInputRef.current?.click()}
              >
                <Camera className="h-4 w-4" />
                {uploadingAvatar ? "Uploading..." : "Upload profile photo"}
              </Button>
              {avatarStatus ? (
                <p
                  className={`text-sm font-medium ${
                    avatarStatus.type === "success" ? "text-primary" : "text-destructive"
                  }`}
                >
                  {avatarStatus.message}
                </p>
              ) : null}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={(event) => setForm({ ...form, full_name: event.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={form.username}
                onChange={(event) => setForm({ ...form, username: event.target.value })}
                required
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={form.city || ""}
                onChange={(event) => setForm({ ...form, city: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                value={form.latitude ?? ""}
                onChange={(event) =>
                  setForm({ ...form, latitude: event.target.value ? Number(event.target.value) : null })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                value={form.longitude ?? ""}
                onChange={(event) =>
                  setForm({ ...form, longitude: event.target.value ? Number(event.target.value) : null })
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="What sports do you like, and what kind of group fits you?"
            />
          </div>
          <div className="space-y-3">
            <Label>Sports preferences</Label>
            <div className="grid gap-3 md:grid-cols-2">
              {sports.map((sport) => {
                const preference = preferencesBySport.get(sport.id);
                return (
                  <div
                    key={sport.id}
                    className={`rounded-md border p-3 transition ${
                      preference ? "border-primary bg-primary/5" : "border-border bg-background"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSport(sport.id)}
                      className="flex w-full items-center justify-between gap-3 text-left font-semibold"
                    >
                      <span>{sport.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {sport.min_players}-{sport.max_players} players
                      </span>
                    </button>
                    {preference ? (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {skillLevels.map((level) => (
                          <Button
                            key={level}
                            type="button"
                            size="sm"
                            variant={preference.skill_level === level ? "default" : "outline"}
                            onClick={() => updatePreference(sport.id, level)}
                          >
                            {level}
                          </Button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
          <Button type="submit" className="w-full md:w-auto" disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save profile"}
          </Button>
          {saved ? <p className="text-sm font-medium text-primary">Profile saved. You are ready to show up.</p> : null}
          {error ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{error}</p> : null}
        </form>
      </CardContent>
    </Card>
  );
}
