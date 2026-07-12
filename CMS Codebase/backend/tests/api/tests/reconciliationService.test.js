/**
 * reconciliationService.test.js
 * Test suite for Reconciliation Service
 */

const reconciliationService = require('../../../services/reconciliationService');

describe('Reconciliation Service', () => {
  describe('matchPaymentWithTransaction', () => {
    test('should match payment with exact amount and date', () => {
      const payment = {
        amount: 100.00,
        payment_date: '2024-01-15',
        transaction_code: 'ABC123'
      };

      const transaction = {
        amount: 100.00,
        date: '2024-01-15',
        code: 'ABC123'
      };

      const match = reconciliationService.matchPaymentWithTransaction(payment, transaction);
      expect(match.isMatch).toBe(true);
      expect(match.discrepancy).toBe(0);
    });

    test('should match payment with small amount difference within tolerance', () => {
      const payment = {
        amount: 100.00,
        payment_date: '2024-01-15',
        transaction_code: 'ABC123'
      };

      const transaction = {
        amount: 100.50,
        date: '2024-01-15',
        code: 'ABC123'
      };

      const match = reconciliationService.matchPaymentWithTransaction(payment, transaction);
      expect(match.isMatch).toBe(true);
      expect(match.discrepancy).toBeCloseTo(0.50);
    });

    test('should not match payment with large amount difference', () => {
      const payment = {
        amount: 100.00,
        payment_date: '2024-01-15',
        transaction_code: 'ABC123'
      };

      const transaction = {
        amount: 150.00,
        date: '2024-01-15',
        code: 'ABC123'
      };

      const match = reconciliationService.matchPaymentWithTransaction(payment, transaction);
      expect(match.isMatch).toBe(false);
      expect(match.reason).toContain('amount');
    });

    test('should not match payment with different transaction code', () => {
      const payment = {
        amount: 100.00,
        payment_date: '2024-01-15',
        transaction_code: 'ABC123'
      };

      const transaction = {
        amount: 100.00,
        date: '2024-01-15',
        code: 'XYZ789'
      };

      const match = reconciliationService.matchPaymentWithTransaction(payment, transaction);
      expect(match.isMatch).toBe(false);
      expect(match.reason).toContain('code');
    });

    test('should not match payment with date outside tolerance', () => {
      const payment = {
        amount: 100.00,
        payment_date: '2024-01-15',
        transaction_code: 'ABC123'
      };

      const transaction = {
        amount: 100.00,
        date: '2024-01-25',
        code: 'ABC123'
      };

      const match = reconciliationService.matchPaymentWithTransaction(payment, transaction);
      expect(match.isMatch).toBe(false);
      expect(match.reason).toContain('date');
    });
  });

  describe('matchThreshold', () => {
    test('should have default threshold of 0.01 (1%)', () => {
      expect(reconciliationService.matchThreshold).toBe(0.01);
    });
  });
});
