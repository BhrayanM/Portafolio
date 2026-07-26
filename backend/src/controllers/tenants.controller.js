const tenantsService = require('../services/tenants.service');

const getCurrent = async (req, res, next) => {
  try {
    const tenant = await tenantsService.getById(req.tenantId);
    res.json(tenant);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const tenant = await tenantsService.update(req.tenantId, req.body);
    res.json(tenant);
  } catch (error) {
    next(error);
  }
};

const usage = async (req, res, next) => {
  try {
    const stats = await tenantsService.getUsageStats(req.tenantId);
    res.json(stats);
  } catch (error) {
    next(error);
  }
};

module.exports = { getCurrent, update, usage };
