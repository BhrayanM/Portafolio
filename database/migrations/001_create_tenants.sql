CREATE TABLE IF NOT EXISTS tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  slug          VARCHAR(100) UNIQUE NOT NULL,
  plan          VARCHAR(50) DEFAULT 'starter',
  status        VARCHAR(20) DEFAULT 'active',
  settings      JSONB DEFAULT '{}',
  api_keys      JSONB DEFAULT '[]',
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status);
