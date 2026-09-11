const BaseController = require('./BaseController');
const { createLogger } = require('../helpers/controllerLogger');
const CustomReportRepository = require('../repositories/CustomReportRepository');

/**
 * Custom Report Builder Controller
 * Handles custom financial report creation and generation
 */
class CustomReportController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('CustomReportController');
  }

  async getAllCustomReports(req, res) {
    try {
      const { report_type, created_by } = req.query;

      const result = await CustomReportRepository.getAllCustomReports({ report_type, created_by });

      this.success(res, { data: result });
    } catch (error) {
      this.logger.error('getAllCustomReports', error);
      this.error(res, 'Failed to fetch custom reports');
    }
  }

  async getCustomReportById(req, res) {
    try {
      const { id } = req.params;

      const result = await CustomReportRepository.getCustomReportById(id);

      if (!result) {
        return this.notFound(res, 'Custom report not found');
      }

      this.success(res, { data: result });
    } catch (error) {
      this.logger.error('getCustomReportById', error);
      this.error(res, 'Failed to fetch custom report');
    }
  }

  async createCustomReport(req, res) {
    try {
      const {
        report_name, report_type, description, data_source,
        columns, filters, group_by, order_by
      } = req.body;

      const reportData = {
        report_name, report_type, description, data_source,
        group_by, order_by, created_by: req.user.id
      };

      const result = await CustomReportRepository.createCustomReportWithDetails(reportData, columns, filters);

      this.created(res, { data: result }, 'Custom report created');
    } catch (error) {
      this.logger.error('createCustomReport', error);
      this.error(res, 'Failed to create custom report');
    }
  }

  async updateCustomReport(req, res) {
    try {
      const { id } = req.params;
      const {
        report_name, report_type, description, data_source,
        columns, filters, group_by, order_by
      } = req.body;

      const reportData = {
        report_name, report_type, description, data_source,
        group_by, order_by
      };

      const result = await CustomReportRepository.updateCustomReportWithDetails(id, reportData, columns, filters);

      this.success(res, { data: result }, 'Custom report updated');
    } catch (error) {
      this.logger.error('updateCustomReport', error);
      this.error(res, 'Failed to update custom report');
    }
  }

  async deleteCustomReport(req, res) {
    try {
      const { id } = req.params;

      const result = await CustomReportRepository.deleteCustomReport(id);

      if (!result) {
        return this.notFound(res, 'Custom report not found');
      }

      this.success(res, {}, 'Custom report deleted successfully');
    } catch (error) {
      this.logger.error('deleteCustomReport', error);
      this.error(res, 'Failed to delete custom report');
    }
  }

  async generateCustomReport(req, res) {
    try {
      const { id } = req.params;
      const { parameters } = req.body;

      // Use secure repository method that employs QueryBuilderService
      const result = await CustomReportRepository.generateReport(id, parameters);

      this.success(res, { data: result });
    } catch (error) {
      this.logger.error('generateCustomReport', error);

      // Handle validation errors from QueryBuilderService
      if (error.message.includes('not allowed') || error.message.includes('Invalid')) {
        return this.badRequest(res, error.message);
      }

      this.error(res, 'Failed to generate custom report');
    }
  }
}

module.exports = new CustomReportController();
