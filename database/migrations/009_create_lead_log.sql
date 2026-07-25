CREATE TABLE IF NOT EXISTS lead_log (
  id              SERIAL PRIMARY KEY,
  tenant_id       UUID REFERENCES tenants(id) ON DELETE SET NULL,
  email           VARCHAR(255) NOT NULL,
  name            VARCHAR(255),
  company         VARCHAR(255),
  phone           VARCHAR(50),
  message         TEXT,
  source          VARCHAR(100),
  ai_score        INTEGER,
  ai_category     VARCHAR(10),
  ai_rationale    TEXT,
  ai_business_category VARCHAR(100),
  status          VARCHAR(20) DEFAULT 'pending',
  approved_at     TIMESTAMP,
  received_at     BIGINT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lead_log_email ON lead_log(email);
CREATE INDEX idx_lead_log_created ON lead_log(created_at DESC);
