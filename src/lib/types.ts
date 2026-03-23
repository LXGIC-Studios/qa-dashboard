export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "tester";
  avatar_url?: string;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  url?: string;
  github_url?: string;
  platform: "web" | "ios" | "both";
  status: "active" | "in-dev" | "maintenance";
  description?: string;
  language?: string;
  last_tested?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Bug {
  id: string;
  project_id: string;
  title: string;
  description: string;
  type: BugType;
  severity: "critical" | "high" | "medium" | "low";
  status: "open" | "in-progress" | "resolved" | "verified" | "wont-fix";
  steps_to_reproduce?: string;
  expected_behavior?: string;
  actual_behavior?: string;
  device_browser?: string;
  screenshot_url?: string;
  page_screen?: string;
  resolution_note?: string;
  assigned_to?: string;
  reported_by?: string;
  claimed_by?: string;
  branch_name?: string;
  claimed_at?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  assigned_profile?: Profile;
  reported_profile?: Profile;
}

export interface TestCase {
  id: string;
  project_id: string;
  name: string;
  category: "auth" | "payments" | "ui" | "api" | "performance" | "security" | "other";
  description?: string;
  expected_result?: string;
  status: "pass" | "fail" | "skip" | "untested";
  last_run?: string;
  run_by?: string;
  created_at?: string;
  // Joined fields
  run_by_profile?: Profile;
}

export interface ChecklistItem {
  id: string;
  project_id: string;
  label: string;
  checked: boolean;
  category: string;
  checked_by?: string;
  created_at?: string;
}

export interface ActivityEntry {
  id: string;
  project_id: string;
  user_id?: string;
  action: string;
  details?: string;
  created_at: string;
  // Joined fields
  user_profile?: Profile;
}

export interface ProjectAccess {
  id: string;
  project_id: string;
  user_id: string;
  granted_by?: string;
  created_at: string;
}

// ============ SDN Types ============

export type BotStatus = "online" | "offline" | "busy";
export type TicketPriority = "critical" | "high" | "medium" | "low";
export type TicketStatus = "queued" | "assigned" | "in-progress" | "review" | "done" | "failed";
export type TicketLogType = "info" | "error" | "progress" | "complete";

export interface Bot {
  id: string;
  name: string;
  endpoint_token: string;
  status: BotStatus;
  current_ticket_id?: string;
  last_seen?: string;
  created_at: string;
  // Joined fields
  current_ticket?: SDNTicket;
}

export interface SDNTicket {
  id: string;
  project_id?: string;
  title: string;
  description?: string;
  github_repo?: string;
  priority: TicketPriority;
  status: TicketStatus;
  assigned_bot_id?: string;
  prompt?: string;
  result?: string;
  branch_name?: string;
  pr_url?: string;
  created_by?: string;
  assigned_at?: string;
  completed_at?: string;
  created_at: string;
  // Joined fields
  assigned_bot?: Bot;
  project?: Project;
  creator?: Profile;
}

export interface TicketLog {
  id: string;
  ticket_id: string;
  bot_id?: string;
  message: string;
  log_type: TicketLogType;
  created_at: string;
  // Joined fields
  bot?: Bot;
}

// ============ QA Types ============

export type BugType = "bug" | "feature" | "ui" | "performance" | "security" | "other";
export type Severity = Bug["severity"];
export type BugStatus = Bug["status"];
export type TestStatus = TestCase["status"];
export type Platform = Project["platform"];
export type ProjectStatus = Project["status"];
export type Category = TestCase["category"];
