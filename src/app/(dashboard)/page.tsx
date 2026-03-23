"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Boxes,
  Bug,
  CheckCircle2,
  Rocket,
  ExternalLink,
  Github,
  FolderPlus,
  Zap,
  Bot as BotIcon,
  Trash2,
} from "lucide-react";
import {
  getProjects,
  getBugsByProject,
  getTestCasesByProject,
  getChecklist,
  computeProjectHealth,
  computeBugCounts,
  computeTestPassRate,
  getCurrentUser,
  getAccessibleProjects,
} from "@/lib/store";
import type { Project, Bug as BugType, TestCase, Profile, Bot, SDNTicket } from "@/lib/types";
import {
  PlatformBadge,
  StatusBadge,
  SeverityDot,
  HealthDot,
  BotStatusDot,
  TicketStatusBadge,
  TicketPriorityBadge,
} from "@/components/badges";
import { GitHubImportModal } from "@/components/github-import-modal";
import { AddProjectModal } from "@/components/add-project-modal";

interface ProjectCardData {
  project: Project;
  health: "green" | "yellow" | "red";
  bugCounts: ReturnType<typeof computeBugCounts>;
  passRate: number;
  openIssues: number;
}

export default function DashboardPage() {
  const [projectCards, setProjectCards] = useState<ProjectCardData[]>([]);
  const [totalOpenBugs, setTotalOpenBugs] = useState(0);
  const [overallPassRate, setOverallPassRate] = useState(0);
  const [readyForRelease, setReadyForRelease] = useState(0);
  const [githubModalOpen, setGithubModalOpen] = useState(false);
  const [addProjectModalOpen, setAddProjectModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [bots, setBots] = useState<Bot[]>([]);
  const [recentTickets, setRecentTickets] = useState<SDNTicket[]>([]);

  const handleDeleteProject = async (projectId: string) => {
    try {
      const res = await fetch("/api/projects", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId }),
      });
      if (res.ok) refresh();
    } catch { /* ignore */ }
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    const user = await getCurrentUser();
    setCurrentUser(user);

    const projs = user ? await getAccessibleProjects(user) : await getProjects();

    let totalOpen = 0;
    let allRun = 0;
    let allPassed = 0;
    let rfrCount = 0;
    const cards: ProjectCardData[] = [];

    for (const p of projs) {
      const [bugs, tests, checklist] = await Promise.all([
        getBugsByProject(p.id),
        getTestCasesByProject(p.id),
        getChecklist(p.id),
      ]);

      const health = computeProjectHealth(bugs);
      const bugCounts = computeBugCounts(bugs);
      const passRate = computeTestPassRate(tests);

      totalOpen += bugCounts.total;
      const run = tests.filter((t: TestCase) => t.status !== "untested");
      allRun += run.length;
      allPassed += run.filter((t: TestCase) => t.status === "pass").length;

      const checkRate =
        checklist.length > 0
          ? checklist.filter((c) => c.checked).length / checklist.length
          : 0;
      if (health === "green" && checkRate > 0.8) rfrCount++;

      cards.push({ project: p, health, bugCounts, passRate, openIssues: bugCounts.total });
    }

    setProjectCards(cards);
    setTotalOpenBugs(totalOpen);
    setOverallPassRate(
      allRun > 0 ? Math.round((allPassed / allRun) * 100) : 100
    );
    setReadyForRelease(rfrCount);

    // Fetch SDN data
    try {
      const [botsRes, ticketsRes] = await Promise.all([
        fetch("/api/bots"),
        fetch("/api/sdn/tickets"),
      ]);
      if (botsRes.ok) setBots(await botsRes.json());
      if (ticketsRes.ok) {
        const allTickets = await ticketsRes.json();
        setRecentTickets(allTickets.slice(0, 5));
      }
    } catch {
      // SDN data is supplementary, don't fail the dashboard
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isAdmin = currentUser?.role === "admin";

  const statCards = [
    {
      label: "Projects",
      value: projectCards.length,
      icon: Boxes,
      color: "text-accent",
    },
    {
      label: "Open Issues",
      value: totalOpenBugs,
      icon: Bug,
      color: totalOpenBugs > 0 ? "text-accent-pink" : "text-accent",
    },
    {
      label: "Tests Pass",
      value: `${overallPassRate}%`,
      icon: CheckCircle2,
      color: overallPassRate >= 80 ? "text-accent" : "text-yellow-400",
    },
    {
      label: "Release Ready",
      value: readyForRelease,
      icon: Rocket,
      color: "text-accent-blue",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-xl md:text-2xl font-bold font-[family-name:var(--font-heading)] tracking-tight">
          Dashboard
        </h1>
        <p className="text-xs md:text-sm text-muted mt-1">
          SDN overview across {isAdmin ? "all" : "your"} LXGIC Studios projects
        </p>
      </div>

      {/* Stat Cards - 2x2 grid on mobile, 4 columns on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-card border border-card-border rounded-xl p-4 md:p-5"
          >
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <span className="text-[10px] md:text-xs text-muted font-medium">
                {stat.label}
              </span>
              <stat.icon size={16} className={stat.color} />
            </div>
            <p
              className={`text-xl md:text-2xl font-bold font-[family-name:var(--font-heading)] ${stat.color}`}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* SDN Section - Bot Status & Recent Tickets */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base md:text-lg font-bold font-[family-name:var(--font-heading)]">
            SDN Dispatch
          </h2>
          <Link
            href="/dispatch"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-accent text-black hover:bg-accent/90 transition-colors min-h-[44px]"
          >
            <Zap size={14} />
            Dispatch Ticket
          </Link>
        </div>

        {/* Bot Status Cards */}
        {bots.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            {bots.map((bot) => (
              <div
                key={bot.id}
                className="bg-card border border-card-border rounded-xl p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-surface flex items-center justify-center">
                    <BotIcon size={16} className="text-muted" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate">{bot.name}</span>
                      <BotStatusDot status={bot.status} />
                    </div>
                    <p className="text-[10px] text-muted capitalize">{bot.status}</p>
                  </div>
                </div>
                {bot.status === "busy" && bot.current_ticket && (
                  <div className="mt-3 pt-3 border-t border-card-border">
                    <p className="text-[10px] text-muted mb-1">Working on:</p>
                    <p className="text-xs truncate">{bot.current_ticket.title}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Recent Tickets */}
        {recentTickets.length > 0 ? (
          <div className="bg-card border border-card-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-card-border">
              <h3 className="text-xs font-semibold text-muted">Recent Tickets</h3>
            </div>
            <div className="divide-y divide-card-border">
              {recentTickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  href="/dispatch"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-surface/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{ticket.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <TicketStatusBadge status={ticket.status} />
                      <TicketPriorityBadge priority={ticket.priority} />
                      {ticket.assigned_bot && (
                        <span className="text-[10px] text-muted">
                          {ticket.assigned_bot.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-muted shrink-0">
                    {formatDate(ticket.created_at)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 bg-card border border-card-border rounded-xl">
            <Zap size={24} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-xs text-muted">No tickets dispatched yet</p>
          </div>
        )}
      </div>

      {/* Projects Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base md:text-lg font-bold font-[family-name:var(--font-heading)]">
            Projects
          </h2>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setGithubModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-accent text-black hover:bg-accent/90 transition-colors min-h-[44px]"
              >
                <Github size={14} />
                <span className="hidden sm:inline">Import from GitHub</span>
                <span className="sm:hidden">Import</span>
              </button>
              <button
                onClick={() => setAddProjectModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-card-border text-muted hover:text-foreground hover:bg-surface transition-colors min-h-[44px]"
              >
                <FolderPlus size={14} />
                <span className="hidden sm:inline">Add Manually</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          )}
        </div>

        {projectCards.length === 0 ? (
          <div className="text-center py-12 md:py-16 bg-card border border-card-border rounded-xl">
            <Boxes
              size={32}
              className="mx-auto text-muted-foreground mb-3"
            />
            <p className="text-sm text-muted mb-1">
              {isAdmin ? "No projects yet" : "No projects assigned to you"}
            </p>
            <p className="text-xs text-muted-foreground mb-4 px-4">
              {isAdmin
                ? "Import repos from GitHub or add a project manually to get started."
                : "Ask an admin to grant you access to projects."}
            </p>
            {isAdmin && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setGithubModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium rounded-lg bg-accent text-black hover:bg-accent/90 transition-colors min-h-[44px]"
                >
                  <Github size={14} />
                  Import from GitHub
                </button>
                <button
                  onClick={() => setAddProjectModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium rounded-lg border border-card-border text-muted hover:text-foreground hover:bg-surface transition-colors min-h-[44px]"
                >
                  <FolderPlus size={14} />
                  Add Manually
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
            {projectCards.map((card) => (
              <ProjectCard key={card.project.id} data={card} onDelete={handleDeleteProject} />
            ))}
          </div>
        )}
      </div>

      <GitHubImportModal
        open={githubModalOpen}
        onClose={() => setGithubModalOpen(false)}
        onImported={refresh}
      />
      <AddProjectModal
        open={addProjectModalOpen}
        onClose={() => setAddProjectModalOpen(false)}
        onAdded={refresh}
      />
    </div>
  );
}

function ProjectCard({ data, onDelete }: { data: ProjectCardData; onDelete: (id: string) => void }) {
  const { project, health, bugCounts, passRate, openIssues } = data;

  return (
    <Link
      href={`/project/${project.slug}`}
      className="block bg-card border border-card-border rounded-xl p-4 md:p-5 hover:border-accent/30 transition-all group active:scale-[0.98]"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <HealthDot health={health} />
            <h3 className="text-sm font-semibold truncate group-hover:text-accent transition-colors">
              {project.name}
            </h3>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <PlatformBadge platform={project.platform} />
            <StatusBadge status={project.status} />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {openIssues > 0 && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent-pink/10 text-accent-pink">
              {openIssues} open
            </span>
          )}
          {project.url && (
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-2 rounded-lg text-muted-foreground hover:text-accent-blue hover:bg-surface transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <ExternalLink size={14} />
            </a>
          )}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (confirm(`Delete "${project.name}"? Bugs, test cases, and checklists will also be removed.`)) {
                onDelete(project.id);
              }
            }}
            className="p-2 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-surface transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center opacity-0 group-hover:opacity-100"
            title="Delete project"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {bugCounts.total > 0 && (
        <div className="flex items-center gap-3 mb-3 text-xs text-muted">
          {bugCounts.critical > 0 && (
            <span className="flex items-center gap-1">
              <SeverityDot severity="critical" />
              {bugCounts.critical}
            </span>
          )}
          {bugCounts.high > 0 && (
            <span className="flex items-center gap-1">
              <SeverityDot severity="high" />
              {bugCounts.high}
            </span>
          )}
          {bugCounts.medium > 0 && (
            <span className="flex items-center gap-1">
              <SeverityDot severity="medium" />
              {bugCounts.medium}
            </span>
          )}
          {bugCounts.low > 0 && (
            <span className="flex items-center gap-1">
              <SeverityDot severity="low" />
              {bugCounts.low}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted pt-3 border-t border-card-border">
        <span>Tests: {passRate}% passing</span>
        {project.last_tested && (
          <span>Tested {formatDate(project.last_tested)}</span>
        )}
      </div>
    </Link>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
