import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = getServiceClient();

  // Find the bot by its endpoint token
  const { data: bot, error: botError } = await supabase
    .from("bots")
    .select("*")
    .eq("endpoint_token", token)
    .single();

  if (botError || !bot) {
    return NextResponse.json({ error: "Bot not found" }, { status: 404 });
  }

  // Update last_seen
  await supabase
    .from("bots")
    .update({ last_seen: new Date().toISOString() })
    .eq("id", bot.id);

  // If bot is busy and has a current ticket, return it
  if (bot.status === "busy" && bot.current_ticket_id) {
    const { data: ticket } = await supabase
      .from("tickets")
      .select("*")
      .eq("id", bot.current_ticket_id)
      .single();

    if (ticket) {
      return NextResponse.json({ ticket });
    }
  }

  // Check for queued tickets that need assignment
  if (bot.status === "online") {
    const { data: queuedTickets } = await supabase
      .from("tickets")
      .select("*")
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(1);

    if (queuedTickets && queuedTickets.length > 0) {
      const ticket = queuedTickets[0];

      // Assign the ticket to this bot
      await supabase
        .from("tickets")
        .update({
          assigned_bot_id: bot.id,
          status: "assigned",
          assigned_at: new Date().toISOString(),
        })
        .eq("id", ticket.id);

      await supabase
        .from("bots")
        .update({
          status: "busy",
          current_ticket_id: ticket.id,
          last_seen: new Date().toISOString(),
        })
        .eq("id", bot.id);

      await supabase.from("ticket_logs").insert({
        ticket_id: ticket.id,
        bot_id: bot.id,
        message: `Ticket picked up by ${bot.name} via polling`,
        log_type: "info",
      });

      return NextResponse.json({
        ticket: { ...ticket, status: "assigned", assigned_bot_id: bot.id },
      });
    }
  }

  // No work available
  return NextResponse.json({ ticket: null });
}
