-- ============================================
-- Business Outcome Verification Tokens
-- ============================================
-- Tracks manager/finance verification requests for
-- Business Outcome impact entries.
--
-- Each token links a verifier email to a specific
-- impact_entries row and supports confirm / reject.

CREATE TABLE IF NOT EXISTS business_verification_tokens (
  token_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token VARCHAR(255) NOT NULL UNIQUE,

  -- Link to the impact entry being verified
  entry_id UUID NOT NULL REFERENCES impact_entries(entry_id) ON DELETE CASCADE,

  -- Verifier info (from partner)
  verifier_name VARCHAR(255),
  verifier_email VARCHAR(255) NOT NULL,
  verifier_role VARCHAR(255),

  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'rejected', 'expired')),
  verifier_comment TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_business_verif_token_entry_id
  ON business_verification_tokens(entry_id);

CREATE INDEX IF NOT EXISTS idx_business_verif_token_status
  ON business_verification_tokens(status);

