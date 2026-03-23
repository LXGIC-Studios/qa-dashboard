import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = getServiceClient();

  // Find the bot
  const { data: bot, error: botError } = await supabase
    .from("bots")
    .select("*")
    .eq("endpoint_token", token)
    .single();

  if (botError || !bot) {
    return NextResponse.json({ error: "Bot not found" }, { status: 404 });
  }

  const body = await request.json();
  const { ticket_id, status, message, branch_name, pr_url, result } = body;

  if (!ticket_id) {
    return NextResponse.json({ error: "ticket_id is required" }, { status: 400 });
  }

  // Verify the ticket exists and is assigned to this bot
  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .select("*")
    .eq("id", ticket_id)
    .single();

  if (ticketError || !ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  // Build ticket updates
  const ticketUpdates: Record<string, unknown> = {};
  const allowedStatuses = ["assigned", "in-progress", "review", "done", "failed"];

  if (status && allowedStatuses.includes(status)) {
    ticketUpdates.status = status;
  }
  if (branch_name) ticketUpdates.branch_name = branch_name;
  if (pr_url) ticketUpdates.pr_url = pr_url;
  if (result) ticketUpdates.result = result;

  if (status === "done" || status === "failed") {
    ticketUpdates.completed_at = new Date().toISOString();
  }

  // Update the ticket
  if (Object.keys(ticketUpdates).length > 0) {
    const { error: updateError } = await supabase
      .from("tickets")
      .update(ticketUpdates)
      .eq("id", ticket_id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  // Add log entry
  if (message) {
    const logType = status === "done" ? "complete" : status === "failed" ? "error" : "progress";
    await supabase.from("ticket_logs").insert({
      ticket_id,
      bot_id: bot.id,
      message,
      log_type: logType,
    });
  }

  // If done or failed, free up the bot
  if (status === "done" || status === "failed") {
    await supabase
      .from("bots")
      .update({
        status: "online",
        current_ticket_id: null,
        last_seen: new Date().toISOString(),
      })
      .eq("id", bot.id);
  } else {
    // Just update last_seen
    await supabase
      .from("bots")
      .update({ last_seen: new Date().toISOString() })
      .eq("id", bot.id);
  }

  return NextResponse.json({ success: true });
}
