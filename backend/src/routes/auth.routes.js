const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { login, logout, register, me } = require('../controllers/auth.controller');

const router = Router();

router.post('/login', login);
router.post('/logout', logout);
router.post('/register', register);
router.get('/me', authenticate, me);

module.exports = router;
