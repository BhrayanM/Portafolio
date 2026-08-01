CREATE TABLE IF NOT EXISTS leads (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email               VARCHAR(255) NOT NULL,
  name                VARCHAR(255),
  company             VARCHAR(255),
  phone               VARCHAR(50),
  message             TEXT,
  source              VARCHAR(100),
  dedup_key           VARCHAR(500),

  ai_score            INTEGER,
  ai_category         VARCHAR(10),
  ai_rationale        TEXT,
  ai_business_category VARCHAR(100),

  status              VARCHAR(20) DEFAULT 'new',
  approved_at         TIMESTAMP,
  rejected_at         TIMESTAMP,
  rejection_reason    TEXT,

  hubspot_contact_id  VARCHAR(100),
  hubspot_synced_at   TIMESTAMP,

  metadata            JSONB DEFAULT '{}',
  received_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(tenant_id, dedup_key)
);

CREATE INDEX idx_leads_tenant ON leads(tenant_id);
CREATE INDEX idx_leads_email ON leads(tenant_id, email);
CREATE INDEX idx_leads_status ON leads(tenant_id, status);
CREATE INDEX idx_leads_category ON leads(tenant_id, ai_category);
CREATE INDEX idx_leads_created ON leads(tenant_id, created_at DESC);
