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

      const reportResult = await CustomReportRepository.getReportDefinition(id);

      if (reportResult.length === 0) {
        return res.status(404).json({ success: false, error: 'Custom report not found' });
      }

      const report = reportResult[0];

      let query = '';
      let params = [];
      let paramCount = 0;

      const columns = reportResult.filter(r => r.column_name);
      if (columns.length > 0) {
        const selectClause = columns.map(col => {
          if (col.aggregation) {
            return `${col.aggregation}(${col.column_name}) as ${col.column_alias || col.column_name}`;
          }
          return `${col.column_name} as ${col.column_alias || col.column_name}`;
        }).join(', ');
        query = `SELECT ${selectClause} FROM ${report.data_source}`;
      } else {
        query = `SELECT * FROM ${report.data_source}`;
      }

      const filters = reportResult.filter(r => r.filter_column);
      if (filters.length > 0) {
        const whereClause = filters.map(filter => {
          paramCount++;
          params.push(filter.filter_value);
          return `${filter.filter_column} ${filter.operator} $${paramCount}`;
        }).join(' AND ');
        query += ` WHERE ${whereClause}`;
      }

      if (report.group_by) {
        query += ` GROUP BY ${report.group_by}`;
      }

      if (report.order_by) {
        query += ` ORDER BY ${report.order_by}`;
      }

      const result = await CustomReportRepository.executeCustomQuery(query, params);

      res.json({ 
        success: true, 
        data: {
          report_name: report.report_name,
          report_type: report.report_type,
          generated_at: new Date(),
          results: result
        }
      });
    } catch (error) {
      this.logger.error('generateCustomReport', error);
      res.status(500).json({ success: false, error: 'Failed to generate custom report' });
    }
  }
}

module.exports = new CustomReportController();
