/**
 * Fund Controller
 * Handles fund operations
 */

const { validationResult } = require('express-validator');
const FundRepository = require('../repositories/fund.repository');
const Fund = require('../models/Fund');
const logger = require('../../../config/logging');

class FundController {
  constructor(pool) {
    this.fundRepo = new FundRepository(pool);
  }

  /**
   * Get all funds
   */
  async getFunds(req, res) {
    try {
      const { fund_type, is_active } = req.query;
      
      const funds = await this.fundRepo.findAll({
        fund_type,
        is_active: is_active !== undefined ? is_active === 'true' : undefined
      });
      
      res.json({ funds });
    } catch (error) {
      logger.error('Get funds error:', error);
      res.status(500).json({ error: 'Failed to fetch funds' });
    }
  }

  /**
   * Get fund by ID
   */
  async getFundById(req, res) {
    try {
      const { id } = req.params;
      const fund = await this.fundRepo.findById(id);
      
      if (!fund) {
        return res.status(404).json({ error: 'Fund not found' });
      }
      
      res.json({ fund });
    } catch (error) {
      logger.error('Get fund by ID error:', error);
      res.status(500).json({ error: 'Failed to fetch fund' });
    }
  }

  /**
   * Create new fund
   */
  async createFund(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const fund = new Fund(req.body);
      const created = await this.fundRepo.create(fund);
      
      logger.info(`Fund created: ${created.fund_code} - ${created.fund_name}`);
      res.status(201).json({ fund: created });
    } catch (error) {
      logger.error('Create fund error:', error);
      
      if (error.message.includes('duplicate')) {
        return res.status(409).json({ error: 'Fund code already exists' });
      }
      
      res.status(500).json({ error: error.message || 'Failed to create fund' });
    }
  }

  /**
   * Update fund
   */
  async updateFund(req, res) {
    try {
      const { id } = req.params;
      const fund = new Fund({ ...req.body, id });
      
      const updated = await this.fundRepo.update(id, fund);
      
      if (!updated) {
        return res.status(404).json({ error: 'Fund not found' });
      }
      
      logger.info(`Fund updated: ${updated.fund_code}`);
      res.json({ fund: updated });
    } catch (error) {
      logger.error('Update fund error:', error);
      res.status(500).json({ error: error.message || 'Failed to update fund' });
    }
  }

  /**
   * Delete fund
   */
  async deleteFund(req, res) {
    try {
      const { id } = req.params;
      
      // Check if fund has transactions
      const fund = await this.fundRepo.findById(id);
      if (!fund) {
        return res.status(404).json({ error: 'Fund not found' });
      }
      
      if (fund.current_balance !== 0) {
        return res.status(400).json({ 
          error: 'Cannot delete fund with balance. Deactivate instead.' 
        });
      }
      
      await this.fundRepo.delete(id);
      
      logger.info(`Fund deleted: ${fund.fund_code}`);
      res.json({ message: 'Fund deleted successfully' });
    } catch (error) {
      logger.error('Delete fund error:', error);
      res.status(500).json({ error: error.message || 'Failed to delete fund' });
    }
  }

  /**
   * Get fund balances summary
   */
  async getFundBalances(req, res) {
    try {
      const balances = await this.fundRepo.getFundBalances();
      
      const summary = balances.reduce((acc, fund) => {
        acc.total_contributions += parseFloat(fund.total_contributions);
        acc.total_expenses += parseFloat(fund.total_expenses);
        acc.net_balance += parseFloat(fund.current_balance);
        return acc;
      }, { total_contributions: 0, total_expenses: 0, net_balance: 0 });
      
      res.json({ 
        funds: balances,
        summary
      });
    } catch (error) {
      logger.error('Get fund balances error:', error);
      res.status(500).json({ error: 'Failed to fetch fund balances' });
    }
  }
}

module.exports = FundController;
