const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { resolveTenant } = require('../middleware/tenant');
const { validate } = require('../middleware/validate');
const { authLimiter, registerLimiter } = require('../middleware/rateLimit');
const { loginSchema, registerSchema } = require('../schemas/auth.schema');
const { login, logout, register, me } = require('../controllers/auth.controller');

const router = Router();

router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/logout', logout);

// D-07(b) — El alta deja de ser publica: la ejecuta un admin autenticado y el
// usuario nace SIEMPRE en el tenant de quien lo crea (el `tenantId` del body se
// ignora, ver auth.controller). Antes, cualquiera que conociese el UUID de un
// tenant podia crearse una cuenta dentro y leer sus datos.
// La logica de creacion no se toca: queda intacta para construir invitaciones encima.
router.post('/register', registerLimiter, authenticate, authorize('admin'), resolveTenant, validate(registerSchema), register);

router.get('/me', authenticate, me);

module.exports = router;
