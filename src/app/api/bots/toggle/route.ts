import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const supabase = getServiceClient();
  const body = await request.json();
  const { bot_id, status } = body;

  if (!bot_id || !status) {
    return NextResponse.json(
      { error: "bot_id and status are required" },
      { status: 400 }
    );
  }

  if (!["online", "offline"].includes(status)) {
    return NextResponse.json(
      { error: "status must be 'online' or 'offline'" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("bots")
    .update({
      status,
      last_seen: new Date().toISOString(),
      ...(status === "offline" ? { current_ticket_id: null } : {}),
    })
    .eq("id", bot_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const supabase = getServiceClient();
  const body = await request.json();
  const { bot_id } = body;

  if (!bot_id) {
    return NextResponse.json({ error: "bot_id is required" }, { status: 400 });
  }

  const { error } = await supabase.from("bots").delete().eq("id", bot_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
