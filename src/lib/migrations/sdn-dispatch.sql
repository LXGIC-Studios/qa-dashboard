-- SDN Dispatch System Migration
-- Adds bot registry, ticket dispatch, and ticket logging tables

-- ============ Bots Table ============
CREATE TABLE IF NOT EXISTS bots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  endpoint_token text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'busy')),
  current_ticket_id uuid,
  last_seen timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ============ Tickets Table ============
CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  github_repo text,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'assigned', 'in-progress', 'review', 'done', 'failed')),
  assigned_bot_id uuid REFERENCES bots(id) ON DELETE SET NULL,
  prompt text,
  result text,
  branch_name text,
  pr_url text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Add FK from bots.current_ticket_id -> tickets.id (deferred because tickets table didn't exist yet)
ALTER TABLE bots
  ADD CONSTRAINT bots_current_ticket_id_fkey
  FOREIGN KEY (current_ticket_id) REFERENCES tickets(id) ON DELETE SET NULL;

-- ============ Ticket Logs Table ============
CREATE TABLE IF NOT EXISTS ticket_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  bot_id uuid REFERENCES bots(id) ON DELETE SET NULL,
  message text NOT NULL,
  log_type text NOT NULL DEFAULT 'info' CHECK (log_type IN ('info', 'error', 'progress', 'complete')),
  created_at timestamptz DEFAULT now()
);

-- ============ Enable RLS ============
ALTER TABLE bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_logs ENABLE ROW LEVEL SECURITY;

-- ============ RLS Policies ============
-- Authenticated users: full access (internal tool)
CREATE POLICY "Authenticated users full access to bots"
  ON bots FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users full access to tickets"
  ON tickets FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users full access to ticket_logs"
  ON ticket_logs FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Service role has full access by default (bypasses RLS)
-- Bots authenticate via their endpoint_token, and the server validates
-- using the service role key, so no additional bot-specific policies needed.

-- ============ Indexes ============
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_bot ON tickets(assigned_bot_id);
CREATE INDEX IF NOT EXISTS idx_tickets_project ON tickets(project_id);
CREATE INDEX IF NOT EXISTS idx_ticket_logs_ticket ON ticket_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_bots_endpoint_token ON bots(endpoint_token);
CREATE INDEX IF NOT EXISTS idx_bots_status ON bots(status);
