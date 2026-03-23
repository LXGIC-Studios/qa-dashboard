"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Zap,
  Clock,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  GitBranch,
} from "lucide-react";
import { getCurrentUser } from "@/lib/store";
import type { Profile, SDNTicket, TicketLog } from "@/lib/types";
import {
  TicketStatusBadge,
  TicketPriorityBadge,
  BotStatusDot,
} from "@/components/badges";

export default function DispatchPage() {
  const [tickets, setTickets] = useState<SDNTicket[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [ticketLogs, setTicketLogs] = useState<Record<string, TicketLog[]>>({});

  // Form state removed - tickets are now created from project pages

  const loadTickets = useCallback(async () => {
    try {
      const res = await fetch("/api/sdn/tickets");
      if (res.ok) setTickets(await res.json());
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      const user = await getCurrentUser();
      setCurrentUser(user);
      await loadTickets();
      setLoading(false);
    }
    init();
  }, [loadTickets]);

  // Removed form - tickets created from project pages

  const loadLogs = async (ticketId: string) => {
    if (expandedTicket === ticketId) {
      setExpandedTicket(null);
      return;
    }
    setExpandedTicket(ticketId);
    if (!ticketLogs[ticketId]) {
      try {
        const res = await fetch(`/api/sdn/tickets?status=all`);
        // We need a dedicated logs endpoint - for now fetch from the general endpoint
        // Let's use a simple approach: fetch logs via a query
        // Actually, we'll create an inline fetch for logs
        const logsRes = await fetch(`/api/sdn/tickets/logs?ticket_id=${ticketId}`);
        if (logsRes.ok) {
          const logs = await logsRes.json();
          setTicketLogs((prev) => ({ ...prev, [ticketId]: logs }));
        }
      } catch {
        // ignore
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted">Loading dispatch...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-xl md:text-2xl font-bold font-[family-name:var(--font-heading)] tracking-tight">
          Tickets
        </h1>
        <p className="text-xs md:text-sm text-muted mt-1">
          All dispatched tickets and their status
        </p>
      </div>

      <div>

        {tickets.length === 0 ? (
          <div className="text-center py-12 bg-card border border-card-border rounded-xl">
            <Clock size={32} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted">No tickets yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create an issue from a project to dispatch it to a bot
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="bg-card border border-card-border rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => loadLogs(ticket.id)}
                  className="w-full text-left p-4 hover:bg-surface/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ticket.title}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <TicketStatusBadge status={ticket.status} />
                        <TicketPriorityBadge priority={ticket.priority} />
                        {ticket.assigned_bot && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted">
                            <BotStatusDot status={ticket.assigned_bot.status} />
                            {ticket.assigned_bot.name}
                          </span>
                        )}
                        {ticket.project && (
                          <span className="text-[10px] text-muted-foreground">
                            {ticket.project.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-muted">
                        {formatDate(ticket.created_at)}
                      </span>
                      {expandedTicket === ticket.id ? (
                        <ChevronUp size={14} className="text-muted" />
                      ) : (
                        <ChevronDown size={14} className="text-muted" />
                      )}
                    </div>
                  </div>
                </button>

                {expandedTicket === ticket.id && (
                  <div className="px-4 pb-4 border-t border-card-border pt-3 space-y-3">
                    {ticket.description && (
                      <div>
                        <p className="text-[10px] text-muted font-medium mb-1">Description</p>
                        <p className="text-xs text-foreground/80">{ticket.description}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-4 text-xs">
                      {ticket.github_repo && (
                        <div className="flex items-center gap-1 text-muted">
                          <ExternalLink size={12} />
                          <span className="truncate max-w-[200px]">{ticket.github_repo}</span>
                        </div>
                      )}
                      {ticket.branch_name && (
                        <div className="flex items-center gap-1 text-muted">
                          <GitBranch size={12} />
                          {ticket.branch_name}
                        </div>
                      )}
                      {ticket.pr_url && (
                        <a
                          href={ticket.pr_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-accent-blue hover:underline"
                        >
                          <ExternalLink size={12} />
                          Pull Request
                        </a>
                      )}
                    </div>

                    {ticket.prompt && (
                      <div>
                        <p className="text-[10px] text-muted font-medium mb-1">Prompt</p>
                        <div className="bg-surface rounded-lg p-3 text-xs text-muted font-mono">
                          {ticket.prompt}
                        </div>
                      </div>
                    )}

                    {ticket.result && (
                      <div>
                        <p className="text-[10px] text-muted font-medium mb-1">Result</p>
                        <div className="bg-surface rounded-lg p-3 text-xs text-foreground/80">
                          {ticket.result}
                        </div>
                      </div>
                    )}

                    {/* Ticket Logs */}
                    {ticketLogs[ticket.id] && ticketLogs[ticket.id].length > 0 && (
                      <div>
                        <p className="text-[10px] text-muted font-medium mb-2">Activity Log</p>
                        <div className="space-y-2">
                          {ticketLogs[ticket.id].map((log) => (
                            <div
                              key={log.id}
                              className="flex items-start gap-2 text-xs"
                            >
                              <LogTypeDot type={log.log_type} />
                              <div className="flex-1 min-w-0">
                                <p className="text-foreground/80">{log.message}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {new Date(log.created_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LogTypeDot({ type }: { type: string }) {
  const colors: Record<string, string> = {
    info: "bg-accent-blue",
    error: "bg-accent-pink",
    progress: "bg-yellow-400",
    complete: "bg-accent",
  };
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full mt-1 shrink-0 ${colors[type] || "bg-zinc-500"}`}
    />
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
