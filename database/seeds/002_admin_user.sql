-- Seed: Admin User
-- Hash bcrypt cost 12, alineado con BCRYPT_ROUNDS de backend/src/auth.service.js.
-- La password en claro NO esta en el repo ni en su historial: se genera y se
-- custodia fuera. Para rotarla: generar el hash aparte y sustituir solo esta linea.
-- IMPORTANTE: Cambiar después del primer login
INSERT INTO users (tenant_id, email, password_hash, name, role)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@example.com',
  '$2b$12$KHB6xEBMtm6eXgv7OMYKy.gawqL9IKcTKYDMfBEAI/SQvTYcTjKCq',
  'Admin',
  'admin'
) ON CONFLICT (tenant_id, email) DO NOTHING;
