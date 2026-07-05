/**
 * Unit Tests for Reconciliation Service
 */

const reconciliationService = require('../../services/reconciliationService');

// Mock database
jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

const { pool } = require('../../config/database');

describe('Reconciliation Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('matchPayment', () => {
    it('should match payment with MPesa transaction', async () => {
      const payment = { id: 1, amount: 1000, phone: '254712345678' };
      const transaction = { amount: 1000, phoneNumber: '254712345678' };

      pool.query.mockResolvedValue({ rows: [] });

      const result = await reconciliationService.matchPayment(payment, transaction);

      expect(result).toHaveProperty('matched', true);
      expect(result).toHaveProperty('confidence');
    });

    it('should match payment with tolerance', async () => {
      const payment = { id: 1, amount: 1000, phone: '254712345678' };
      const transaction = { amount: 995, phoneNumber: '254712345678' }; // 5 KES difference

      pool.query.mockResolvedValue({ rows: [] });

      const result = await reconciliationService.matchPayment(payment, transaction, { tolerance: 10 });

      expect(result).toHaveProperty('matched', true);
    });

    it('should not match if amount difference exceeds tolerance', async () => {
      const payment = { id: 1, amount: 1000, phone: '254712345678' };
      const transaction = { amount: 900, phoneNumber: '254712345678' }; // 100 KES difference

      const result = await reconciliationService.matchPayment(payment, transaction, { tolerance: 10 });

      expect(result).toHaveProperty('matched', false);
    });

    it('should not match if phone numbers differ', async () => {
      const payment = { id: 1, amount: 1000, phone: '254712345678' };
      const transaction = { amount: 1000, phoneNumber: '254798765432' };

      const result = await reconciliationService.matchPayment(payment, transaction);

      expect(result).toHaveProperty('matched', false);
    });
  });

  describe('autoReconcile', () => {
    it('should auto-reconcile matched payments', async () => {
      const unmatchedPayments = [
        { id: 1, amount: 1000, phone: '254712345678' }
      ];

      const transactions = [
        { id: 'TXN001', amount: 1000, phoneNumber: '254712345678' }
      ];

      pool.query
        .mockResolvedValueOnce({ rows: unmatchedPayments })
        .mockResolvedValueOnce({ rows: transactions })
        .mockResolvedValueOnce({ rows: [] });

      const result = await reconciliationService.autoReconcile();

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('matchedCount');
      expect(result.matchedCount).toBeGreaterThan(0);
    });

    it('should handle no matches gracefully', async () => {
      const unmatchedPayments = [
        { id: 1, amount: 1000, phone: '254712345678' }
      ];

      const transactions = [
        { id: 'TXN001', amount: 500, phoneNumber: '254798765432' }
      ];

      pool.query
        .mockResolvedValueOnce({ rows: unmatchedPayments })
        .mockResolvedValueOnce({ rows: transactions })
        .mockResolvedValueOnce({ rows: [] });

      const result = await reconciliationService.autoReconcile();

      expect(result).toHaveProperty('success', true);
      expect(result.matchedCount).toBe(0);
    });
  });

  describe('detectDiscrepancies', () => {
    it('should detect amount discrepancies', async () => {
      const payments = [
        { id: 1, amount: 1000, status: 'completed' }
      ];

      const transactions = [
        { id: 'TXN001', amount: 1000, status: 'completed' }
      ];

      pool.query
        .mockResolvedValueOnce({ rows: payments })
        .mockResolvedValueOnce({ rows: transactions });

      const result = await reconciliationService.detectDiscrepancies();

      expect(result).toHaveProperty('discrepancies');
      expect(Array.isArray(result.discrepancies)).toBe(true);
    });

    it('should detect missing transactions', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, amount: 1000, status: 'pending' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await reconciliationService.detectDiscrepancies();

      expect(result.discrepancies).toHaveLength(1);
      expect(result.discrepancies[0].type).toBe('missing_transaction');
    });
  });

  describe('auditLog', () => {
    it('should log reconciliation action', async () => {
      const action = {
        type: 'match',
        paymentId: 1,
        transactionId: 'TXN001',
        userId: 'admin-1'
      };

      pool.query.mockResolvedValue({ rows: [] });

      const result = await reconciliationService.logReconciliationAction(action);

      expect(result).toHaveProperty('success', true);
      expect(pool.query).toHaveBeenCalled();
    });

    it('should get reconciliation history', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const result = await reconciliationService.getReconciliationHistory();

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('history');
    });
  });
});
