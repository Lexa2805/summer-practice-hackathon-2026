"use client";

import { FormEvent, useState, useEffect } from "react";
import { X, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { checkAchievements, createGroup, getSports } from "@/lib/api";
import { showToast } from "@/lib/toast";
import type { Sport } from "@/lib/types";

export function CreateGroupModal({
  userId,
  isOpen,
  onClose,
  onCreated
}: {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [sports, setSports] = useState<Sport[]>([]);
  const [name, setName] = useState("");
  const [sportId, setSportId] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && !sports.length) {
      getSports().then(data => {
        setSports(data);
        if (data.length > 0 && !sportId) {
          setSportId(data[0].id);
        }
      }).catch(err => console.error("Failed to load sports", err));
    }
  }, [isOpen, sports.length, sportId]);

  if (!isOpen) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      await createGroup({
        name,
        sport_id: sportId,
        city,
        description,
        created_by: userId,
        member_ids: [] // Can add initial members here if wanted, but empty is fine.
      });
      const achievementResult = await checkAchievements(userId);
      achievementResult.unlocked_now?.forEach((item) =>
        showToast(`Achievement unlocked: ${item.title}`, "success")
      );
      setSuccess(true);
      setTimeout(() => {
        onCreated();
        onClose();
        setName("");
        setCity("");
        setDescription("");
        setSuccess(false);
      }, 1000);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create group.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Create manual group</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="group_name">Group Name</Label>
              <Input id="group_name" placeholder="e.g., Sunday Football Club" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="group_sport">Sport</Label>
              <select
                id="group_sport"
                value={sportId}
                onChange={(e) => setSportId(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              >
                {sports.map((sport) => (
                  <option key={sport.id} value={sport.id}>
                    {sport.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="group_city">City</Label>
              <Input id="group_city" placeholder="e.g., Timisoara" value={city} onChange={(e) => setCity(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="group_desc">Description (optional)</Label>
              <Textarea id="group_desc" placeholder="What kind of group is this?" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={saving || !sportId}>
              <UsersRound className="mr-2 h-4 w-4" />
              {saving ? "Creating..." : "Create group"}
            </Button>
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            {success && <p className="text-sm font-medium text-primary">Group created successfully!</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
