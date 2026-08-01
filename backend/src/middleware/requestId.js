const crypto = require('crypto');

const requestId = (req, res, next) => {
  req.id = req.headers['x-request-id'] || crypto.randomUUID().slice(0, 8);
  res.setHeader('x-request-id', req.id);
  next();
};

module.exports = { requestId };
