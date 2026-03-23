import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  // This endpoint uses the service role key server-side.
  // For external bot registration, require Bearer token auth.
  // For dashboard UI, the request comes from the same origin (no auth header needed
  // since the user is already authenticated via Supabase session).
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    const token = authHeader.replace("Bearer ", "");
    if (token !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  // If no auth header, allow (dashboard UI call - protected by middleware auth)

  const body = await request.json();
  const { name, endpoint_token, webhook_url } = body;

  if (!name || !endpoint_token) {
    return NextResponse.json(
      { error: "name and endpoint_token are required" },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("bots")
    .insert({ name, endpoint_token, status: "offline", webhook_url: webhook_url || null })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A bot with this endpoint_token already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
