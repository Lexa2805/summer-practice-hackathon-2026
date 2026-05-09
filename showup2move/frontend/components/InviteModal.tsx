"use client";

import { useEffect, useState } from "react";
import { Link2, Mail, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createEventInvite } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { showToast } from "@/lib/toast";
import type { EventItem } from "@/lib/types";

export function InviteModal({
    event,
    currentUserId,
    isOpen,
    onClose
}: {
    event: EventItem;
    currentUserId: string;
    isOpen: boolean;
    onClose: () => void;
}) {
    const { t } = useI18n();
    const [email, setEmail] = useState("");
    const [inviteLink, setInviteLink] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (isOpen) {
            setEmail("");
            setInviteLink("");
            setError("");
            setLoading(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    async function createInvite() {
        setLoading(true);
        setError("");
        try {
            const payload = {
                invited_email: email.trim() || undefined,
                invited_by: currentUserId
            };
            const data = await createEventInvite(event.id, payload);
            setInviteLink(data.invite_link);
            showToast("Invite link ready.", "success");
        } catch (createError) {
            setError(createError instanceof Error ? createError.message : "Failed to create invite.");
        } finally {
            setLoading(false);
        }
    }

    async function copyLink() {
        if (!inviteLink) return;
        try {
            await navigator.clipboard.writeText(inviteLink);
            showToast("Invite link copied.", "success");
        } catch {
            window.prompt("Copy invite link", inviteLink);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
            <Card className="w-full max-w-lg shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>{t("inviteFriend")}</CardTitle>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold">Invite by email (optional)</label>
                        <div className="flex gap-2">
                            <Input
                                type="email"
                                placeholder="friend@example.com"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                            />
                            <Button variant="secondary" onClick={createInvite} disabled={loading}>
                                <Mail className="h-4 w-4" />
                                {loading ? "Sending..." : "Create"}
                            </Button>
                        </div>
                    </div>
                    <div className="rounded-md border bg-muted/30 p-3 text-sm">
                        <p className="font-semibold">Share link</p>
                        <p className="text-xs text-muted-foreground">
                            Generate a shareable link for this event.
                        </p>
                        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                            <Button variant="outline" onClick={createInvite} disabled={loading}>
                                <Link2 className="h-4 w-4" />
                                {loading ? "Generating..." : "Generate link"}
                            </Button>
                            {inviteLink ? (
                                <Button variant="secondary" onClick={copyLink}>
                                    {t("copyLink")}
                                </Button>
                            ) : null}
                        </div>
                        {inviteLink ? (
                            <p className="mt-2 break-all text-xs text-muted-foreground">{inviteLink}</p>
                        ) : null}
                    </div>
                    {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
                </CardContent>
            </Card>
        </div>
    );
}
