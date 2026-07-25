-- Seed: Admin User
-- Password: <ADMIN_SEED_PASSWORD> (hash generado con bcrypt)
-- IMPORTANTE: Cambiar después del primer login
INSERT INTO users (tenant_id, email, password_hash, name, role)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@portafolio.ai',
  '$2b$10$kw36AisbuPxG67XENBctDeqUnpkott54IVhe0/rjZ2DqiYvjI.ug6',
  'Admin',
  'admin'
) ON CONFLICT (tenant_id, email) DO NOTHING;
