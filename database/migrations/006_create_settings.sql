CREATE TABLE IF NOT EXISTS tenant_settings (
  id            SERIAL PRIMARY KEY,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key           VARCHAR(255) NOT NULL,
  value         JSONB NOT NULL,
  description   TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(tenant_id, key)
);

CREATE INDEX idx_tenant_settings_tenant ON tenant_settings(tenant_id);
