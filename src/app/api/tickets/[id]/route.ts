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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("bugs")
    .select("*, project:projects(*), reporter:profiles!bugs_reported_by_fkey(*)")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  const ticket = {
    id: data.id,
    title: data.title,
    type: data.type || "bug",
    severity: data.severity,
    status: data.status,
    description: data.description,
    steps_to_reproduce: data.steps_to_reproduce,
    expected_behavior: data.expected_behavior,
    actual_behavior: data.actual_behavior,
    device_browser: data.device_browser,
    page_screen: data.page_screen,
    screenshot_url: data.screenshot_url,
    resolution_note: data.resolution_note,
    claimed_by: data.claimed_by,
    branch_name: data.branch_name,
    claimed_at: data.claimed_at,
    resolved_at: data.resolved_at,
    project: data.project
      ? {
          name: data.project.name,
          slug: data.project.slug,
          github_url: data.project.github_url,
        }
      : null,
    reported_by: data.reporter
      ? {
          name: data.reporter.full_name,
          email: data.reporter.email,
        }
      : null,
    created_at: data.created_at,
  };

  return NextResponse.json(ticket);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const allowedFields = [
    "status",
    "resolution_note",
    "claimed_by",
    "branch_name",
    "claimed_at",
    "resolved_at",
  ];
  const allowedStatuses = [
    "open",
    "in-progress",
    "resolved",
    "verified",
    "wont-fix",
  ];

  const updates: Record<string, string> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  if (updates.status && !allowedStatuses.includes(updates.status)) {
    return NextResponse.json(
      { error: `Invalid status. Allowed: ${allowedStatuses.join(", ")}` },
      { status: 400 }
    );
  }

  // Auto-set timestamps based on status changes
  if (updates.status === "in-progress" && !updates.claimed_at) {
    updates.claimed_at = new Date().toISOString();
  }
  if (updates.status === "resolved" && !updates.resolved_at) {
    updates.resolved_at = new Date().toISOString();
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("bugs")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, ticket: data });
}
