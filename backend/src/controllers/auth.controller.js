const authService = require('../services/auth.service');
const { setAuthCookie, clearAuthCookie } = require('../utils/authCookie');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { token, user } = await authService.login(email, password);

    // El token viaja en una cookie HttpOnly: el frontend ya no lo guarda en localStorage.
    setAuthCookie(res, token);
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
};

const register = async (req, res, next) => {
  try {
    // El tenant lo pone el admin autenticado (`req.tenantId`, que
    // resolveTenant deriva de la identidad verificada), nunca el cuerpo de la
    // peticion. La logica de creacion en el servicio queda intacta.
    const user = await authService.register({ ...req.body, tenantId: req.tenantId });
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

const me = async (req, res) => {
  res.json({ user: req.user });
};

module.exports = { login, logout, register, me };
