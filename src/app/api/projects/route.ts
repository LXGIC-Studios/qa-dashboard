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

  const { data: projects, error: projError } = await supabase
    .from("projects")
    .select("*")
    .order("name");

  if (projError) {
    return NextResponse.json({ error: projError.message }, { status: 500 });
  }

  const { data: bugs, error: bugsError } = await supabase
    .from("bugs")
    .select("project_id, status");

  if (bugsError) {
    return NextResponse.json({ error: bugsError.message }, { status: 500 });
  }

  // Count open tickets per project
  const openCounts: Record<string, number> = {};
  for (const bug of bugs || []) {
    if (bug.status === "open" || bug.status === "in-progress") {
      openCounts[bug.project_id] = (openCounts[bug.project_id] || 0) + 1;
    }
  }

  const result = (projects || []).map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    github_url: p.github_url,
    url: p.url,
    platform: p.platform,
    status: p.status,
    description: p.description,
    language: p.language,
    open_tickets: openCounts[p.id] || 0,
  }));

  return NextResponse.json(result);
}
