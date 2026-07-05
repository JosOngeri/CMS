const BaseController = require('./BaseController');
const { createLogger } = require('../helpers/controllerLogger');
const TaxStatementRepository = require('../repositories/TaxStatementRepository');

/**
 * Tax Statement Controller
 * Handles tax-deductible contribution statement generation
 */
class TaxStatementController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('TaxStatementController');
  }

  async getAllTaxStatements(req, res) {
    try {
      const { year, member_id, status } = req.query;
      
      const result = await TaxStatementRepository.getAllTaxStatements({ year, member_id, status });

      res.json({ success: true, data: result });
    } catch (error) {
      this.logger.error('getAllTaxStatements', error);
      res.status(500).json({ success: false, error: 'Failed to fetch tax statements' });
    }
  }

  async getTaxStatementById(req, res) {
    try {
      const { id } = req.params;

      const result = await TaxStatementRepository.getTaxStatementById(id);

      if (!result) {
        return res.status(404).json({ success: false, error: 'Tax statement not found' });
      }

      res.json({ 
        success: true, 
        data: result
      });
    } catch (error) {
      this.logger.error('getTaxStatementById', error);
      res.status(500).json({ success: false, error: 'Failed to fetch tax statement' });
    }
  }

  async generateTaxStatement(req, res) {
    try {
      const { member_id, tax_year } = req.body;

      const result = await TaxStatementRepository.generateTaxStatement(member_id, tax_year, req.user.id);

      if (result.error) {
        if (result.error === 'Tax statement already exists for this member and year') {
          return res.status(400).json({ success: false, error: result.error });
        }
        if (result.error === 'Member not found') {
          return res.status(404).json({ success: false, error: result.error });
        }
        return res.status(500).json({ success: false, error: result.error });
      }

      res.json({ success: true, data: result });
    } catch (error) {
      this.logger.error('generateTaxStatement', error);
      res.status(500).json({ success: false, error: 'Failed to generate tax statement' });
    }
  }

  async regenerateTaxStatement(req, res) {
    try {
      const { id } = req.params;

      const result = await TaxStatementRepository.regenerateTaxStatement(id, req.user.id);

      if (result.error) {
        if (result.error === 'Tax statement not found') {
          return res.status(404).json({ success: false, error: result.error });
        }
        return res.status(500).json({ success: false, error: result.error });
      }

      res.json({ success: true, data: result });
    } catch (error) {
      this.logger.error('regenerateTaxStatement', error);
      res.status(500).json({ success: false, error: 'Failed to regenerate tax statement' });
    }
  }

  async markTaxStatementSent(req, res) {
    try {
      const { id } = req.params;

      const statement = await TaxStatementRepository.markTaxStatementSent(id, req.user.id);

      if (!statement) {
        return res.status(404).json({ success: false, error: 'Tax statement not found' });
      }

      res.json({ success: true, data: statement });
    } catch (error) {
      this.logger.error('markTaxStatementSent', error);
      res.status(500).json({ success: false, error: 'Failed to mark tax statement as sent' });
    }
  }

  async deleteTaxStatement(req, res) {
    try {
      const { id } = req.params;

      const statement = await TaxStatementRepository.deleteTaxStatement(id);

      if (!statement) {
        return res.status(404).json({ success: false, error: 'Tax statement not found' });
      }

      res.json({ success: true, message: 'Tax statement deleted successfully' });
    } catch (error) {
      this.logger.error('deleteTaxStatement', error);
      res.status(500).json({ success: false, error: 'Failed to delete tax statement' });
    }
  }
}

module.exports = new TaxStatementController();
