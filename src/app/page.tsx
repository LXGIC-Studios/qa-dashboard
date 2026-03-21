"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Boxes,
  Bug,
  CheckCircle2,
  Rocket,
  ExternalLink,
} from "lucide-react";
import {
  getProjects,
  getBugs,
  getTestCases,
  getProjectHealth,
  getBugCounts,
  getTestPassRate,
  getChecklist,
} from "@/lib/store";
import type { Project } from "@/lib/types";
import { PlatformBadge, StatusBadge, SeverityDot, HealthDot } from "@/components/badges";

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [totalOpenBugs, setTotalOpenBugs] = useState(0);
  const [overallPassRate, setOverallPassRate] = useState(0);
  const [readyForRelease, setReadyForRelease] = useState(0);

  useEffect(() => {
    const projs = getProjects();
    setProjects(projs);

    const bugs = getBugs();
    const openBugs = bugs.filter(
      (b) => b.status === "open" || b.status === "in-progress"
    ).length;
    setTotalOpenBugs(openBugs);

    const allTests = getTestCases();
    const runTests = allTests.filter((t) => t.status !== "untested");
    const passRate =
      runTests.length > 0
        ? Math.round(
            (runTests.filter((t) => t.status === "pass").length /
              runTests.length) *
              100
          )
        : 100;
    setOverallPassRate(passRate);

    let rfrCount = 0;
    for (const p of projs) {
      const health = getProjectHealth(p.id);
      const checklist = getChecklist(p.id);
      const checkRate =
        checklist.length > 0
          ? checklist.filter((c) => c.checked).length / checklist.length
          : 0;
      if (health === "green" && checkRate > 0.8) rfrCount++;
    }
    setReadyForRelease(rfrCount);
  }, []);

  const statCards = [
    {
      label: "Total Projects",
      value: projects.length,
      icon: Boxes,
      color: "text-accent",
    },
    {
      label: "Open Bugs",
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-[family-name:var(--font-heading)] tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-muted mt-1">
          QA overview across all LXGIC Studios projects
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-card border border-card-border rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted font-medium">{stat.label}</span>
              <stat.icon size={16} className={stat.color} />
            </div>
            <p className={`text-2xl font-bold font-[family-name:var(--font-heading)] ${stat.color}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-bold font-[family-name:var(--font-heading)] mb-4">
          Projects
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const health = getProjectHealth(project.id);
  const bugCounts = getBugCounts(project.id);
  const passRate = getTestPassRate(project.id);

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
        {project.lastTested && (
          <span>Tested {formatDate(project.lastTested)}</span>
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
