import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function authorize(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;
  const token = authHeader.replace("Bearer ", "");
  return token === process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export async function GET(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const { searchParams } = new URL(request.url);
  const projectSlug = searchParams.get("project");
  const status = searchParams.get("status");

  let query = supabase
    .from("bugs")
    .select("*, project:projects(*), reporter:profiles!bugs_reported_by_fkey(*)")
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  if (projectSlug) {
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("slug", projectSlug)
      .single();
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    query = query.eq("project_id", project.id);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  interface RawTicket {
    id: string;
    title: string;
    type: string;
    severity: string;
    status: string;
    description: string;
    steps_to_reproduce: string | null;
    expected_behavior: string | null;
    actual_behavior: string | null;
    device_browser: string | null;
    page_screen: string | null;
    screenshot_url: string | null;
    resolution_note: string | null;
    created_at: string;
    project: {
      name: string;
      slug: string;
      github_url: string | null;
    } | null;
    reporter: {
      full_name: string;
      email: string;
    } | null;
  }

  const tickets = (data as RawTicket[]).map((ticket) => ({
    id: ticket.id,
    title: ticket.title,
    type: ticket.type || "bug",
    severity: ticket.severity,
    status: ticket.status,
    description: ticket.description,
    steps_to_reproduce: ticket.steps_to_reproduce,
    expected_behavior: ticket.expected_behavior,
    actual_behavior: ticket.actual_behavior,
    device_browser: ticket.device_browser,
    page_screen: ticket.page_screen,
    screenshot_url: ticket.screenshot_url,
    resolution_note: ticket.resolution_note,
    project: ticket.project
      ? {
          name: ticket.project.name,
          slug: ticket.project.slug,
          github_url: ticket.project.github_url,
        }
      : null,
    reported_by: ticket.reporter
      ? {
          name: ticket.reporter.full_name,
          email: ticket.reporter.email,
        }
      : null,
    created_at: ticket.created_at,
  }));

  return NextResponse.json(tickets);
}
