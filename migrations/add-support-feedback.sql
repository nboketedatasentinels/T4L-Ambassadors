-- ============================================
-- Support feedback from ambassadors
-- ============================================

CREATE TABLE IF NOT EXISTS support_feedback (
  feedback_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  ambassador_id UUID REFERENCES ambassadors(ambassador_id) ON DELETE SET NULL,
  role VARCHAR(20) NOT NULL,
  category VARCHAR(50),
  subject TEXT,
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  screenshot_filename TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_support_feedback_user_id ON support_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_support_feedback_status ON support_feedback(status);

