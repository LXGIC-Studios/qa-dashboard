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
  const { project_id, title, description, github_repo, priority, created_by } = body;

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  // Create the ticket first
  const shortId = crypto.randomUUID().split("-")[0];
  const prompt = `Clone ${github_repo || "the repository"}, checkout main, create branch fix/${shortId}, address this issue: ${description || title}. When done, push the branch and report back.`;

  const ticketInsert: Record<string, unknown> = {
    project_id: project_id || null,
    title,
    description: description || null,
    github_repo: github_repo || null,
    priority: priority || "medium",
    status: "queued",
    prompt,
    created_by: created_by || null,
  };

  // Find an available bot
  const { data: availableBots } = await supabase
    .from("bots")
    .select("*")
    .eq("status", "online");

  if (availableBots && availableBots.length > 0) {
    // Pick a random available bot
    const bot = availableBots[Math.floor(Math.random() * availableBots.length)];

    ticketInsert.assigned_bot_id = bot.id;
    ticketInsert.status = "assigned";
    ticketInsert.assigned_at = new Date().toISOString();

    // Insert the ticket
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .insert(ticketInsert)
      .select()
      .single();

    if (ticketError) {
      return NextResponse.json({ error: ticketError.message }, { status: 500 });
    }

    // Update bot status to busy and link ticket
    await supabase
      .from("bots")
      .update({
        status: "busy",
        current_ticket_id: ticket.id,
        last_seen: new Date().toISOString(),
      })
      .eq("id", bot.id);

    // Add a log entry
    await supabase.from("ticket_logs").insert({
      ticket_id: ticket.id,
      bot_id: bot.id,
      message: `Ticket assigned to ${bot.name}`,
      log_type: "info",
    });

    // Ping the bot's webhook if configured
    if (bot.webhook_url) {
      fetch(bot.webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "ticket_assigned",
          ticket,
          bot: { id: bot.id, name: bot.name },
        }),
      }).catch(() => { /* fire and forget */ });
    }

    return NextResponse.json({
      ...ticket,
      assigned_bot: { id: bot.id, name: bot.name, status: "busy" },
    }, { status: 201 });
  }

  // No available bot - queue the ticket
  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .insert(ticketInsert)
    .select()
    .single();

  if (ticketError) {
    return NextResponse.json({ error: ticketError.message }, { status: 500 });
  }

  // Add a log entry
  await supabase.from("ticket_logs").insert({
    ticket_id: ticket.id,
    message: "Ticket queued - no bots available",
    log_type: "info",
  });

  return NextResponse.json(ticket, { status: 201 });
}
