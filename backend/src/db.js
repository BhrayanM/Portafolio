const { Pool } = require('pg');
const { AsyncLocalStorage } = require('node:async_hooks');
const config = require('./config');

/**
 * Acceso a PostgreSQL con contexto de tenant.
 *
 * Por que esto no es un `new Pool()` a secas.
 *
 * La migracion 016 activa FORCE ROW LEVEL SECURITY: a partir de ahi las politicas
 * de aislamiento por tenant se aplican a **todos** los roles, incluido el
 * propietario de las tablas. Para que una consulta vea algo, la sesion tiene que
 * declarar de que tenant es, en `app.tenant_id`.
 *
 * La alternativa habitual —pasar un `client` por parametro hasta cada servicio—
 * obligaba a tocar los 10 servicios y sus firmas. En su lugar el tenant viaja en un
 * AsyncLocalStorage que abre `resolveTenant` al principio de la peticion, y este
 * modulo lo aplica solo. Los servicios siguen llamando a `pool.query(sql, params)`
 * sin enterarse, y los tests que mockean `../src/db` siguen valiendo igual.
 *
 * Coste: cuando hay tenant en contexto, la consulta va dentro de una transaccion
 * (BEGIN · set_config · consulta · COMMIT) sobre un cliente dedicado, asi que son
 * tres viajes extra a la base. Es el precio de que el aislamiento lo garantice el
 * motor y no la disciplina de quien escribe el SELECT. A esta escala es asumible;
 * si dejara de serlo, el paso siguiente es agrupar la peticion entera en una sola
 * transaccion en vez de una por consulta.
 */

const rawPool = new Pool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

rawPool.on('error', (err) => {
  const { logger } = require('./utils/logger');
  logger.error('PostgreSQL pool error', { error: err.message });
});

const tenantContext = new AsyncLocalStorage();

/** Abre un ambito en el que toda consulta se ejecuta como el tenant indicado. */
const runWithTenant = (tenantId, fn) => tenantContext.run({ tenantId }, fn);

/** Tenant activo, o null fuera de una peticion con tenant resuelto. */
const getCurrentTenantId = () => tenantContext.getStore()?.tenantId || null;

/**
 * `set_config(..., true)` es de ambito de transaccion: se deshace al terminar, asi
 * que el contexto no puede filtrarse a la siguiente peticion que reutilice esta
 * conexion del pool. Esa es la razon de la transaccion, mas alla de la atomicidad.
 */
const queryWithTenant = async (tenantId, text, params) => {
  const client = await rawPool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [String(tenantId)]);
    const result = await client.query(text, params);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Mismo contrato que `pg.Pool.query`.
 *
 * Sin tenant en contexto se consulta directamente. No es un agujero: con FORCE RLS
 * las seis tablas multi-tenant devuelven **cero filas** cuando `app.tenant_id` no
 * esta fijado (politica con `missing_ok`, ver migracion 016). Las consultas
 * legitimas sin tenant —el `SELECT 1` de /health, la busqueda del usuario por id
 * en `authenticate`— van contra tablas sin RLS y siguen funcionando.
 */
const pool = {
  query: (text, params) => {
    const tenantId = getCurrentTenantId();
    return tenantId
      ? queryWithTenant(tenantId, text, params)
      : rawPool.query(text, params);
  },
  connect: (...args) => rawPool.connect(...args),
  end: (...args) => rawPool.end(...args),
  on: (...args) => rawPool.on(...args),
};

module.exports = { pool, rawPool, runWithTenant, getCurrentTenantId };
