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
  Shield,
  Send,
  Monitor,
  FileText,
  Pencil,
  Trash2,
  CheckCircle,
  Zap,
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
  getProjectAccess,
  grantProjectAccess,
  revokeProjectAccess,
} from "@/lib/store";
import type {
  Project,
  Bug,
  TestCase,
  ChecklistItem,
  ActivityEntry,
  Profile,
  BugType,
  Severity,
  BugStatus,
} from "@/lib/types";
import {
  PlatformBadge,
  StatusBadge,
  SeverityBadge,
  BugStatusBadge,
  BugTypeBadge,
  TestStatusBadge,
  CategoryBadge,
  HealthDot,
} from "@/components/badges";
import { BugModal } from "@/components/bug-modal";
import { TestCaseModal } from "@/components/test-case-modal";

type Tab = "tests" | "bugs" | "checklist" | "history" | "access";

export default function ProjectDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("bugs");
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [accessUserIds, setAccessUserIds] = useState<string[]>([]);
  const [bugModalOpen, setBugModalOpen] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [editingBug, setEditingBug] = useState<Bug | null>(null);
  const [editingTest, setEditingTest] = useState<TestCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [dispatchResult, setDispatchResult] = useState<{ botName: string; ticketTitle: string } | null>(null);

  const refresh = useCallback(async () => {
    const p = await getProject(slug);
    if (p) {
      setProject(p);
      const [b, tc, cl, act, profs, user, access] = await Promise.all([
        getBugsByProject(p.id),
        getTestCasesByProject(p.id),
        getChecklist(p.id),
        getActivityByProject(p.id),
        getProfiles(),
        getCurrentUser(),
        getProjectAccess(p.id),
      ]);
      setBugs(b);
      setTestCases(tc);
      setChecklist(cl);
      setActivity(act);
      setProfiles(profs);
      setCurrentUser(user);
      setAccessUserIds(access.map((a) => a.user_id));
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
  const isAdmin = currentUser?.role === "admin";

  // Tester tabs: bugs + history only
  // Admin tabs: bugs, tests, checklist, history, access
  const tabs: {
    id: Tab;
    label: string;
    icon: React.ElementType;
    count?: number;
    adminOnly?: boolean;
  }[] = [
    {
      id: "bugs",
      label: "Issues",
      icon: BugIcon,
      count: bugs.filter(
        (b) => b.status === "open" || b.status === "in-progress"
      ).length,
    },
    {
      id: "tests",
      label: "Tests",
      icon: FlaskConical,
      count: testCases.length,
      adminOnly: true,
    },
    { id: "checklist", label: "Checklist", icon: ClipboardCheck, adminOnly: true },
    { id: "history", label: "History", icon: Clock },
    { id: "access", label: "Access", icon: Shield, adminOnly: true },
  ];

  const visibleTabs = tabs.filter((t) => !t.adminOnly || isAdmin);

  const handleSaveBug = async (bugData: {
    title: string;
    description: string;
    severity: Bug["severity"];
    status: Bug["status"];
    steps_to_reproduce?: string;
    project_id: string;
  }) => {
    if (editingBug) {
      await updateBug(editingBug.id, bugData);
    } else {
      // Save bug locally AND dispatch to SDN
      await addBug({
        ...bugData,
        type: "bug",
        reported_by: currentUser?.id,
      });

      // Auto-dispatch to an available bot
      try {
        const res = await fetch("/api/dispatch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: project?.id,
            title: bugData.title,
            description: `${bugData.description}${bugData.steps_to_reproduce ? '\n\nSteps to reproduce:\n' + bugData.steps_to_reproduce : ''}`,
            github_repo: project?.github_url,
            priority: bugData.severity,
            created_by: currentUser?.id,
          }),
        });
        if (res.ok) {
          const ticket = await res.json();
          const botName = ticket.assigned_bot?.name || null;
          setDispatchResult({
            botName: botName || "queued (no bots online)",
            ticketTitle: bugData.title,
          });
          setTimeout(() => setDispatchResult(null), 5000);
        }
      } catch { /* dispatch failed silently, bug still saved */ }
    }
    setEditingBug(null);
    refresh();
  };

  const handleDeleteBug = async (id: string) => {
    await deleteBug(id);
    refresh();
  };

  const handleVerifyBug = async (id: string) => {
    await updateBug(id, { status: "verified" });
    await addActivityEntry({
      project_id: project.id,
      user_id: currentUser?.id,
      action: "bug-resolved",
      details: `Verified fix for: ${bugs.find((b) => b.id === id)?.title}`,
    });
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

  const handleToggleAccess = async (userId: string) => {
    if (!currentUser || !project) return;
    if (accessUserIds.includes(userId)) {
      await revokeProjectAccess(project.id, userId);
      setAccessUserIds((prev) => prev.filter((id) => id !== userId));
    } else {
      await grantProjectAccess(project.id, userId, currentUser.id);
      setAccessUserIds((prev) => [...prev, userId]);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors mb-4 min-h-[44px] md:min-h-0"
        >
          <ArrowLeft size={14} />
          Back to Dashboard
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <HealthDot health={health} />
              <h1 className="text-xl md:text-2xl font-bold font-[family-name:var(--font-heading)] tracking-tight">
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

          <button
            onClick={() => { setEditingBug(null); setBugModalOpen(true); }}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold rounded-xl bg-accent text-black hover:bg-accent/90 transition-colors shrink-0 min-h-[48px] w-full sm:w-auto"
          >
            <Plus size={16} />
            New Issue
          </button>
        </div>
      </div>

      {/* Dispatch confirmation */}
      {dispatchResult && (
        <div className="bg-accent/10 border border-accent/20 text-accent text-sm rounded-xl px-4 py-3 flex items-center gap-2">
          <Zap size={16} />
          <span>
            <strong>&ldquo;{dispatchResult.ticketTitle}&rdquo;</strong> dispatched → <strong>{dispatchResult.botName}</strong>
          </span>
        </div>
      )}

      {/* Tabs - horizontally scrollable on mobile */}
      <div className="flex items-center gap-1 border-b border-card-border overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 scrollbar-none">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2.5 text-xs md:text-sm font-medium border-b-2 transition-colors whitespace-nowrap min-h-[44px] ${
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
      {activeTab === "tests" && isAdmin && (
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
          slug={slug}
          isAdmin={isAdmin}
          currentUser={currentUser}
          onAdd={() => {
            setEditingBug(null);
            setBugModalOpen(true);
          }}
          onEdit={(bug) => {
            setEditingBug(bug);
            setBugModalOpen(true);
          }}
          onDelete={handleDeleteBug}
          onVerify={handleVerifyBug}
        />
      )}
      {activeTab === "checklist" && isAdmin && (
        <ChecklistTab checklist={checklist} onToggle={handleToggleChecklist} />
      )}
      {activeTab === "history" && <HistoryTab activity={activity} />}
      {activeTab === "access" && isAdmin && (
        <AccessTab
          profiles={profiles}
          accessUserIds={accessUserIds}
          onToggle={handleToggleAccess}
        />
      )}

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
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-accent text-black hover:bg-accent/90 transition-colors min-h-[44px]"
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
              className="bg-card border border-card-border rounded-lg p-4 flex items-start justify-between gap-3"
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
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => onDelete(tc.id)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-accent-pink hover:bg-surface transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
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
  slug,
  isAdmin,
  currentUser,
  onAdd,
  onEdit,
  onDelete,
  onVerify,
}: {
  bugs: Bug[];
  slug: string;
  isAdmin: boolean;
  currentUser: Profile | null;
  onAdd: () => void;
  onEdit: (bug: Bug) => void;
  onDelete: (id: string) => void;
  onVerify: (id: string) => void;
}) {
  const [filterType, setFilterType] = useState<BugType | "all">("all");
  const [filterSeverity, setFilterSeverity] = useState<Severity | "all">("all");
  const [filterStatus, setFilterStatus] = useState<BugStatus | "all">("all");

  // Testers only see their own tickets
  const userBugs = isAdmin
    ? bugs
    : bugs.filter((b) => b.reported_by === currentUser?.id);

  const filteredBugs = userBugs.filter((bug) => {
    if (filterType !== "all" && (bug.type || "bug") !== filterType) return false;
    if (filterSeverity !== "all" && bug.severity !== filterSeverity) return false;
    if (filterStatus !== "all" && bug.status !== filterStatus) return false;
    return true;
  });

  const filterSelectClass =
    "bg-surface border border-card-border rounded-lg px-2 py-2 text-xs text-foreground focus:outline-none focus:border-accent/50 min-h-[44px]";

  return (
    <div>
      <div className="flex flex-col gap-3 mb-4">
        {/* Filters - scrollable row on mobile */}
        <div className="flex items-center gap-2 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 scrollbar-none">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as BugType | "all")}
            className={filterSelectClass}
          >
            <option value="all">All Types</option>
            <option value="bug">Bug</option>
            <option value="feature">Feature</option>
            <option value="ui">UI</option>
            <option value="performance">Performance</option>
            <option value="security">Security</option>
            <option value="other">Other</option>
          </select>
          <select
            value={filterSeverity}
            onChange={(e) =>
              setFilterSeverity(e.target.value as Severity | "all")
            }
            className={filterSelectClass}
          >
            <option value="all">All Severity</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) =>
              setFilterStatus(e.target.value as BugStatus | "all")
            }
            className={filterSelectClass}
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="in-progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="verified">Verified</option>
            <option value="wont-fix">Won&apos;t Fix</option>
          </select>
          <span className="text-xs text-muted whitespace-nowrap">
            {filteredBugs.length} issue{filteredBugs.length !== 1 ? "s" : ""}
          </span>
        </div>
        {/* Action buttons removed - use header button */}
      </div>

      {filteredBugs.length === 0 ? (
        <EmptyState
          message={userBugs.length === 0 ? "No issues reported" : "No issues match filters"}
          onAction={onAdd}
          actionLabel="Report first issue"
        />
      ) : (
        <div className="space-y-2">
          {filteredBugs.map((bug) => {
            const reportedProfile = bug.reported_profile;
            return (
              <div
                key={bug.id}
                className="bg-card border border-card-border rounded-lg p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-medium">{bug.title}</span>
                      <BugTypeBadge type={bug.type || "bug"} />
                      <SeverityBadge severity={bug.severity} />
                      <BugStatusBadge status={bug.status} />
                    </div>
                    <p className="text-xs text-muted mt-1 line-clamp-2">{bug.description}</p>
                    {bug.steps_to_reproduce && (
                      <div className="mt-2 p-2 bg-surface rounded text-xs text-muted-foreground whitespace-pre-line line-clamp-3">
                        {bug.steps_to_reproduce}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground flex-wrap">
                      {bug.device_browser && (
                        <span className="inline-flex items-center gap-1">
                          <Monitor size={10} />
                          {bug.device_browser}
                        </span>
                      )}
                      {bug.page_screen && (
                        <span className="inline-flex items-center gap-1">
                          <FileText size={10} />
                          {bug.page_screen}
                        </span>
                      )}
                      {reportedProfile && (
                        <span>By: {reportedProfile.full_name}</span>
                      )}
                      {bug.claimed_by && (
                        <span>Claimed: {bug.claimed_by}</span>
                      )}
                      {bug.branch_name && (
                        <span>Branch: {bug.branch_name}</span>
                      )}
                      <span>
                        {new Date(bug.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Verify Fix button for resolved tickets */}
                    {bug.status === "resolved" && (
                      <button
                        onClick={() => onVerify(bug.id)}
                        className="p-2 rounded-lg text-accent hover:bg-accent/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                        title="Verify Fix"
                      >
                        <CheckCircle size={16} />
                      </button>
                    )}
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => onEdit(bug)}
                          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => onDelete(bug.id)}
                          className="p-2 rounded-lg text-muted-foreground hover:text-accent-pink hover:bg-surface transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ===== Access Tab ===== */
function AccessTab({
  profiles,
  accessUserIds,
  onToggle,
}: {
  profiles: Profile[];
  accessUserIds: string[];
  onToggle: (userId: string) => void;
}) {
  const testers = profiles.filter((p) => p.role === "tester");

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-sm font-semibold mb-1">Manage Access</h3>
        <p className="text-xs text-muted">
          Select which testers can access this project. Admins always have
          access.
        </p>
      </div>

      {testers.length === 0 ? (
        <div className="text-center py-12 bg-card border border-card-border rounded-xl">
          <p className="text-sm text-muted">No testers registered yet</p>
        </div>
      ) : (
        <div className="bg-card border border-card-border rounded-xl divide-y divide-card-border">
          {testers.map((profile) => {
            const hasAccess = accessUserIds.includes(profile.id);
            return (
              <label
                key={profile.id}
                className="flex items-center gap-4 p-4 hover:bg-surface/50 cursor-pointer transition-colors min-h-[56px]"
              >
                <input
                  type="checkbox"
                  checked={hasAccess}
                  onChange={() => onToggle(profile.id)}
                  className="w-5 h-5 rounded border-card-border bg-surface text-accent focus:ring-accent/20 accent-[#00FF66]"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{profile.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {profile.email}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    hasAccess
                      ? "bg-accent/10 text-accent"
                      : "bg-surface text-muted"
                  }`}
                >
                  {hasAccess ? "Has Access" : "No Access"}
                </span>
              </label>
            );
          })}
        </div>
      )}

      <div className="mt-4 p-4 bg-card border border-card-border rounded-xl">
        <h4 className="text-xs font-semibold text-muted mb-2">
          Admins (always have access)
        </h4>
        <div className="space-y-2">
          {profiles
            .filter((p) => p.role === "admin")
            .map((admin) => (
              <div key={admin.id} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center">
                  <Shield size={12} className="text-accent" />
                </div>
                <span className="text-xs">
                  {admin.full_name}{" "}
                  <span className="text-muted-foreground">({admin.email})</span>
                </span>
              </div>
            ))}
        </div>
      </div>
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
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-card cursor-pointer transition-colors min-h-[48px]"
          >
            <input
              type="checkbox"
              checked={item.checked}
              onChange={() => onToggle(item.id, item.checked)}
              className="w-5 h-5 rounded border-card-border bg-surface text-accent focus:ring-accent/20 accent-[#00FF66]"
            />
            <span
              className={`text-sm flex-1 ${
                item.checked ? "text-muted line-through" : "text-foreground"
              }`}
            >
              {item.label}
            </span>
            <span className="text-[10px] text-muted-foreground">
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
              <div key={entry.id} className="flex gap-3 md:gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${style.color} mt-1.5`}
                  />
                  {idx < activity.length - 1 && (
                    <div className="w-px flex-1 bg-card-border" />
                  )}
                </div>
                <div className="pb-6 flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
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
                  <p className="text-sm break-words">{entry.details}</p>
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
        className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium rounded-lg bg-accent text-black hover:bg-accent/90 transition-colors min-h-[44px]"
      >
        <Plus size={14} />
        {actionLabel}
      </button>
    </div>
  );
}
