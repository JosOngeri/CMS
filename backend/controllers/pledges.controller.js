const BaseController = require('./BaseController');
const PledgesRepository = require('../repositories/PledgesRepository');
const { createLogger } = require('../helpers/controllerLogger');

/**
 * Pledges Controller
 * Handles member pledge management
 */
class PledgesController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('PledgesController');
  }

  async getAllPledges(req, res) {
    try {
      const { status, member_id, project_id, fund_id } = req.query;

      const filters = {};
      if (status) filters.status = status;
      if (member_id) filters.member_id = member_id;
      if (project_id) filters.project_id = project_id;
      if (fund_id) filters.fund_id = fund_id;

      const pledges = await PledgesRepository.getAllWithDetails(filters);

      res.json({ success: true, data: pledges });
    } catch (error) {
      this.logger.error('getAllPledges', error);
      res.status(500).json({ success: false, error: 'Failed to fetch pledges' });
    }
  }

  async getPledgeById(req, res) {
    try {
      const { id } = req.params;

      const pledge = await PledgesRepository.getWithDetails(id);

      if (!pledge) {
        return res.status(404).json({ success: false, error: 'Pledge not found' });
      }

      res.json({ success: true, data: pledge });
    } catch (error) {
      this.logger.error('getPledgeById', error);
      res.status(500).json({ success: false, error: 'Failed to fetch pledge' });
    }
  }

  async createPledge(req, res) {
    try {
      const {
        member_id, project_id, fund_id, pledge_amount, pledged_date,
        start_date, end_date, frequency, notes
      } = req.body;

      const pledgeNumber = `PLEDGE-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

      const pledge = await PledgesRepository.createPledge({
        pledge_number: pledgeNumber,
        member_id,
        project_id,
        fund_id,
        pledge_amount,
        pledged_date,
        start_date,
        end_date,
        frequency,
        notes,
        created_by: req.user.id
      });

      res.json({ success: true, data: pledge });
    } catch (error) {
      this.logger.error('createPledge', error);
      res.status(500).json({ success: false, error: 'Failed to create pledge' });
    }
  }

  async updatePledge(req, res) {
    try {
      const { id } = req.params;
      const {
        pledge_amount, start_date, end_date, frequency, status, notes
      } = req.body;

      const pledge = await PledgesRepository.updatePledge(id, {
        pledge_amount,
        start_date,
        end_date,
        frequency,
        status,
        notes
      });

      if (!pledge) {
        return res.status(404).json({ success: false, error: 'Pledge not found' });
      }

      res.json({ success: true, data: pledge });
    } catch (error) {
      this.logger.error('updatePledge', error);
      res.status(500).json({ success: false, error: 'Failed to update pledge' });
    }
  }

  async deletePledge(req, res) {
    try {
      const { id } = req.params;

      const pledge = await PledgesRepository.delete(id);

      if (!pledge) {
        return res.status(404).json({ success: false, error: 'Pledge not found' });
      }

      res.json({ success: true, message: 'Pledge deleted successfully' });
    } catch (error) {
      this.logger.error('deletePledge', error);
      res.status(500).json({ success: false, error: 'Failed to delete pledge' });
    }
  }

  async recordPledgePayment(req, res) {
    try {
      const { id } = req.params;
      const { amount, payment_date, payment_method } = req.body;

      // Get pledge details
      const pledge = await PledgesRepository.findById(id);
      if (!pledge) {
        return res.status(404).json({ success: false, error: 'Pledge not found' });
      }

      // Update pledge amount paid
      const newAmountPaid = parseFloat(pledge.amount_paid) + parseFloat(amount);
      const updatedPledge = await PledgesRepository.updateAmountPaid(id, newAmountPaid, pledge.pledge_amount);

      res.json({ success: true, data: updatedPledge });
    } catch (error) {
      this.logger.error('recordPledgePayment', error);
      res.status(500).json({ success: false, error: 'Failed to record pledge payment' });
    }
  }
}

module.exports = new PledgesController();
