const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimit');
const { loginSchema, registerSchema } = require('../schemas/auth.schema');
const { login, logout, register, me } = require('../controllers/auth.controller');

const router = Router();

router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/logout', logout);
router.post('/register', validate(registerSchema), register);
router.get('/me', authenticate, me);

module.exports = router;
