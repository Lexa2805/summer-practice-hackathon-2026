"use client";

import { useCallback, useEffect, useState } from "react";
import { X, Sparkles, CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ErrorMessage } from "@/components/ui/error-state";
import { explainMatch } from "@/lib/api";
import { showToast } from "@/lib/toast";
import { useI18n } from "@/lib/i18n";

interface ExplainMatchModalProps {
  groupId: string;
  groupName?: string;
  autoRun?: boolean;
  onClose: () => void;
}

export function ExplainMatchModal({ groupId, groupName, autoRun = false, onClose }: ExplainMatchModalProps) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(autoRun);
  const [error, setError] = useState("");
  const [hasAutoStarted, setHasAutoStarted] = useState(false);
  const [result, setResult] = useState<{
    title: string;
    reasons: string[];
    summary: string;
    source: string;
  } | null>(null);

  const handleExplain = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await explainMatch(groupId);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("aiUnavailable"));
      showToast(t("couldNotGenerateExplanation"), "error");
    } finally {
      setLoading(false);
    }
  }, [groupId, t]);

  useEffect(() => {
    if (!autoRun || hasAutoStarted) return;
    setHasAutoStarted(true);
    handleExplain();
  }, [autoRun, handleExplain, hasAutoStarted]);

  const getSourceVariant = (source: string): "success" | "info" | "warning" => {
    if (source === "ollama") return "success";
    if (source === "openrouter") return "info";
    return "warning";
  };

  const getSourceLabel = (source: string): string => {
    if (source === "ollama") return t("localAI");
    if (source === "openrouter") return t("cloudAI");
    return t("fallback");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-lg border bg-card shadow-lg">
        <div className="flex items-start justify-between border-b p-6">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <Sparkles className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-black">
                {result ? result.title : t("matchExplanation")}
              </h2>
            </div>
            {groupName && !result ? <p className="mt-2 text-sm text-muted-foreground">{groupName}</p> : null}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="p-6">
          {!result && !loading && !error ? (
            <div className="space-y-6">
              <p className="text-muted-foreground">
                {t("aiPoweredExplanation")}
              </p>
              <Button onClick={handleExplain} className="w-full">
                <Sparkles className="h-4 w-4" />
                {t("explainWithAI")}
              </Button>
            </div>
          ) : null}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : null}

          {error ? <ErrorMessage message={error} /> : null}

          {result ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-muted-foreground">{t("aiAnalysis")}</p>
                <StatusBadge
                  status={getSourceLabel(result.source)}
                  variant={getSourceVariant(result.source)}
                />
              </div>

              <div className="space-y-4">
                <h3 className="font-bold">{t("whyThisWorks")}</h3>
                <ul className="space-y-3">
                  {result.reasons.map((reason, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <span className="leading-relaxed">{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="leading-relaxed text-muted-foreground">{result.summary}</p>
              </div>
            </div>
          ) : null}
        </div>
        <div className="flex justify-end gap-3 border-t p-6">
          <Button variant="secondary" onClick={onClose}>
            {t("close")}
          </Button>
        </div>
      </div>
    </div>
  );
}
