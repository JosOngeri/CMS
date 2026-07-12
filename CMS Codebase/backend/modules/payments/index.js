/**
 * Payments Module
 * Main entry point for payments domain module
 */

const models = require('./models');
const repositories = require('./repositories/payment.repository');
const PaymentService = require('./services/payment.service');

module.exports = {
  models,
  repositories,
  PaymentService
};
