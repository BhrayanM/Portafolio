CREATE TABLE IF NOT EXISTS scores (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id       UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  score         INTEGER NOT NULL,
  category      VARCHAR(10),
  rationale     TEXT,
  model         VARCHAR(100),
  criteria      JSONB DEFAULT '{}',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scores_lead ON scores(lead_id);
CREATE INDEX idx_scores_tenant ON scores(tenant_id);
