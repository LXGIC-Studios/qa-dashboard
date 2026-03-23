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
  const ticketId = searchParams.get("ticket_id");

  if (!ticketId) {
    return NextResponse.json({ error: "ticket_id is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("ticket_logs")
    .select("*, bot:bots(id, name)")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
