const marketplaceService = require('../services/marketplace.service');

const catalog = async (req, res) => {
  const items = marketplaceService.getCatalog();
  res.json(items);
};

const install = async (req, res, next) => {
  try {
    const { workflow: workflowId } = req.body;
    const result = await marketplaceService.install(req.tenantId, workflowId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const installed = async (req, res, next) => {
  try {
    const items = await marketplaceService.getInstalled(req.tenantId);
    res.json(items);
  } catch (error) {
    next(error);
  }
};

module.exports = { catalog, install, installed };
