"use client";

import { useEffect, useState } from "react";
import { HeartPulse } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { connectFitnessDemo, disconnectFitnessDemo, getFitnessIntegrations } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { FitnessIntegration } from "@/lib/types";
import { showToast } from "@/lib/toast";

const providers = ["Google Fit", "Apple Health", "Fitbit"];

export function FitnessIntegrationsPanel({ userId }: { userId: string }) {
    const { t } = useI18n();
    const [integrations, setIntegrations] = useState<FitnessIntegration[]>([]);
    const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;
        async function load() {
            setError("");
            try {
                const data = await getFitnessIntegrations(userId);
                if (active) setIntegrations(data.integrations || []);
            } catch (loadError) {
                if (active) setError(loadError instanceof Error ? loadError.message : "Failed to fetch fitness data.");
            }
        }

        load();
        return () => {
            active = false;
        };
    }, [userId]);

    function findIntegration(provider: string) {
        return integrations.find((item) => item.provider === provider);
    }

    async function connect(provider: string) {
        setLoadingProvider(provider);
        setError("");
        try {
            const record = await connectFitnessDemo(userId, provider);
            setIntegrations((current) => {
                const rest = current.filter((item) => item.provider !== provider);
                return [...rest, record];
            });
            showToast(`${provider} demo connected.`, "success");
        } catch (connectError) {
            setError(connectError instanceof Error ? connectError.message : "Failed to connect demo wearable.");
        } finally {
            setLoadingProvider(null);
        }
    }

    async function disconnect(provider: string) {
        setLoadingProvider(provider);
        setError("");
        try {
            const record = await disconnectFitnessDemo(userId, provider);
            setIntegrations((current) => {
                const rest = current.filter((item) => item.provider !== provider);
                return [...rest, { ...record, provider } as FitnessIntegration];
            });
            showToast(`${provider} demo disconnected.`, "info");
        } catch (disconnectError) {
            setError(disconnectError instanceof Error ? disconnectError.message : "Failed to disconnect demo wearable.");
        } finally {
            setLoadingProvider(null);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <HeartPulse className="h-5 w-5 text-primary" />
                    {t("fitnessIntegrations")}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">Demo integration for hackathon prototype.</p>
                {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
                <div className="grid gap-3 md:grid-cols-3">
                    {providers.map((provider) => {
                        const integration = findIntegration(provider);
                        const connected = Boolean(integration?.connected);
                        return (
                            <div key={provider} className="rounded-md border bg-background p-3">
                                <p className="text-sm font-semibold">{provider}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {connected
                                        ? `Weekly steps: ${integration?.weekly_steps || 0}`
                                        : "Not connected yet"}
                                </p>
                                {connected ? (
                                    <p className="text-xs text-muted-foreground">
                                        Active minutes: {integration?.weekly_active_minutes || 0}
                                    </p>
                                ) : null}
                                {connected && integration?.last_sync_at ? (
                                    <p className="text-xs text-muted-foreground">
                                        Last sync: {new Date(integration.last_sync_at).toLocaleString()}
                                    </p>
                                ) : null}
                                <div className="mt-3">
                                    {connected ? (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={loadingProvider === provider}
                                            onClick={() => disconnect(provider)}
                                        >
                                            {loadingProvider === provider ? "Updating..." : t("disconnect")}
                                        </Button>
                                    ) : (
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            disabled={loadingProvider === provider}
                                            onClick={() => connect(provider)}
                                        >
                                            {loadingProvider === provider ? "Connecting..." : t("connectDemo")}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
