export interface Project {
  id: string;
  name: string;
  slug: string;
  url?: string;
  platform: "web" | "ios" | "both";
  status: "active" | "in-dev" | "maintenance";
  lastTested?: string;
}

export interface Bug {
  id: string;
  projectId: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  status: "open" | "in-progress" | "resolved" | "wont-fix";
  stepsToReproduce?: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestCase {
  id: string;
  projectId: string;
  name: string;
  category: "auth" | "payments" | "ui" | "api" | "performance" | "security" | "other";
  description?: string;
  expectedResult?: string;
  status: "pass" | "fail" | "skip" | "untested";
  lastRun?: string;
}

export interface ChecklistItem {
  id: string;
  projectId: string;
  label: string;
  checked: boolean;
  category: string;
}

export interface HistoryEntry {
  id: string;
  projectId: string;
  type: "test-run" | "bug-found" | "bug-resolved" | "release" | "checklist-update";
  description: string;
  timestamp: string;
}

export type Severity = Bug["severity"];
export type BugStatus = Bug["status"];
export type TestStatus = TestCase["status"];
export type Platform = Project["platform"];
export type ProjectStatus = Project["status"];
export type Category = TestCase["category"];
