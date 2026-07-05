/**
 * Payment Models Index
 * Exports all payment domain models
 */

const { Payment, PaymentItem, PaymentCategory } = require('./Payment');

module.exports = {
  Payment,
  PaymentItem,
  PaymentCategory
};
