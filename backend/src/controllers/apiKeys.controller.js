const apiKeysService = require('../services/apiKeys.service');

const list = async (req, res, next) => {
  try {
    const keys = await apiKeysService.list(req.tenantId);
    res.json(keys);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const { name } = req.body;
    const result = await apiKeysService.create(req.tenantId, name || 'default');
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const revoke = async (req, res, next) => {
  try {
    const { key } = req.body;
    const keys = await apiKeysService.revoke(req.tenantId, key);
    res.json(keys);
  } catch (error) {
    next(error);
  }
};

module.exports = { list, create, revoke };
