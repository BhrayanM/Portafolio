-- Seed: Admin Tenant
INSERT INTO tenants (id, name, slug, plan, status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Portafolio SaaS',
  'portafolio',
  'enterprise',
  'active'
) ON CONFLICT (slug) DO NOTHING;
