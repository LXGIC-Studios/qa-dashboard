import { createClient } from "@/lib/supabase/client";
import type {
  Project,
  Bug,
  TestCase,
  ChecklistItem,
  ActivityEntry,
  Profile,
  ProjectAccess,
} from "./types";
import { generateChecklistForProject } from "./seed-data";

function supabase() {
  return createClient();
}

// ============ Profiles ============

export async function getProfiles(): Promise<Profile[]> {
  const { data } = await supabase()
    .from("profiles")
    .select("*")
    .order("full_name");
  return (data as Profile[]) || [];
}

export async function getCurrentUser(): Promise<Profile | null> {
  const {
    data: { user },
  } = await supabase().auth.getUser();
  if (!user) return null;
  const { data } = await supabase()
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  return data as Profile | null;
}

// ============ Project Access ============

export async function getProjectAccess(projectId: string): Promise<ProjectAccess[]> {
  const { data } = await supabase()
    .from("project_access")
    .select("*")
    .eq("project_id", projectId);
  return (data as ProjectAccess[]) || [];
}

export async function grantProjectAccess(
  projectId: string,
  userId: string,
  grantedBy: string
): Promise<void> {
  await supabase()
    .from("project_access")
    .upsert({ project_id: projectId, user_id: userId, granted_by: grantedBy });
}

export async function revokeProjectAccess(
  projectId: string,
  userId: string
): Promise<void> {
  await supabase()
    .from("project_access")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", userId);
}

export async function getAccessibleProjects(user: Profile): Promise<Project[]> {
  if (user.role === "admin") {
    return getProjects();
  }
  // Testers: only projects they have access to
  const { data: accessRows } = await supabase()
    .from("project_access")
    .select("project_id")
    .eq("user_id", user.id);
  if (!accessRows || accessRows.length === 0) return [];
  const projectIds = accessRows.map((r: { project_id: string }) => r.project_id);
  const { data } = await supabase()
    .from("projects")
    .select("*")
    .in("id", projectIds)
    .order("name");
  return (data as Project[]) || [];
}

// ============ Projects ============

export async function getProjects(): Promise<Project[]> {
  const { data } = await supabase()
    .from("projects")
    .select("*")
    .order("name");
  return (data as Project[]) || [];
}

export async function getProject(slug: string): Promise<Project | null> {
  const { data } = await supabase()
    .from("projects")
    .select("*")
    .eq("slug", slug)
    .single();
  return data as Project | null;
}

export async function getProjectById(id: string): Promise<Project | null> {
  const { data } = await supabase()
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();
  return data as Project | null;
}

export async function addProject(
  project: Omit<Project, "id" | "created_at" | "updated_at">
): Promise<Project | null> {
  const { data } = await supabase()
    .from("projects")
    .insert(project)
    .select()
    .single();
  if (data) {
    const items = generateChecklistForProject(data.id);
    await supabase().from("checklist_items").insert(items);
  }
  return data as Project | null;
}

export async function addProjects(
  projects: Omit<Project, "id" | "created_at" | "updated_at">[]
): Promise<Project[]> {
  const { data } = await supabase()
    .from("projects")
    .insert(projects)
    .select();
  if (data && data.length > 0) {
    const allChecklist = data.flatMap((p: Project) =>
      generateChecklistForProject(p.id)
    );
    await supabase().from("checklist_items").insert(allChecklist);
  }
  return (data as Project[]) || [];
}

// ============ Bugs ============

const BUG_SELECT = "*, assigned_profile:profiles!bugs_assigned_to_fkey(*), reported_profile:profiles!bugs_reported_by_fkey(*)";

export async function getBugs(): Promise<Bug[]> {
  const { data } = await supabase()
    .from("bugs")
    .select(BUG_SELECT)
    .order("created_at", { ascending: false });
  return (data as Bug[]) || [];
}

export async function getBugsByProject(projectId: string): Promise<Bug[]> {
  const { data } = await supabase()
    .from("bugs")
    .select(BUG_SELECT)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  return (data as Bug[]) || [];
}

export async function addBug(
  bug: Omit<Bug, "id" | "created_at" | "updated_at" | "assigned_profile" | "reported_profile">
): Promise<Bug | null> {
  const { data } = await supabase()
    .from("bugs")
    .insert(bug)
    .select()
    .single();
  if (data) {
    await addActivityEntry({
      project_id: bug.project_id,
      user_id: bug.reported_by || undefined,
      action: "bug-found",
      details: `Found: ${bug.title}`,
    });
  }
  return data as Bug | null;
}

export async function updateBug(
  id: string,
  updates: Partial<Omit<Bug, "id" | "assigned_profile" | "reported_profile">>
): Promise<Bug | null> {
  const { data } = await supabase()
    .from("bugs")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (data && updates.status === "resolved") {
    await addActivityEntry({
      project_id: data.project_id,
      action: "bug-resolved",
      details: `Resolved: ${data.title}`,
    });
  }
  return data as Bug | null;
}

export async function deleteBug(id: string): Promise<void> {
  await supabase().from("bugs").delete().eq("id", id);
}

// ============ Test Cases ============

export async function getTestCases(): Promise<TestCase[]> {
  const { data } = await supabase()
    .from("test_cases")
    .select("*, run_by_profile:profiles!test_cases_run_by_fkey(*)")
    .order("created_at", { ascending: false });
  return (data as TestCase[]) || [];
}

export async function getTestCasesByProject(
  projectId: string
): Promise<TestCase[]> {
  const { data } = await supabase()
    .from("test_cases")
    .select("*, run_by_profile:profiles!test_cases_run_by_fkey(*)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  return (data as TestCase[]) || [];
}

export async function addTestCase(
  tc: Omit<TestCase, "id" | "created_at" | "run_by_profile">
): Promise<TestCase | null> {
  const { data } = await supabase()
    .from("test_cases")
    .insert(tc)
    .select()
    .single();
  return data as TestCase | null;
}

export async function updateTestCase(
  id: string,
  updates: Partial<Omit<TestCase, "id" | "run_by_profile">>
): Promise<TestCase | null> {
  const { data } = await supabase()
    .from("test_cases")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  return data as TestCase | null;
}

export async function deleteTestCase(id: string): Promise<void> {
  await supabase().from("test_cases").delete().eq("id", id);
}

// ============ Checklist ============

export async function getChecklist(projectId: string): Promise<ChecklistItem[]> {
  const { data } = await supabase()
    .from("checklist_items")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at");
  return (data as ChecklistItem[]) || [];
}

export async function toggleChecklistItem(
  id: string,
  checked: boolean,
  userId?: string
): Promise<void> {
  await supabase()
    .from("checklist_items")
    .update({ checked, checked_by: checked ? userId : null })
    .eq("id", id);
}

// ============ Activity Log ============

export async function getActivity(): Promise<ActivityEntry[]> {
  const { data } = await supabase()
    .from("activity_log")
    .select("*, user_profile:profiles!activity_log_user_id_fkey(*)")
    .order("created_at", { ascending: false });
  return (data as ActivityEntry[]) || [];
}

export async function getActivityByProject(
  projectId: string
): Promise<ActivityEntry[]> {
  const { data } = await supabase()
    .from("activity_log")
    .select("*, user_profile:profiles!activity_log_user_id_fkey(*)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  return (data as ActivityEntry[]) || [];
}

export async function addActivityEntry(entry: {
  project_id: string;
  user_id?: string;
  action: string;
  details?: string;
}): Promise<void> {
  await supabase().from("activity_log").insert(entry);
}

// ============ Computed Helpers ============

export function computeProjectHealth(bugs: Bug[]): "green" | "yellow" | "red" {
  const openBugs = bugs.filter(
    (b) => b.status === "open" || b.status === "in-progress"
  );
  const criticalOpen = openBugs.filter((b) => b.severity === "critical").length;
  const highOpen = openBugs.filter((b) => b.severity === "high").length;

  if (criticalOpen > 0) return "red";
  if (highOpen > 1 || openBugs.length > 5) return "red";
  if (highOpen > 0 || openBugs.length > 2) return "yellow";
  return "green";
}

export function computeBugCounts(bugs: Bug[]) {
  const openBugs = bugs.filter(
    (b) => b.status === "open" || b.status === "in-progress"
  );
  return {
    critical: openBugs.filter((b) => b.severity === "critical").length,
    high: openBugs.filter((b) => b.severity === "high").length,
    medium: openBugs.filter((b) => b.severity === "medium").length,
    low: openBugs.filter((b) => b.severity === "low").length,
    total: openBugs.length,
  };
}

export function computeTestPassRate(tests: TestCase[]): number {
  if (tests.length === 0) return 100;
  const run = tests.filter((t) => t.status !== "untested");
  if (run.length === 0) return 0;
  const passed = run.filter((t) => t.status === "pass").length;
  return Math.round((passed / run.length) * 100);
}
