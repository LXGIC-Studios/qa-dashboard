import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  const supabase = getServiceClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const botId = searchParams.get("bot");
  const projectId = searchParams.get("project");

  let query = supabase
    .from("tickets")
    .select("*, assigned_bot:bots!tickets_assigned_bot_id_fkey(id, name, status), project:projects(id, name, slug)")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (botId) query = query.eq("assigned_bot_id", botId);
  if (projectId) query = query.eq("project_id", projectId);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
