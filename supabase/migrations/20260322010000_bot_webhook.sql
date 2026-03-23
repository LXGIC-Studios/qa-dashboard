-- Add webhook_url to bots for push notifications on ticket assignment
ALTER TABLE bots ADD COLUMN IF NOT EXISTS webhook_url text;
