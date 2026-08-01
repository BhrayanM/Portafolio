CREATE TABLE IF NOT EXISTS workflow_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE SET NULL,
  workflow_name   VARCHAR(255) NOT NULL,
  workflow_id     VARCHAR(100),
  status          VARCHAR(20) DEFAULT 'running',
  trigger_type    VARCHAR(50),
  input_data      JSONB DEFAULT '{}',
  output_data     JSONB DEFAULT '{}',
  error_message   TEXT,
  started_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  finished_at     TIMESTAMP,
  duration_ms     INTEGER
);

CREATE INDEX idx_workflow_runs_tenant ON workflow_runs(tenant_id);
CREATE INDEX idx_workflow_runs_status ON workflow_runs(status);
CREATE INDEX idx_workflow_runs_started ON workflow_runs(started_at DESC);
