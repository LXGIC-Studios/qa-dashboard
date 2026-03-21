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
import type { Project, Bug as BugType, TestCase, Profile } from "@/lib/types";
import {
  PlatformBadge,
  StatusBadge,
  SeverityDot,
  HealthDot,
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
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isAdmin = currentUser?.role === "admin";

  const statCards = [
    {
      label: "Total Projects",
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
      label: "Tests Passing",
      value: `${overallPassRate}%`,
      icon: CheckCircle2,
      color: overallPassRate >= 80 ? "text-accent" : "text-yellow-400",
    },
    {
      label: "Ready for Release",
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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-[family-name:var(--font-heading)] tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-muted mt-1">
          QA overview across {isAdmin ? "all" : "your"} LXGIC Studios projects
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-card border border-card-border rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted font-medium">
                {stat.label}
              </span>
              <stat.icon size={16} className={stat.color} />
            </div>
            <p
              className={`text-2xl font-bold font-[family-name:var(--font-heading)] ${stat.color}`}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold font-[family-name:var(--font-heading)]">
            Projects
          </h2>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setGithubModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-accent text-black hover:bg-accent/90 transition-colors"
              >
                <Github size={14} />
                Import from GitHub
              </button>
              <button
                onClick={() => setAddProjectModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-card-border text-muted hover:text-foreground hover:bg-surface transition-colors"
              >
                <FolderPlus size={14} />
                Add Manually
              </button>
            </div>
          )}
        </div>

        {projectCards.length === 0 ? (
          <div className="text-center py-16 bg-card border border-card-border rounded-xl">
            <Boxes
              size={32}
              className="mx-auto text-muted-foreground mb-3"
            />
            <p className="text-sm text-muted mb-1">
              {isAdmin ? "No projects yet" : "No projects assigned to you"}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              {isAdmin
                ? "Import repos from GitHub or add a project manually to get started."
                : "Ask an admin to grant you access to projects."}
            </p>
            {isAdmin && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setGithubModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-accent text-black hover:bg-accent/90 transition-colors"
                >
                  <Github size={14} />
                  Import from GitHub
                </button>
                <button
                  onClick={() => setAddProjectModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-card-border text-muted hover:text-foreground hover:bg-surface transition-colors"
                >
                  <FolderPlus size={14} />
                  Add Manually
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projectCards.map((card) => (
              <ProjectCard key={card.project.id} data={card} />
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

function ProjectCard({ data }: { data: ProjectCardData }) {
  const { project, health, bugCounts, passRate, openIssues } = data;

  return (
    <Link
      href={`/project/${project.slug}`}
      className="block bg-card border border-card-border rounded-xl p-5 hover:border-accent/30 transition-all group"
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
              className="p-1.5 rounded-lg text-muted-foreground hover:text-accent-blue hover:bg-surface transition-colors"
            >
              <ExternalLink size={14} />
            </a>
          )}
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
