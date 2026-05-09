"use client";

import { useState } from "react";
import { Search, UserPlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { addGroupMembers, searchUsers } from "@/lib/api";
import type { AvailableUser } from "@/lib/types";

export function AddMembersModal({
  groupId,
  userId,
  isOpen,
  onClose,
  onAdded
}: {
  groupId: string;
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AvailableUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  if (!isOpen) return null;

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError("");
    try {
      const data = await searchUsers(query.trim(), undefined, undefined, groupId);
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search users.");
    } finally {
      setSearching(false);
    }
  }

  async function handleAdd(user: AvailableUser) {
    setAddingIds((prev) => new Set(prev).add(user.id));
    setError("");
    try {
      await addGroupMembers(groupId, [user.id], userId);
      setResults((prev) => prev.filter((r) => r.id !== user.id));
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add member.");
    } finally {
      setAddingIds((prev) => {
        const next = new Set(prev);
        next.delete(user.id);
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
          <CardTitle>Add people to group</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="Search by name, username, or city..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button type="submit" disabled={searching || !query.trim()}>
              <Search className="h-4 w-4" />
            </Button>
          </form>
          {error && <p className="mt-3 text-sm font-medium text-destructive">{error}</p>}
          
          <div className="mt-4 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {results.length === 0 && !searching && query && (
              <p className="text-sm text-muted-foreground">No users found.</p>
            )}
            {searching && <p className="text-sm text-muted-foreground">Searching...</p>}
            
            {results.map((user) => (
              <div key={user.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-sm font-bold text-secondary-foreground">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.full_name} className="h-full w-full object-cover" />
                    ) : (
                      initials(user.full_name || user.username)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{user.full_name || user.username}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {user.city ? `${user.city} • ` : ""}
                      {user.sports?.join(", ") || "No preferred sports"}
                      {user.skill_level ? ` • ${user.skill_level}` : ""}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={addingIds.has(user.id)}
                  onClick={() => handleAdd(user)}
                  className="shrink-0"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  {addingIds.has(user.id) ? "Adding..." : "Add"}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
