const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable');
const BaseController = require('./BaseController');
const ReportsRepository = require('../repositories/ReportsRepository');
const { createLogger } = require('../helpers/controllerLogger');

/**
 * Reports Controller
 * Handles financial, department, attendance, SMS, and approval reports
 * Supports export, scheduling, and custom report generation
 */
class ReportsController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('ReportsController');
  }

  /**
   * Get financial report
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.startDate] - Start date
   * @param {string} [req.query.endDate] - End date
   * @param {string} [req.query.groupBy] - Group by period (day/week/month/year)
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getFinancialReport(req, res) {
    try {
      const { startDate, endDate, groupBy = 'month' } = req.query;
      const churchId = req.user.church_id;

      const report = await ReportsRepository.getFinancialReport(startDate, endDate, groupBy, churchId);

      res.json({ success: true, data: report });
    } catch (error) {
      this.logger.error('getFinancialReport', error);
      res.status(500).json({ success: false, error: 'Failed to fetch financial report' });
    }
  }

  /**
   * Get department report
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.departmentId] - Department ID
   * @param {string} [req.query.startDate] - Start date
   * @param {string} [req.query.endDate] - End date
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getDepartmentReport(req, res) {
    try {
      const { departmentId, startDate, endDate } = req.query;

      const report = await ReportsRepository.getDepartmentReportExtended(departmentId, startDate, endDate);

      res.json({ success: true, data: report });
    } catch (error) {
      this.logger.error('getDepartmentReport', error);
      res.status(500).json({ success: false, error: 'Failed to generate department report' });
    }
  }

  /**
   * Get attendance report
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.startDate] - Start date
   * @param {string} [req.query.endDate] - End date
   * @param {string} [req.query.departmentId] - Department ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getAttendanceReport(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const churchId = req.user.church_id;

      const report = await ReportsRepository.getAttendanceReport(startDate, endDate, churchId);

      res.json({ success: true, data: report });
    } catch (error) {
      this.logger.error('getAttendanceReport', error);
      res.status(500).json({ success: false, error: 'Failed to generate attendance report' });
    }
  }

  /**
   * Get SMS report
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.startDate] - Start date
   * @param {string} [req.query.endDate] - End date
   * @param {string} [req.query.status] - Filter by status
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getSMSReport(req, res) {
    try {
      const { startDate, endDate, status } = req.query;

      const report = await ReportsRepository.getSMSReport(startDate, endDate, status);

      res.json({ success: true, data: report });
    } catch (error) {
      this.logger.error('getSMSReport', error);
      res.status(500).json({ success: false, error: 'Failed to generate SMS report' });
    }
  }

  /**
   * Get approval report
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.startDate] - Start date
   * @param {string} [req.query.endDate] - End date
   * @param {string} [req.query.status] - Filter by status
   * @param {string} [req.query.entityType] - Filter by entity type
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getApprovalReport(req, res) {
    try {
      const { startDate, endDate, status, entityType } = req.query;

      const report = await ReportsRepository.getApprovalReport(startDate, endDate, status, entityType);

      res.json({ success: true, data: report });
    } catch (error) {
      this.logger.error('getApprovalReport', error);
      res.status(500).json({ success: false, error: 'Failed to generate approval report' });
    }
  }

  /**
   * Export report to various formats
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} req.query.reportType - Type of report to export
   * @param {string} [req.query.startDate] - Start date
   * @param {string} [req.query.endDate] - End date
   * @param {string} [req.query.format] - Export format (csv/json)
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async exportReport(req, res) {
    try {
      const { reportType, startDate, endDate, format } = req.query;

      let data = [];
      let filename = '';

      switch (reportType) {
        case 'financial':
          const financialResult = await this.getFinancialReportData(startDate, endDate);
          data = financialResult;
          filename = 'financial_report';
          break;
        case 'department':
          const deptResult = await this.getDepartmentReportData(startDate, endDate);
          data = deptResult;
          filename = 'department_report';
          break;
        case 'attendance':
          const attendanceResult = await this.getAttendanceReportData(startDate, endDate);
          data = attendanceResult;
          filename = 'attendance_report';
          break;
        default:
          return res.status(400).json({ success: false, error: 'Invalid report type' });
      }

      if (format === 'csv') {
        const csv = this.convertToCSV(data);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
        res.send(csv);
      } else if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}.json`);
        res.json({ success: true, data });
      } else {
        res.json({ success: true, data });
      }
    } catch (error) {
      this.logger.error('exportReport', error);
      res.status(500).json({ success: false, error: 'Failed to export report' });
    }
  }

  /**
   * Get financial report data for export
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @returns {Promise<Array>} Report data rows
   */
  async getFinancialReportData(startDate, endDate) {
    return await ReportsRepository.getFinancialReportData(startDate, endDate);
  }

  /**
   * Get department report data for export
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @returns {Promise<Array>} Report data rows
   */
  async getDepartmentReportData(startDate, endDate) {
    return await ReportsRepository.getDepartmentReportData(startDate, endDate);
  }

  /**
   * Get attendance report data for export
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @returns {Promise<Array>} Report data rows
   */
  async getAttendanceReportData(startDate, endDate) {
    return await ReportsRepository.getAttendanceReportData(startDate, endDate);
  }

  /**
   * Save a custom report configuration
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.name - Report name
   * @param {string} req.body.description - Report description
   * @param {string} req.body.dataSource - Data source
   * @param {Object} req.body.filters - Filter configuration
   * @param {Array} req.body.columns - Column configuration
   * @param {string} req.body.groupBy - Group by field
   * @param {string} req.body.sortBy - Sort by field
   * @param {string} req.body.format - Output format
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async saveReport(req, res) {
    try {
      const { name, description, dataSource, filters, columns, groupBy, sortBy, format } = req.body;

      const report = await ReportsRepository.saveReport({
        name,
        description,
        dataSource,
        filters,
        columns,
        groupBy,
        sortBy,
        format,
        created_by: req.user.id
      });

      res.json({ success: true, report });
    } catch (error) {
      this.logger.error('saveReport', error);
      res.status(500).json({ success: false, error: 'Failed to save report' });
    }
  }

  /**
   * Get saved reports
   * @param {Object} req - Express request object
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getSavedReports(req, res) {
    try {
      const userId = req.user.id;
      const churchId = req.user.church_id;
      const reports = await ReportsRepository.getSavedReports(userId, churchId);
      
      res.json({ success: true, reports });
    } catch (error) {
      this.logger.error('getSavedReports', error);
      res.status(500).json({ success: false, error: 'Failed to fetch saved reports' });
    }
  }

  /**
   * Generate a custom report
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.dataSource - Data source (members/payments/approvals)
   * @param {Array} req.body.filters - Filter array
   * @param {Array} req.body.columns - Column array
   * @param {string} [req.body.groupBy] - Group by field
   * @param {string} [req.body.sortBy] - Sort by field
   * @param {string} [req.body.format] - Output format (csv/pdf/json)
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async generateCustomReport(req, res) {
    try {
      const { dataSource, filters, columns, groupBy, sortBy, format } = req.body;

      const result = await ReportsRepository.generateCustomReport(dataSource, filters, columns, groupBy, sortBy);

      // Format output based on requested format
      if (format === 'csv') {
        const csv = this.convertToCSV(result);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=report.csv');
        res.send(csv);
      } else if (format === 'pdf') {
        const pdf = this.convertToPDF(result, dataSource);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=report.pdf');
        res.send(pdf);
      } else if (format === 'json') {
        res.json({ success: true, data: result });
      } else {
        res.json({ success: true, data: result });
      }
    } catch (error) {
      this.logger.error('generateCustomReport', error);
      res.status(500).json({ success: false, error: 'Failed to generate report' });
    }
  }

  /**
   * Schedule a report
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.name - Report name
   * @param {string} req.body.description - Report description
   * @param {Object} req.body.scheduleConfig - Schedule configuration
   * @param {Object} req.body.reportConfig - Report configuration
   * @param {Array} req.body.recipients - Recipients array
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async scheduleReport(req, res) {
    try {
      const { name, description, scheduleConfig, reportConfig, recipients } = req.body;

      const report = await ReportsRepository.scheduleReport({
        name,
        description,
        scheduleConfig,
        reportConfig,
        recipients,
        created_by: req.user.id
      });

      // Schedule the report
      const reportScheduler = require('../helpers/reportScheduler');
      reportScheduler.scheduleReport(report);

      res.json({ success: true, report });
    } catch (error) {
      this.logger.error('scheduleReport', error);
      res.status(500).json({ success: false, error: 'Failed to schedule report' });
    }
  }

  /**
   * Get scheduled reports
   * @param {Object} req - Express request object
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getScheduledReports(req, res) {
    try {
      const reports = await ReportsRepository.getScheduledReportsByUser(req.user.id);

      res.json({ success: true, reports });
    } catch (error) {
      this.logger.error('getScheduledReports', error);
      res.status(500).json({ success: false, error: 'Failed to fetch scheduled reports' });
    }
  }

  /**
   * Get report execution history
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.reportId - Report ID
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getReportExecutions(req, res) {
    try {
      const { reportId } = req.params;

      const executions = await ReportsRepository.getReportExecutions(reportId);

      res.json({ success: true, executions });
    } catch (error) {
      this.logger.error('getReportExecutions', error);
      res.status(500).json({ success: false, error: 'Failed to fetch report executions' });
    }
  }

  /**
   * Get report templates
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getReportTemplates(req, res) {
    try {
      const templates = [
        {
          id: 'weekly_financial',
          name: 'Weekly Financial Report',
          description: 'Summary of weekly income and expenses',
          dataSource: 'payments',
          scheduleConfig: 'weekly',
          reportConfig: {
            columns: ['id', 'amount', 'payment_date', 'status', 'payment_method'],
            filters: []
          }
        },
        {
          id: 'monthly_attendance',
          name: 'Monthly Attendance Report',
          description: 'Monthly member attendance summary',
          dataSource: 'members',
          scheduleConfig: 'monthly',
          reportConfig: {
            columns: ['id', 'first_name', 'last_name', 'email', 'phone', 'joined_date'],
            filters: []
          }
        },
        {
          id: 'daily_approvals',
          name: 'Daily Approval Summary',
          description: 'Daily approval requests status',
          dataSource: 'approvals',
          scheduleConfig: 'daily',
          reportConfig: {
            columns: ['id', 'title', 'status', 'priority', 'created_at'],
            filters: []
          }
        }
      ];
      
      res.json({ success: true, templates });
    } catch (error) {
      this.logger.error('getReportTemplates', error);
      res.status(500).json({ success: false, error: 'Failed to fetch report templates' });
    }
  }

  /**
   * Convert data to CSV format
   * @param {Array} data - Data array to convert
   * @returns {string} CSV string
   */
  convertToCSV(data) {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [];

    csvRows.push(headers.join(','));

    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        const escaped = ('' + (value ?? '')).replace(/"/g, '\\"');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  /**
   * Convert data to PDF format
   * @param {Array} data - Data array to convert
   * @param {string} dataSource - Data source name for title
   * @returns {string} PDF buffer
   */
  convertToPDF(data, dataSource) {
    if (!data || data.length === 0) {
      const doc = new jsPDF();
      doc.text('No data available', 14, 20);
      return doc.output();
    }

    const doc = new jsPDF();
    const headers = Object.keys(data[0]);
    const rows = data.map(row => headers.map(header => row[header] || ''));

    // Add title
    doc.setFontSize(18);
    doc.text(`${dataSource.charAt(0).toUpperCase() + dataSource.slice(1)} Report`, 14, 22);
    
    // Add date
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);

    // Add table
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 35,
      styles: {
        fontSize: 8,
        cellPadding: 3
      },
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      }
    });

    return doc.output();
  }
}

module.exports = new ReportsController();