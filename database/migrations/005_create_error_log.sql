CREATE TABLE IF NOT EXISTS error_log (
  id            SERIAL PRIMARY KEY,
  tenant_id     UUID REFERENCES tenants(id) ON DELETE SET NULL,
  level         VARCHAR(20) DEFAULT 'ERROR',
  source        VARCHAR(100),
  message       TEXT NOT NULL,
  metadata      JSONB DEFAULT '{}',
  workflow_id   VARCHAR(100),
  workflow_name VARCHAR(255),
  stack_trace   TEXT,
  created_at    BIGINT NOT NULL
);

CREATE INDEX idx_error_log_tenant ON error_log(tenant_id);
CREATE INDEX idx_error_log_created ON error_log(created_at DESC);
CREATE INDEX idx_error_log_source ON error_log(source);
