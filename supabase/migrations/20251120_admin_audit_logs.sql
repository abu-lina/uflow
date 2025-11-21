-- Create admin_audit_logs table for compliance and security
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('provider', 'user', 'system')),
  target_id TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key to users table (if users table exists)
-- Note: Adjust column name if your users table uses different column names
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    -- Check if user_id column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'user_id') THEN
      ALTER TABLE admin_audit_logs
        ADD CONSTRAINT fk_admin_audit_logs_admin_user_id
        FOREIGN KEY (admin_user_id) REFERENCES users(user_id)
        ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_user_id ON admin_audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target_type_id ON admin_audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON admin_audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_id = admin_audit_logs.admin_user_id
      AND users.role IN ('admin', 'moderator')
    )
  );

-- Policy: System can insert audit logs (via service role)
-- Note: Service role bypasses RLS, so this is mainly for documentation

-- Add comment
COMMENT ON TABLE admin_audit_logs IS 'Audit log for admin actions. Tracks all administrative operations for compliance and security.';

