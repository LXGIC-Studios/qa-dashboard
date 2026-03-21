import type { Platform, ProjectStatus, Severity, BugStatus, TestStatus, Category } from "@/lib/types";

export function PlatformBadge({ platform }: { platform: Platform }) {
  const styles: Record<Platform, string> = {
    web: "bg-accent-blue/10 text-accent-blue border-accent-blue/20",
    ios: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    both: "bg-accent/10 text-accent border-accent/20",
  };
  const labels: Record<Platform, string> = {
    web: "Web",
    ios: "iOS",
    both: "Web + iOS",
  };
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${styles[platform]}`}>
      {labels[platform]}
    </span>
  );
}

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const styles: Record<ProjectStatus, string> = {
    active: "bg-accent/10 text-accent",
    "in-dev": "bg-yellow-500/10 text-yellow-400",
    maintenance: "bg-muted/10 text-muted",
  };
  const labels: Record<ProjectStatus, string> = {
    active: "Active",
    "in-dev": "In Development",
    maintenance: "Maintenance",
  };
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

export function SeverityDot({ severity }: { severity: Severity }) {
  const colors: Record<Severity, string> = {
    critical: "bg-accent-pink",
    high: "bg-orange-500",
    medium: "bg-yellow-400",
    low: "bg-accent-blue",
  };
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${colors[severity]}`}
      title={severity}
    />
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const styles: Record<Severity, string> = {
    critical: "bg-accent-pink/10 text-accent-pink border-accent-pink/20",
    high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    low: "bg-accent-blue/10 text-accent-blue border-accent-blue/20",
  };
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border capitalize ${styles[severity]}`}>
      {severity}
    </span>
  );
}

export function BugStatusBadge({ status }: { status: BugStatus }) {
  const styles: Record<BugStatus, string> = {
    open: "bg-accent-pink/10 text-accent-pink",
    "in-progress": "bg-yellow-500/10 text-yellow-400",
    resolved: "bg-accent/10 text-accent",
    "wont-fix": "bg-muted/10 text-muted",
  };
  const labels: Record<BugStatus, string> = {
    open: "Open",
    "in-progress": "In Progress",
    resolved: "Resolved",
    "wont-fix": "Won't Fix",
  };
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

export function TestStatusBadge({ status }: { status: TestStatus }) {
  const styles: Record<TestStatus, string> = {
    pass: "bg-accent/10 text-accent",
    fail: "bg-accent-pink/10 text-accent-pink",
    skip: "bg-yellow-500/10 text-yellow-400",
    untested: "bg-muted/10 text-muted",
  };
  const labels: Record<TestStatus, string> = {
    pass: "Pass",
    fail: "Fail",
    skip: "Skip",
    untested: "Untested",
  };
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

export function CategoryBadge({ category }: { category: Category }) {
  return (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface text-muted capitalize">
      {category}
    </span>
  );
}

export function HealthDot({ health }: { health: "green" | "yellow" | "red" }) {
  const colors = {
    green: "bg-accent shadow-[0_0_6px_rgba(0,255,102,0.5)]",
    yellow: "bg-yellow-400 shadow-[0_0_6px_rgba(234,179,8,0.5)]",
    red: "bg-accent-pink shadow-[0_0_6px_rgba(255,0,102,0.5)]",
  };
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${colors[health]}`} />;
}
