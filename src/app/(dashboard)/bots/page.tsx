"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Bot as BotIcon,
  Plus,
  Copy,
  Check,
  Clock,
  Wifi,
  WifiOff,
  Trash2,
} from "lucide-react";
import type { Bot } from "@/lib/types";
import { BotStatusDot, TicketStatusBadge } from "@/components/badges";

export default function BotsPage() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Register form
  const [newBotName, setNewBotName] = useState("");
  const [newBotToken, setNewBotToken] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [origin, setOrigin] = useState("");

  const loadBots = useCallback(async () => {
    try {
      const res = await fetch("/api/bots");
      if (res.ok) setBots(await res.json());
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    setOrigin(window.location.origin);
    async function init() {
      setLoading(true);
      await loadBots();
      setLoading(false);
    }
    init();
  }, [loadBots]);

  const generateToken = () => {
    const token = `SDN_${crypto.randomUUID().replace(/-/g, "")}`;
    setNewBotToken(token);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBotName.trim() || !newBotToken.trim()) return;

    setRegistering(true);
    setRegisterError("");

    try {
      const res = await fetch("/api/bots/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newBotName.trim(),
          endpoint_token: newBotToken.trim(),
        }),
      });

      if (res.ok) {
        setNewBotName("");
        setNewBotToken("");
        setShowRegister(false);
        setRegisterSuccess(true);
        setTimeout(() => setRegisterSuccess(false), 3000);
        await loadBots();
      } else {
        const data = await res.json();
        setRegisterError(data.error || "Failed to register bot");
      }
    } catch {
      setRegisterError("Network error");
    }
    setRegistering(false);
  };

  const handleToggleStatus = async (bot: Bot) => {
    const newStatus = bot.status === "offline" ? "online" : "offline";
    try {
      // Use the bot's own poll endpoint to update last_seen and mark online
      // For toggling, we'll call our API directly
      const res = await fetch("/api/bots/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot_id: bot.id, status: newStatus }),
      });
      if (res.ok) await loadBots();
    } catch {
      // ignore
    }
  };

  const handleDelete = async (bot: Bot) => {
    if (!confirm(`Delete ${bot.name}?`)) return;
    try {
      const res = await fetch("/api/bots/toggle", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot_id: bot.id }),
      });
      if (res.ok) await loadBots();
    } catch { /* ignore */ }
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted">Loading bots...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold font-[family-name:var(--font-heading)] tracking-tight">
            Bots
          </h1>
          <p className="text-xs md:text-sm text-muted mt-1">
            Manage registered bots and monitor their status
          </p>
        </div>
        <button
          onClick={() => {
            setShowRegister(!showRegister);
            if (!showRegister) generateToken();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-accent text-black hover:bg-accent/90 transition-colors min-h-[44px]"
        >
          <Plus size={14} />
          Add Bot
        </button>
      </div>

      {/* Success Banner */}
      {registerSuccess && (
        <div className="bg-accent/10 border border-accent/20 text-accent text-sm rounded-xl px-4 py-3 flex items-center gap-2">
          <Check size={16} />
          Bot registered successfully! Set it online when ready.
        </div>
      )}

      {/* Register Form */}
      {showRegister && (
        <div className="bg-card border border-card-border rounded-xl p-4 md:p-6">
          <h2 className="text-sm font-semibold mb-4">New Bot</h2>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newBotName}
                onChange={(e) => setNewBotName(e.target.value)}
                placeholder="Bot name (e.g. Beckett)"
                required
                autoFocus
                className="flex-1 bg-surface border border-card-border rounded-lg px-3 py-2.5 text-sm min-h-[44px] placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                disabled={registering || !newBotName.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-accent text-black hover:bg-accent/90 transition-colors min-h-[44px] disabled:opacity-50 whitespace-nowrap"
              >
                {registering ? "Creating..." : "Create"}
              </button>
              <button
                type="button"
                onClick={() => setShowRegister(false)}
                className="px-3 py-2.5 text-sm rounded-lg border border-card-border text-muted hover:text-foreground transition-colors min-h-[44px]"
              >
                Cancel
              </button>
            </div>

            {registerError && (
              <p className="text-xs text-accent-pink">{registerError}</p>
            )}

            <p className="text-[10px] text-muted-foreground">A unique token and endpoint URL will be generated automatically. You can copy them from the bot card after creation.</p>
          </form>
        </div>
      )}

      {/* Bot List */}
      {bots.length === 0 ? (
        <div className="text-center py-12 md:py-16 bg-card border border-card-border rounded-xl">
          <BotIcon size={32} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted mb-1">No bots registered</p>
          <p className="text-xs text-muted-foreground">
            Register a bot to start dispatching tickets.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {bots.map((bot) => (
            <div
              key={bot.id}
              className="bg-card border border-card-border rounded-xl p-4 md:p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center">
                    <BotIcon size={18} className="text-muted" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{bot.name}</span>
                      <BotStatusDot status={bot.status} />
                    </div>
                    <p className="text-[10px] text-muted capitalize">{bot.status}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggleStatus(bot)}
                    disabled={bot.status === "busy"}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[32px] ${
                      bot.status === "offline"
                        ? "border-green-500/30 text-green-400 hover:bg-green-500/10"
                        : "border-card-border text-muted hover:text-foreground hover:bg-surface"
                    }`}
                  >
                    {bot.status === "offline" ? (
                      <>
                        <Wifi size={12} /> Set Online
                      </>
                    ) : (
                      <>
                        <WifiOff size={12} /> Set Offline
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(bot)}
                    disabled={bot.status === "busy"}
                    className="p-1.5 rounded-lg border border-card-border text-muted hover:text-red-400 hover:border-red-400/30 transition-colors disabled:opacity-50 min-h-[32px] min-w-[32px] flex items-center justify-center"
                    title="Delete bot"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {/* Token - click to copy */}
              <div className="space-y-1.5 mb-3">
                <button
                  onClick={() => copyToken(bot.endpoint_token)}
                  className="w-full text-left bg-surface hover:bg-surface/80 rounded-lg px-3 py-2 transition-colors group cursor-pointer"
                  title="Click to copy token"
                >
                  <p className="text-[10px] text-muted mb-0.5">Token</p>
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-[11px] text-muted-foreground font-mono truncate">{bot.endpoint_token}</code>
                    {copiedToken === bot.endpoint_token ? (
                      <Check size={12} className="text-accent shrink-0" />
                    ) : (
                      <Copy size={12} className="text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" />
                    )}
                  </div>
                </button>
                <button
                  onClick={() => copyToken(`${origin}/api/bots/${bot.endpoint_token}/poll`)}
                  className="w-full text-left bg-surface hover:bg-surface/80 rounded-lg px-3 py-2 transition-colors group cursor-pointer"
                  title="Click to copy endpoint URL"
                >
                  <p className="text-[10px] text-muted mb-0.5">Poll Endpoint</p>
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-[11px] text-muted-foreground font-mono truncate">{origin}/api/bots/{bot.endpoint_token}/poll</code>
                    {copiedToken === `${origin}/api/bots/${bot.endpoint_token}/poll` ? (
                      <Check size={12} className="text-accent shrink-0" />
                    ) : (
                      <Copy size={12} className="text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" />
                    )}
                  </div>
                </button>
              </div>

              {/* Current Task */}
              {bot.status === "busy" && bot.current_ticket && (
                <div className="bg-surface rounded-lg p-3 mb-3">
                  <p className="text-[10px] text-muted font-medium mb-1">Current Task</p>
                  <p className="text-xs truncate">{bot.current_ticket.title}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <TicketStatusBadge status={bot.current_ticket.status} />
                  </div>
                </div>
              )}

              {/* Last Seen */}
              {bot.last_seen && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock size={10} />
                  Last seen {formatDate(bot.last_seen)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
