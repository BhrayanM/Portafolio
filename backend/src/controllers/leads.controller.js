const leadsService = require('../services/leads.service');

const list = async (req, res, next) => {
  try {
    const leads = await leadsService.list(req.tenantId, req.query);
    res.json(leads);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const lead = await leadsService.getById(req.params.id, req.tenantId);
    res.json(lead);
  } catch (error) {
    next(error);
  }
};

const stats = async (req, res, next) => {
  try {
    const statsData = await leadsService.getStats(req.tenantId);
    res.json(statsData);
  } catch (error) {
    next(error);
  }
};

module.exports = { list, getById, stats };
