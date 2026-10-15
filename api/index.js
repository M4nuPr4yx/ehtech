// Entry point para Vercel Serverless Functions
const app = require('../backend/index.js');

module.exports = require('../backend/serverless').createHandler(app);
