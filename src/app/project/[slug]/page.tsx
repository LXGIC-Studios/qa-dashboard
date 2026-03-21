"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Plus,
  FlaskConical,
  Bug as BugIcon,
  ClipboardCheck,
  Clock,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  getProject,
  getBugsByProject,
  getTestCasesByProject,
  getChecklist,
  getHistoryByProject,
  addBug,
  updateBug,
  deleteBug,
  addTestCase,
  updateTestCase,
  deleteTestCase,
  toggleChecklistItem,
  getProjectHealth,
  addHistoryEntry,
} from "@/lib/store";
import type { Project, Bug, TestCase, ChecklistItem, HistoryEntry } from "@/lib/types";
import {
  PlatformBadge,
  StatusBadge,
  SeverityBadge,
  BugStatusBadge,
  TestStatusBadge,
  CategoryBadge,
  HealthDot,
} from "@/components/badges";
import { BugModal } from "@/components/bug-modal";
import { TestCaseModal } from "@/components/test-case-modal";

type Tab = "tests" | "bugs" | "checklist" | "history";

export default function ProjectDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("tests");
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [bugModalOpen, setBugModalOpen] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [editingBug, setEditingBug] = useState<Bug | null>(null);
  const [editingTest, setEditingTest] = useState<TestCase | null>(null);

  const refresh = useCallback(() => {
    const p = getProject(slug);
    if (p) {
      setProject(p);
      setBugs(getBugsByProject(p.id));
      setTestCases(getTestCasesByProject(p.id));
      setChecklist(getChecklist(p.id));
      setHistory(getHistoryByProject(p.id));
    }
  }, [slug]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted">Project not found</p>
      </div>
    );
  }

  const health = getProjectHealth(project.id);

  const tabs: { id: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: "tests", label: "Test Cases", icon: FlaskConical, count: testCases.length },
    {
      id: "bugs",
      label: "Bugs",
      icon: BugIcon,
      count: bugs.filter((b) => b.status === "open" || b.status === "in-progress").length,
    },
    { id: "checklist", label: "Checklist", icon: ClipboardCheck },
    { id: "history", label: "History", icon: Clock },
  ];

  const handleSaveBug = (bug: Bug) => {
    if (editingBug) {
      updateBug(bug);
    } else {
      addBug(bug);
    }
    setEditingBug(null);
    refresh();
  };

  const handleDeleteBug = (id: string) => {
    deleteBug(id);
    refresh();
  };

  const handleSaveTest = (tc: TestCase) => {
    if (editingTest) {
      updateTestCase(tc);
    } else {
      addTestCase(tc);
      addHistoryEntry({
        id: `hist-${Date.now()}`,
        projectId: project.id,
        type: "test-run",
        description: `Added test case: ${tc.name}`,
        timestamp: new Date().toISOString(),
      });
    }
    setEditingTest(null);
    refresh();
  };

  const handleDeleteTest = (id: string) => {
    deleteTestCase(id);
    refresh();
  };

  const handleToggleChecklist = (id: string) => {
    toggleChecklistItem(id);
    refresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft size={14} />
          Back to Dashboard
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <HealthDot health={health} />
              <h1 className="text-2xl font-bold font-[family-name:var(--font-heading)] tracking-tight">
                {project.name}
              </h1>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <PlatformBadge platform={project.platform} />
              <StatusBadge status={project.status} />
              {project.url && (
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-accent-blue hover:underline"
                >
                  {project.url.replace(/^https?:\/\//, "")}
                  <ExternalLink size={10} />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-card-border overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <tab.icon size={15} />
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id ? "bg-accent/10" : "bg-surface"
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "tests" && (
        <TestCasesTab
          testCases={testCases}
          onAdd={() => { setEditingTest(null); setTestModalOpen(true); }}
          onEdit={(tc) => { setEditingTest(tc); setTestModalOpen(true); }}
          onDelete={handleDeleteTest}
        />
      )}
      {activeTab === "bugs" && (
        <BugsTab
          bugs={bugs}
          onAdd={() => { setEditingBug(null); setBugModalOpen(true); }}
          onEdit={(bug) => { setEditingBug(bug); setBugModalOpen(true); }}
          onDelete={handleDeleteBug}
        />
      )}
      {activeTab === "checklist" && (
        <ChecklistTab checklist={checklist} onToggle={handleToggleChecklist} />
      )}
      {activeTab === "history" && <HistoryTab history={history} />}

      {/* Modals */}
      <BugModal
        open={bugModalOpen}
        onClose={() => { setBugModalOpen(false); setEditingBug(null); }}
        onSave={handleSaveBug}
        bug={editingBug}
        projectId={project.id}
      />
      <TestCaseModal
        open={testModalOpen}
        onClose={() => { setTestModalOpen(false); setEditingTest(null); }}
        onSave={handleSaveTest}
        testCase={editingTest}
        projectId={project.id}
      />
    </div>
  );
}

/* ===== Test Cases Tab ===== */
function TestCasesTab({
  testCases,
  onAdd,
  onEdit,
  onDelete,
}: {
  testCases: TestCase[];
  onAdd: () => void;
  onEdit: (tc: TestCase) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted">{testCases.length} test cases</p>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-accent text-black hover:bg-accent/90 transition-colors"
        >
          <Plus size={14} />
          Add Test Case
        </button>
      </div>

      {testCases.length === 0 ? (
        <EmptyState message="No test cases yet" onAction={onAdd} actionLabel="Add first test case" />
      ) : (
        <div className="space-y-2">
          {testCases.map((tc) => (
            <div
              key={tc.id}
              className="bg-card border border-card-border rounded-lg p-4 flex items-start justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-sm font-medium">{tc.name}</span>
                  <TestStatusBadge status={tc.status} />
                  <CategoryBadge category={tc.category} />
                </div>
                {tc.description && (
                  <p className="text-xs text-muted mt-1">{tc.description}</p>
                )}
                {tc.expectedResult && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Expected: {tc.expectedResult}
                  </p>
                )}
                {tc.lastRun && (
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Last run: {tc.lastRun}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => onEdit(tc)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => onDelete(tc.id)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-accent-pink hover:bg-surface transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ===== Bugs Tab ===== */
function BugsTab({
  bugs,
  onAdd,
  onEdit,
  onDelete,
}: {
  bugs: Bug[];
  onAdd: () => void;
  onEdit: (bug: Bug) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted">{bugs.length} bugs</p>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-accent-pink text-white hover:bg-accent-pink/90 transition-colors"
        >
          <Plus size={14} />
          Report Bug
        </button>
      </div>

      {bugs.length === 0 ? (
        <EmptyState message="No bugs reported" onAction={onAdd} actionLabel="Report first bug" />
      ) : (
        <div className="space-y-2">
          {bugs.map((bug) => (
            <div
              key={bug.id}
              className="bg-card border border-card-border rounded-lg p-4 flex items-start justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-sm font-medium">{bug.title}</span>
                  <SeverityBadge severity={bug.severity} />
                  <BugStatusBadge status={bug.status} />
                </div>
                <p className="text-xs text-muted mt-1">{bug.description}</p>
                {bug.stepsToReproduce && (
                  <div className="mt-2 p-2 bg-surface rounded text-xs text-muted-foreground whitespace-pre-line">
                    {bug.stepsToReproduce}
                  </div>
                )}
                <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                  {bug.assignedTo && <span>Assigned to: {bug.assignedTo}</span>}
                  <span>Created: {new Date(bug.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => onEdit(bug)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => onDelete(bug.id)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-accent-pink hover:bg-surface transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ===== Checklist Tab ===== */
function ChecklistTab({
  checklist,
  onToggle,
}: {
  checklist: ChecklistItem[];
  onToggle: (id: string) => void;
}) {
  const checked = checklist.filter((c) => c.checked).length;
  const total = checklist.length;
  const pct = total > 0 ? Math.round((checked / total) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted">
          {checked}/{total} complete ({pct}%)
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-surface rounded-full h-2 mb-6">
        <div
          className="bg-accent h-2 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="space-y-1">
        {checklist.map((item) => (
          <label
            key={item.id}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-card cursor-pointer transition-colors"
          >
            <input
              type="checkbox"
              checked={item.checked}
              onChange={() => onToggle(item.id)}
              className="w-4 h-4 rounded border-card-border bg-surface text-accent focus:ring-accent/20 accent-[#00FF66]"
            />
            <span
              className={`text-sm ${
                item.checked ? "text-muted line-through" : "text-foreground"
              }`}
            >
              {item.label}
            </span>
            <span className="text-[10px] text-muted-foreground ml-auto">
              {item.category}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

/* ===== History Tab ===== */
function HistoryTab({ history }: { history: HistoryEntry[] }) {
  const typeStyles: Record<string, { color: string; label: string }> = {
    "test-run": { color: "bg-accent-blue", label: "Test Run" },
    "bug-found": { color: "bg-accent-pink", label: "Bug Found" },
    "bug-resolved": { color: "bg-accent", label: "Bug Resolved" },
    release: { color: "bg-purple-500", label: "Release" },
    "checklist-update": { color: "bg-yellow-400", label: "Checklist" },
  };

  return (
    <div>
      {history.length === 0 ? (
        <div className="text-center py-12 text-muted text-sm">
          No activity recorded yet
        </div>
      ) : (
        <div className="space-y-0">
          {history.map((entry, idx) => {
            const style = typeStyles[entry.type] || {
              color: "bg-muted",
              label: entry.type,
            };
            return (
              <div key={entry.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-2.5 h-2.5 rounded-full ${style.color} mt-1.5`} />
                  {idx < history.length - 1 && (
                    <div className="w-px flex-1 bg-card-border" />
                  )}
                </div>
                <div className="pb-6 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-medium text-muted uppercase">
                      {style.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm">{entry.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ===== Empty State ===== */
function EmptyState({
  message,
  onAction,
  actionLabel,
}: {
  message: string;
  onAction: () => void;
  actionLabel: string;
}) {
  return (
    <div className="text-center py-12 bg-card border border-card-border rounded-xl">
      <p className="text-sm text-muted mb-3">{message}</p>
      <button
        onClick={onAction}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-accent text-black hover:bg-accent/90 transition-colors"
      >
        <Plus size={14} />
        {actionLabel}
      </button>
    </div>
  );
}
