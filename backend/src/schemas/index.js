const authSchemas = require('./auth.schema');
const leadSchemas = require('./lead.schema');
const billingSchemas = require('./billing.schema');

module.exports = { ...authSchemas, ...leadSchemas, ...billingSchemas };
