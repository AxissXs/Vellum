"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Loader2, Copy, Check, Trash2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

type ApiToken = {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

export default function ApiTokensSection() {
  const queryClient = useQueryClient();
  const [tokenName, setTokenName] = useState("");
  const [expiresInDays, setExpiresInDays] = useState<number | "">("");
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["api-tokens"],
    queryFn: async () => {
      const res = await api.get<{ tokens: ApiToken[] }>("/api/tokens");
      return res.tokens;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return api.post<{ token: string; tokenInfo: ApiToken }>("/api/tokens", {
        name: tokenName,
        expiresInDays: expiresInDays || undefined,
      });
    },
    onSuccess: (res) => {
      setRevealedToken(res.token);
      setTokenName("");
      setExpiresInDays("");
      queryClient.invalidateQueries({ queryKey: ["api-tokens"] });
      toast.success("Token created — copy it now, it won't be shown again");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create token");
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/api/tokens/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-tokens"] });
      toast.success("Token revoked");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to revoke token");
    },
  });

  function copyToken() {
    if (!revealedToken) return;
    navigator.clipboard.writeText(revealedToken);
    setCopied(true);
    toast.success("Token copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-surface-card/50 border border-border-subtle rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <KeyRound size={20} className="text-text-dim" />
        <div>
          <h2 className="text-lg font-semibold text-text-primary">API Tokens</h2>
          <p className="text-sm text-text-dim mt-0.5">
            Create tokens for external integrations, scripts, and AI agents.
          </p>
        </div>
      </div>

      {/* Revealed token alert */}
      {revealedToken && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-4">
          <p className="text-sm text-amber-400 font-medium mb-2">
            Copy this token now — it won&apos;t be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm font-mono text-amber-300 bg-surface-strong/50 rounded px-3 py-2 break-all">
              {revealedToken}
            </code>
            <button
              onClick={copyToken}
              className="text-amber-400 hover:text-amber-300 transition p-2"
              title="Copy"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>
          <button
            onClick={() => setRevealedToken(null)}
            className="mt-2 text-xs text-amber-400/70 hover:text-amber-400 transition"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create form */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-text-muted mb-1.5">Token Name</label>
          <input
            type="text"
            value={tokenName}
            onChange={(e) => setTokenName(e.target.value)}
            placeholder="e.g. Cursor Agent, CI Pipeline"
            className="w-full rounded-lg border border-border-default bg-surface-page px-3 py-2 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-muted mb-1.5">Expires</label>
          <select
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(e.target.value ? Number(e.target.value) : "")}
            className="rounded-lg border border-border-default bg-surface-page px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
          >
            <option value="">Never</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
            <option value={365}>1 year</option>
          </select>
        </div>
        <button
          onClick={() => {
            if (!tokenName.trim()) {
              toast.error("Please enter a token name");
              return;
            }
            createMutation.mutate();
          }}
          disabled={createMutation.isPending || !tokenName.trim()}
          className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-text-primary text-sm font-medium px-4 py-2 rounded-lg transition flex items-center gap-2"
        >
          {createMutation.isPending && <Loader2 size={16} className="animate-spin" />}
          Create Token
        </button>
      </div>

      {/* Token list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-text-dim" size={24} />
        </div>
      ) : data && data.length > 0 ? (
        <div className="space-y-2">
          {data.map((token) => (
            <div
              key={token.id}
              className="flex items-center justify-between bg-surface-strong/50 border border-border-subtle rounded-lg px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-primary font-medium">{token.name}</span>
                  <code className="text-xs font-mono text-text-dim">
                    vellum_{token.prefix}...
                  </code>
                </div>
                <div className="flex items-center gap-2 text-xs text-text-dim mt-0.5">
                  {token.lastUsedAt ? (
                    <span>Last used {formatDistanceToNow(new Date(token.lastUsedAt), { addSuffix: true })}</span>
                  ) : (
                    <span>Never used</span>
                  )}
                  <span>·</span>
                  <span>Created {formatDistanceToNow(new Date(token.createdAt), { addSuffix: true })}</span>
                  {token.expiresAt && (
                    <>
                      <span>·</span>
                      <span>Expires {formatDistanceToNow(new Date(token.expiresAt), { addSuffix: true })}</span>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  if (confirm(`Revoke token "${token.name}"? Any scripts using it will stop working.`)) {
                    revokeMutation.mutate(token.id);
                  }
                }}
                disabled={revokeMutation.isPending}
                className="text-text-dim hover:text-red-400 hover:bg-red-500/10 p-2 rounded-lg transition"
                title="Revoke token"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-dim">No API tokens yet. Create one above.</p>
      )}
    </div>
  );
}
