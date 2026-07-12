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

      res.json({ success: true, data: result });
    } catch (error) {
      this.logger.error('getAllCustomReports', error);
      res.status(500).json({ success: false, error: 'Failed to fetch custom reports' });
    }
  }

  async getCustomReportById(req, res) {
    try {
      const { id } = req.params;

      const result = await CustomReportRepository.getCustomReportById(id);

      if (!result) {
        return res.status(404).json({ success: false, error: 'Custom report not found' });
      }

      res.json({ 
        success: true, 
        data: result
      });
    } catch (error) {
      this.logger.error('getCustomReportById', error);
      res.status(500).json({ success: false, error: 'Failed to fetch custom report' });
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

      res.json({ success: true, data: result });
    } catch (error) {
      this.logger.error('createCustomReport', error);
      res.status(500).json({ success: false, error: 'Failed to create custom report' });
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

      res.json({ success: true, data: result });
    } catch (error) {
      this.logger.error('updateCustomReport', error);
      res.status(500).json({ success: false, error: 'Failed to update custom report' });
    }
  }

  async deleteCustomReport(req, res) {
    try {
      const { id } = req.params;

      const result = await CustomReportRepository.deleteCustomReport(id);

      if (!result) {
        return res.status(404).json({ success: false, error: 'Custom report not found' });
      }

      res.json({ success: true, message: 'Custom report deleted successfully' });
    } catch (error) {
      this.logger.error('deleteCustomReport', error);
      res.status(500).json({ success: false, error: 'Failed to delete custom report' });
    }
  }

  async generateCustomReport(req, res) {
    try {
      const { id } = req.params;
      const { parameters } = req.body;

      // Use secure repository method that employs QueryBuilderService
      const result = await CustomReportRepository.generateReport(id, parameters);

      res.json({ 
        success: true, 
        data: result
      });
    } catch (error) {
      this.logger.error('generateCustomReport', error);
      
      // Handle validation errors from QueryBuilderService
      if (error.message.includes('not allowed') || error.message.includes('Invalid')) {
        return res.status(400).json({ success: false, error: error.message });
      }
      
      res.status(500).json({ success: false, error: 'Failed to generate custom report' });
    }
  }
}

module.exports = new CustomReportController();
