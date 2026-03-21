"use client";

import { useEffect, useState } from "react";
import {
  getProjects,
  getBugs,
  getTestCases,
  getHistory,
  getProjectHealth,
  getTestPassRate,
  getTestCasesByProject,
} from "@/lib/store";
import type { Project, Bug, HistoryEntry } from "@/lib/types";
import { HealthDot, SeverityDot } from "@/components/badges";

export default function ReportsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [testStats, setTestStats] = useState<{ projectName: string; total: number; pass: number; rate: number }[]>([]);

  useEffect(() => {
    const projs = getProjects();
    setProjects(projs);
    setBugs(getBugs());
    setHistory(
      getHistory().sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
    );

    const stats = projs.map((p) => {
      const tests = getTestCasesByProject(p.id);
      const run = tests.filter((t) => t.status !== "untested");
      const pass = run.filter((t) => t.status === "pass").length;
      return {
        projectName: p.name,
        total: tests.length,
        pass,
        rate: getTestPassRate(p.id),
      };
    }).filter((s) => s.total > 0);
    setTestStats(stats);
  }, []);

  // Bug severity distribution
  const openBugs = bugs.filter((b) => b.status === "open" || b.status === "in-progress");
  const severityCounts = {
    critical: openBugs.filter((b) => b.severity === "critical").length,
    high: openBugs.filter((b) => b.severity === "high").length,
    medium: openBugs.filter((b) => b.severity === "medium").length,
    low: openBugs.filter((b) => b.severity === "low").length,
  };
  const maxSeverity = Math.max(...Object.values(severityCounts), 1);

  // Bug trends - last 30 days
  const bugTrend = generateBugTrend(bugs);

  // Projects by health
  const healthGroups = { green: [] as Project[], yellow: [] as Project[], red: [] as Project[] };
  for (const p of projects) {
    const h = getProjectHealth(p.id);
    healthGroups[h].push(p);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-[family-name:var(--font-heading)] tracking-tight">
          Reports
        </h1>
        <p className="text-sm text-muted mt-1">
          Analytics and trends across all projects
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bug Trends */}
        <div className="bg-card border border-card-border rounded-xl p-5">
          <h3 className="text-sm font-semibold font-[family-name:var(--font-heading)] mb-4">
            Bug Activity (Last 30 Days)
          </h3>
          <BugTrendChart data={bugTrend} />
        </div>

        {/* Bug Severity Distribution */}
        <div className="bg-card border border-card-border rounded-xl p-5">
          <h3 className="text-sm font-semibold font-[family-name:var(--font-heading)] mb-4">
            Open Bugs by Severity
          </h3>
          <div className="space-y-3">
            {(["critical", "high", "medium", "low"] as const).map((sev) => (
              <div key={sev} className="flex items-center gap-3">
                <div className="w-16 flex items-center gap-1.5">
                  <SeverityDot severity={sev} />
                  <span className="text-xs text-muted capitalize">{sev}</span>
                </div>
                <div className="flex-1 bg-surface rounded-full h-5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      sev === "critical"
                        ? "bg-accent-pink"
                        : sev === "high"
                        ? "bg-orange-500"
                        : sev === "medium"
                        ? "bg-yellow-400"
                        : "bg-accent-blue"
                    }`}
                    style={{ width: `${(severityCounts[sev] / maxSeverity) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium w-6 text-right">{severityCounts[sev]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Projects by Health */}
        <div className="bg-card border border-card-border rounded-xl p-5">
          <h3 className="text-sm font-semibold font-[family-name:var(--font-heading)] mb-4">
            Projects by Health Score
          </h3>
          <div className="space-y-4">
            {(["green", "yellow", "red"] as const).map((health) => (
              <div key={health}>
                <div className="flex items-center gap-2 mb-2">
                  <HealthDot health={health} />
                  <span className="text-xs font-medium capitalize">
                    {health === "green" ? "Healthy" : health === "yellow" ? "Warning" : "Critical"}
                  </span>
                  <span className="text-xs text-muted">({healthGroups[health].length})</span>
                </div>
                {healthGroups[health].length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 ml-5">
                    {healthGroups[health].map((p) => (
                      <span
                        key={p.id}
                        className="text-[10px] px-2 py-1 rounded-md bg-surface text-muted"
                      >
                        {p.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground ml-5">No projects</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Test Coverage */}
        <div className="bg-card border border-card-border rounded-xl p-5">
          <h3 className="text-sm font-semibold font-[family-name:var(--font-heading)] mb-4">
            Test Coverage per Project
          </h3>
          {testStats.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">No test data yet</p>
          ) : (
            <div className="space-y-3">
              {testStats.map((stat) => (
                <div key={stat.projectName} className="flex items-center gap-3">
                  <span className="text-xs text-muted w-32 truncate" title={stat.projectName}>
                    {stat.projectName}
                  </span>
                  <div className="flex-1 bg-surface rounded-full h-5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        stat.rate >= 80
                          ? "bg-accent"
                          : stat.rate >= 50
                          ? "bg-yellow-400"
                          : "bg-accent-pink"
                      }`}
                      style={{ width: `${stat.rate}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium w-10 text-right">
                    {stat.rate}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-card border border-card-border rounded-xl p-5">
        <h3 className="text-sm font-semibold font-[family-name:var(--font-heading)] mb-4">
          Recent Activity
        </h3>
        {history.length === 0 ? (
          <p className="text-sm text-muted text-center py-8">No activity yet</p>
        ) : (
          <div className="space-y-3">
            {history.slice(0, 10).map((entry) => {
              const proj = projects.find((p) => p.id === entry.projectId);
              return (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 py-2 border-b border-card-border last:border-0"
                >
                  <ActivityDot type={entry.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{entry.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {proj && (
                        <span className="text-[10px] text-muted">{proj.name}</span>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityDot({ type }: { type: string }) {
  const colors: Record<string, string> = {
    "test-run": "bg-accent-blue",
    "bug-found": "bg-accent-pink",
    "bug-resolved": "bg-accent",
    release: "bg-purple-500",
    "checklist-update": "bg-yellow-400",
  };
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full mt-1.5 shrink-0 ${
        colors[type] || "bg-muted"
      }`}
    />
  );
}

/* Simple bar chart for bug trends */
function generateBugTrend(bugs: Bug[]) {
  const now = new Date();
  const days: { label: string; opened: number; resolved: number }[] = [];

  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    const opened = bugs.filter((b) => b.createdAt.startsWith(dateStr)).length;
    const resolved = bugs.filter(
      (b) => b.status === "resolved" && b.updatedAt.startsWith(dateStr)
    ).length;

    days.push({ label, opened, resolved });
  }

  return days;
}

function BugTrendChart({
  data,
}: {
  data: { label: string; opened: number; resolved: number }[];
}) {
  const maxVal = Math.max(...data.map((d) => Math.max(d.opened, d.resolved)), 1);
  const barHeight = 80;

  return (
    <div>
      <div className="flex items-end gap-[2px] h-20">
        {data.map((day, idx) => {
          const openedH = (day.opened / maxVal) * barHeight;
          const resolvedH = (day.resolved / maxVal) * barHeight;
          return (
            <div
              key={idx}
              className="flex-1 flex flex-col items-center justify-end gap-[1px] group relative"
            >
              {day.opened > 0 && (
                <div
                  className="w-full bg-accent-pink/70 rounded-sm min-h-[2px]"
                  style={{ height: `${openedH}px` }}
                />
              )}
              {day.resolved > 0 && (
                <div
                  className="w-full bg-accent/70 rounded-sm min-h-[2px]"
                  style={{ height: `${resolvedH}px` }}
                />
              )}
              {/* Tooltip */}
              {(day.opened > 0 || day.resolved > 0) && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-surface border border-card-border rounded px-2 py-1 text-[10px] whitespace-nowrap hidden group-hover:block z-10">
                  <p className="font-medium">{day.label}</p>
                  {day.opened > 0 && <p className="text-accent-pink">{day.opened} opened</p>}
                  {day.resolved > 0 && <p className="text-accent">{day.resolved} resolved</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2 text-[9px] text-muted-foreground">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
      <div className="flex items-center gap-4 mt-3 text-[10px]">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-accent-pink/70" /> Opened
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-accent/70" /> Resolved
        </span>
      </div>
    </div>
  );
}
