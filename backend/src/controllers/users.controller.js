const usersService = require('../services/users.service');

const list = async (req, res, next) => {
  try {
    const users = await usersService.list(req.tenantId);
    res.json(users);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const user = await usersService.getById(req.params.id, req.tenantId);
    res.json(user);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const user = await usersService.update(req.params.id, req.tenantId, req.body);
    res.json(user);
  } catch (error) {
    next(error);
  }
};

module.exports = { list, getById, update };
