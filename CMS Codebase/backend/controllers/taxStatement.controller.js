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
      const churchId = req.user.church_id;
      
      const result = await TaxStatementRepository.getAllTaxStatements({ year, member_id, status }, churchId);

      this.success(res, { data: result });
    } catch (error) {
      this.logger.error('getAllTaxStatements', error);
      this.error(res, 'Failed to fetch tax statements');
    }
  }

  async getTaxStatementById(req, res) {
    try {
      const { id } = req.params;
      const churchId = req.user.church_id;

      const result = await TaxStatementRepository.getTaxStatementById(id, churchId);

      if (!result) {
        return this.notFound(res, 'Tax statement not found');
      }

      this.success(res, { data: result });
    } catch (error) {
      this.logger.error('getTaxStatementById', error);
      this.error(res, 'Failed to fetch tax statement');
    }
  }

  async generateTaxStatement(req, res) {
    try {
      const { member_id, tax_year } = req.body;
      const churchId = req.user.church_id;

      const result = await TaxStatementRepository.generateTaxStatement(member_id, tax_year, req.user.id, churchId);

      this.created(res, { data: result });
    } catch (error) {
      this.logger.error('generateTaxStatement', error);
      this.error(res, 'Failed to generate tax statement');
    }
  }

  async regenerateTaxStatement(req, res) {
    try {
      const { id } = req.params;
      const churchId = req.user.church_id;

      const result = await TaxStatementRepository.regenerateTaxStatement(id, req.user.id, churchId);

      this.success(res, { data: result });
    } catch (error) {
      this.logger.error('regenerateTaxStatement', error);
      this.error(res, 'Failed to regenerate tax statement');
    }
  }

  async markTaxStatementSent(req, res) {
    try {
      const { id } = req.params;

      const statement = await TaxStatementRepository.markTaxStatementSent(id, req.user.id);

      if (!statement) {
        return this.notFound(res, 'Tax statement not found');
      }

      this.success(res, { data: statement });
    } catch (error) {
      this.logger.error('markTaxStatementSent', error);
      this.error(res, 'Failed to mark tax statement as sent');
    }
  }

  async deleteTaxStatement(req, res) {
    try {
      const { id } = req.params;

      const statement = await TaxStatementRepository.deleteTaxStatement(id);

      if (!statement) {
        return this.notFound(res, 'Tax statement not found');
      }

      this.success(res, { message: 'Tax statement deleted successfully' });
    } catch (error) {
      this.logger.error('deleteTaxStatement', error);
      this.error(res, 'Failed to delete tax statement');
    }
  }
}

module.exports = new TaxStatementController();
