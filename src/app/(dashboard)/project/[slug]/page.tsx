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
  getActivityByProject,
  addBug,
  updateBug,
  deleteBug,
  addTestCase,
  updateTestCase,
  deleteTestCase,
  toggleChecklistItem,
  computeProjectHealth,
  addActivityEntry,
  getProfiles,
  getCurrentUser,
} from "@/lib/store";
import type {
  Project,
  Bug,
  TestCase,
  ChecklistItem,
  ActivityEntry,
  Profile,
} from "@/lib/types";
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
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [bugModalOpen, setBugModalOpen] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [editingBug, setEditingBug] = useState<Bug | null>(null);
  const [editingTest, setEditingTest] = useState<TestCase | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const p = await getProject(slug);
    if (p) {
      setProject(p);
      const [b, tc, cl, act, profs, user] = await Promise.all([
        getBugsByProject(p.id),
        getTestCasesByProject(p.id),
        getChecklist(p.id),
        getActivityByProject(p.id),
        getProfiles(),
        getCurrentUser(),
      ]);
      setBugs(b);
      setTestCases(tc);
      setChecklist(cl);
      setActivity(act);
      setProfiles(profs);
      setCurrentUser(user);
    }
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted">Project not found</p>
      </div>
    );
  }

  const health = computeProjectHealth(bugs);

  const tabs: {
    id: Tab;
    label: string;
    icon: React.ElementType;
    count?: number;
  }[] = [
    {
      id: "tests",
      label: "Test Cases",
      icon: FlaskConical,
      count: testCases.length,
    },
    {
      id: "bugs",
      label: "Bugs",
      icon: BugIcon,
      count: bugs.filter(
        (b) => b.status === "open" || b.status === "in-progress"
      ).length,
    },
    { id: "checklist", label: "Checklist", icon: ClipboardCheck },
    { id: "history", label: "History", icon: Clock },
  ];

  const handleSaveBug = async (bugData: {
    title: string;
    description: string;
    severity: Bug["severity"];
    status: Bug["status"];
    steps_to_reproduce?: string;
    assigned_to?: string;
    project_id: string;
  }) => {
    if (editingBug) {
      await updateBug(editingBug.id, bugData);
    } else {
      await addBug({
        ...bugData,
        reported_by: currentUser?.id,
      });
    }
    setEditingBug(null);
    refresh();
  };

  const handleDeleteBug = async (id: string) => {
    await deleteBug(id);
    refresh();
  };

  const handleSaveTest = async (tcData: {
    name: string;
    category: TestCase["category"];
    description?: string;
    expected_result?: string;
    status: TestCase["status"];
    project_id: string;
  }) => {
    if (editingTest) {
      await updateTestCase(editingTest.id, {
        ...tcData,
        last_run:
          tcData.status !== "untested" ? new Date().toISOString() : undefined,
        run_by: tcData.status !== "untested" ? currentUser?.id : undefined,
      });
    } else {
      await addTestCase({
        ...tcData,
        last_run:
          tcData.status !== "untested" ? new Date().toISOString() : undefined,
        run_by: tcData.status !== "untested" ? currentUser?.id : undefined,
      });
      await addActivityEntry({
        project_id: project.id,
        user_id: currentUser?.id,
        action: "test-run",
        details: `Added test case: ${tcData.name}`,
      });
    }
    setEditingTest(null);
    refresh();
  };

  const handleDeleteTest = async (id: string) => {
    await deleteTestCase(id);
    refresh();
  };

  const handleToggleChecklist = async (id: string, checked: boolean) => {
    await toggleChecklistItem(id, !checked, currentUser?.id);
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
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? "bg-accent/10" : "bg-surface"
                }`}
              >
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
          onAdd={() => {
            setEditingTest(null);
            setTestModalOpen(true);
          }}
          onEdit={(tc) => {
            setEditingTest(tc);
            setTestModalOpen(true);
          }}
          onDelete={handleDeleteTest}
        />
      )}
      {activeTab === "bugs" && (
        <BugsTab
          bugs={bugs}
          profiles={profiles}
          onAdd={() => {
            setEditingBug(null);
            setBugModalOpen(true);
          }}
          onEdit={(bug) => {
            setEditingBug(bug);
            setBugModalOpen(true);
          }}
          onDelete={handleDeleteBug}
        />
      )}
      {activeTab === "checklist" && (
        <ChecklistTab checklist={checklist} onToggle={handleToggleChecklist} />
      )}
      {activeTab === "history" && <HistoryTab activity={activity} />}

      {/* Modals */}
      <BugModal
        open={bugModalOpen}
        onClose={() => {
          setBugModalOpen(false);
          setEditingBug(null);
        }}
        onSave={handleSaveBug}
        bug={editingBug}
        projectId={project.id}
        profiles={profiles}
      />
      <TestCaseModal
        open={testModalOpen}
        onClose={() => {
          setTestModalOpen(false);
          setEditingTest(null);
        }}
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
        <EmptyState
          message="No test cases yet"
          onAction={onAdd}
          actionLabel="Add first test case"
        />
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
                {tc.expected_result && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Expected: {tc.expected_result}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                  {tc.run_by_profile && (
                    <span>Run by: {tc.run_by_profile.full_name}</span>
                  )}
                  {tc.last_run && (
                    <span>
                      Last run: {new Date(tc.last_run).toLocaleDateString()}
                    </span>
                  )}
                </div>
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
  profiles,
  onAdd,
  onEdit,
  onDelete,
}: {
  bugs: Bug[];
  profiles: Profile[];
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
        <EmptyState
          message="No bugs reported"
          onAction={onAdd}
          actionLabel="Report first bug"
        />
      ) : (
        <div className="space-y-2">
          {bugs.map((bug) => {
            const assignedProfile = bug.assigned_profile;
            const reportedProfile = bug.reported_profile;
            return (
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
                  {bug.steps_to_reproduce && (
                    <div className="mt-2 p-2 bg-surface rounded text-xs text-muted-foreground whitespace-pre-line">
                      {bug.steps_to_reproduce}
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                    {assignedProfile && (
                      <span>Assigned to: {assignedProfile.full_name}</span>
                    )}
                    {reportedProfile && (
                      <span>Reported by: {reportedProfile.full_name}</span>
                    )}
                    <span>
                      Created:{" "}
                      {new Date(bug.created_at).toLocaleDateString()}
                    </span>
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
            );
          })}
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
  onToggle: (id: string, checked: boolean) => void;
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
              onChange={() => onToggle(item.id, item.checked)}
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
function HistoryTab({ activity }: { activity: ActivityEntry[] }) {
  const typeStyles: Record<string, { color: string; label: string }> = {
    "test-run": { color: "bg-accent-blue", label: "Test Run" },
    "bug-found": { color: "bg-accent-pink", label: "Bug Found" },
    "bug-resolved": { color: "bg-accent", label: "Bug Resolved" },
    release: { color: "bg-purple-500", label: "Release" },
    "checklist-update": { color: "bg-yellow-400", label: "Checklist" },
  };

  return (
    <div>
      {activity.length === 0 ? (
        <div className="text-center py-12 text-muted text-sm">
          No activity recorded yet
        </div>
      ) : (
        <div className="space-y-0">
          {activity.map((entry, idx) => {
            const style = typeStyles[entry.action] || {
              color: "bg-muted",
              label: entry.action,
            };
            return (
              <div key={entry.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${style.color} mt-1.5`}
                  />
                  {idx < activity.length - 1 && (
                    <div className="w-px flex-1 bg-card-border" />
                  )}
                </div>
                <div className="pb-6 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-medium text-muted uppercase">
                      {style.label}
                    </span>
                    {entry.user_profile && (
                      <span className="text-[10px] text-accent-blue">
                        {entry.user_profile.full_name}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(entry.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm">{entry.details}</p>
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
