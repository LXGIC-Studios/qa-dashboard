import { Project, Bug, TestCase, ChecklistItem, HistoryEntry } from "./types";
import { generateChecklistForProject } from "./seed-data";

const KEYS = {
  projects: "qa-projects",
  bugs: "qa-bugs",
  testCases: "qa-test-cases",
  checklist: "qa-checklist",
  history: "qa-history",
} as const;

function getItem<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function initializeStore(): void {
  // No-op — data starts empty, users add projects via import or manual form
}

// Projects
export function getProjects(): Project[] {
  return getItem<Project[]>(KEYS.projects, []);
}

export function getProject(slug: string): Project | undefined {
  return getProjects().find((p) => p.slug === slug);
}

export function getProjectById(id: string): Project | undefined {
  return getProjects().find((p) => p.id === id);
}

export function addProject(project: Project): void {
  const projects = getProjects();
  projects.push(project);
  setItem(KEYS.projects, projects);

  // Generate default checklist for the new project
  const allChecklists = getItem<ChecklistItem[]>(KEYS.checklist, []);
  const newChecklist = generateChecklistForProject(project.id);
  setItem(KEYS.checklist, [...allChecklists, ...newChecklist]);
}

export function addProjects(newProjects: Project[]): void {
  const projects = getProjects();
  const allChecklists = getItem<ChecklistItem[]>(KEYS.checklist, []);
  const newChecklists: ChecklistItem[] = [];

  for (const project of newProjects) {
    projects.push(project);
    newChecklists.push(...generateChecklistForProject(project.id));
  }

  setItem(KEYS.projects, projects);
  setItem(KEYS.checklist, [...allChecklists, ...newChecklists]);
}

// Bugs
export function getBugs(): Bug[] {
  return getItem<Bug[]>(KEYS.bugs, []);
}

export function getBugsByProject(projectId: string): Bug[] {
  return getBugs().filter((b) => b.projectId === projectId);
}

export function addBug(bug: Bug): void {
  const bugs = getBugs();
  bugs.push(bug);
  setItem(KEYS.bugs, bugs);
  addHistoryEntry({
    id: `hist-${Date.now()}`,
    projectId: bug.projectId,
    type: "bug-found",
    description: `Found: ${bug.title}`,
    timestamp: new Date().toISOString(),
  });
}

export function updateBug(updated: Bug): void {
  const bugs = getBugs().map((b) => (b.id === updated.id ? updated : b));
  setItem(KEYS.bugs, bugs);
  if (updated.status === "resolved") {
    addHistoryEntry({
      id: `hist-${Date.now()}`,
      projectId: updated.projectId,
      type: "bug-resolved",
      description: `Resolved: ${updated.title}`,
      timestamp: new Date().toISOString(),
    });
  }
}

export function deleteBug(id: string): void {
  const bugs = getBugs().filter((b) => b.id !== id);
  setItem(KEYS.bugs, bugs);
}

// Test Cases
export function getTestCases(): TestCase[] {
  return getItem<TestCase[]>(KEYS.testCases, []);
}

export function getTestCasesByProject(projectId: string): TestCase[] {
  return getTestCases().filter((tc) => tc.projectId === projectId);
}

export function addTestCase(tc: TestCase): void {
  const cases = getTestCases();
  cases.push(tc);
  setItem(KEYS.testCases, cases);
}

export function updateTestCase(updated: TestCase): void {
  const cases = getTestCases().map((tc) =>
    tc.id === updated.id ? updated : tc
  );
  setItem(KEYS.testCases, cases);
}

export function deleteTestCase(id: string): void {
  const cases = getTestCases().filter((tc) => tc.id !== id);
  setItem(KEYS.testCases, cases);
}

// Checklist
export function getChecklist(projectId: string): ChecklistItem[] {
  return getItem<ChecklistItem[]>(KEYS.checklist, []).filter(
    (c) => c.projectId === projectId
  );
}

export function toggleChecklistItem(id: string): void {
  const all = getItem<ChecklistItem[]>(KEYS.checklist, []);
  const updated = all.map((c) =>
    c.id === id ? { ...c, checked: !c.checked } : c
  );
  setItem(KEYS.checklist, updated);
}

// History
export function getHistory(): HistoryEntry[] {
  return getItem<HistoryEntry[]>(KEYS.history, []);
}

export function getHistoryByProject(projectId: string): HistoryEntry[] {
  return getHistory()
    .filter((h) => h.projectId === projectId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function addHistoryEntry(entry: HistoryEntry): void {
  const history = getHistory();
  history.push(entry);
  setItem(KEYS.history, history);
}

// Computed helpers
export function getProjectHealth(projectId: string): "green" | "yellow" | "red" {
  const bugs = getBugsByProject(projectId);
  const openBugs = bugs.filter((b) => b.status === "open" || b.status === "in-progress");
  const criticalOpen = openBugs.filter((b) => b.severity === "critical").length;
  const highOpen = openBugs.filter((b) => b.severity === "high").length;

  if (criticalOpen > 0) return "red";
  if (highOpen > 1 || openBugs.length > 5) return "red";
  if (highOpen > 0 || openBugs.length > 2) return "yellow";
  return "green";
}

export function getBugCounts(projectId: string) {
  const bugs = getBugsByProject(projectId).filter(
    (b) => b.status === "open" || b.status === "in-progress"
  );
  return {
    critical: bugs.filter((b) => b.severity === "critical").length,
    high: bugs.filter((b) => b.severity === "high").length,
    medium: bugs.filter((b) => b.severity === "medium").length,
    low: bugs.filter((b) => b.severity === "low").length,
    total: bugs.length,
  };
}

export function getTestPassRate(projectId: string): number {
  const tests = getTestCasesByProject(projectId);
  if (tests.length === 0) return 100;
  const run = tests.filter((t) => t.status !== "untested");
  if (run.length === 0) return 0;
  const passed = run.filter((t) => t.status === "pass").length;
  return Math.round((passed / run.length) * 100);
}
