const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const config = require('../config');
const { UnauthorizedError } = require('../utils/errors');

const BCRYPT_ROUNDS = 12;

class AuthService {
  async login(email, password) {
    const result = await pool.query(
      'SELECT id, tenant_id, email, name, role, password_hash FROM users WHERE email = $1 AND is_active = true',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedError('Credenciales inválidas');
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw new UnauthorizedError('Credenciales inválidas');
    }

    await pool.query(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    const token = jwt.sign(
      { userId: user.id, tenantId: user.tenant_id, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    return {
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenant_id },
    };
  }

  async register(data) {
    const { email, password, name, tenantId } = data;
    // 12 rondas. No invalida los hashes existentes: bcrypt guarda el coste
    // dentro del propio hash, asi que los antiguos se siguen verificando bien.
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const result = await pool.query(
      `INSERT INTO users (tenant_id, email, password_hash, name, role)
       VALUES ($1, $2, $3, $4, 'member')
       RETURNING id, email, name, role, tenant_id`,
      [tenantId, email.toLowerCase(), hash, name]
    );

    return result.rows[0];
  }

  // Se fija el algoritmo. Sin `algorithms`, jsonwebtoken acepta el que venga
  // en la cabecera del token, que abre la puerta a ataques de confusion de algoritmo.
  verifyToken(token) {
    return jwt.verify(token, config.jwt.secret, { algorithms: config.jwt.algorithms });
  }
}

module.exports = new AuthService();
