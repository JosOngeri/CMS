/**
 * @audit Reports controller (financial/department/attendance/SMS/approval +
 *        custom builder + scheduling).
 * @fixed generateCustomReport is allowlisted+church-scoped; exports and all
 *        getters thread req.user.church_id; save/schedule write church_id.
 *        Report tables created by migrations/050_reports_tables.sql.
 */
const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable');
const BaseController = require('./BaseController');
const ReportsRepository = require('../repositories/ReportsRepository');
const AnalyticsRepository = require('../repositories/AnalyticsRepository');
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

      this.success(res, { data: report });
    } catch (error) {
      this.logger.error('getFinancialReport', error);
      this.error(res, 'Failed to fetch financial report');
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

      const report = await ReportsRepository.getDepartmentReportExtended(departmentId, startDate, endDate, req.user.church_id);

      this.success(res, { data: report });
    } catch (error) {
      this.logger.error('getDepartmentReport', error);
      this.error(res, 'Failed to generate department report');
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

      this.success(res, { data: report });
    } catch (error) {
      this.logger.error('getAttendanceReport', error);
      this.error(res, 'Failed to generate attendance report');
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

      const report = await ReportsRepository.getSMSReport(startDate, endDate, status, req.user.church_id);

      this.success(res, { data: report });
    } catch (error) {
      this.logger.error('getSMSReport', error);
      this.error(res, 'Failed to generate SMS report');
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

      const report = await ReportsRepository.getApprovalReport(startDate, endDate, status, entityType, req.user.church_id);

      this.success(res, { data: report });
    } catch (error) {
      this.logger.error('getApprovalReport', error);
      this.error(res, 'Failed to generate approval report');
    }
  }

  /**
   * Get membership growth report
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {number} [req.query.months=12] - Number of months to analyze
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getMembershipGrowth(req, res) {
    try {
      const { months = 12 } = req.query;
      const churchId = req.user.church_id;

      const report = await ReportsRepository.getMembershipGrowth(churchId, months);

      this.success(res, { data: report });
    } catch (error) {
      this.logger.error('getMembershipGrowth', error);
      this.error(res, 'Failed to generate membership growth report');
    }
  }

  /**
   * Get attendance trend report
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {number} [req.query.weeks=52] - Number of weeks to analyze
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getAttendanceTrend(req, res) {
    try {
      const { weeks = 52 } = req.query;
      const churchId = req.user.church_id;

      const report = await ReportsRepository.getAttendanceTrend(churchId, weeks);

      this.success(res, { data: report });
    } catch (error) {
      this.logger.error('getAttendanceTrend', error);
      this.error(res, 'Failed to generate attendance trend report');
    }
  }

  /**
   * Get member demographics report
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getMemberDemographics(req, res) {
    try {
      const churchId = req.user.church_id;

      const demographics = await AnalyticsRepository.getMemberDemographics(churchId);

      this.success(res, { data: demographics });
    } catch (error) {
      this.logger.error('getMemberDemographics', error);
      this.error(res, 'Failed to generate member demographics report');
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

      const churchId = req.user.church_id;

      switch (reportType) {
        case 'financial': {
          const financialResult = await this.getFinancialReportData(startDate, endDate, churchId);
          data = financialResult;
          filename = 'financial_report';
          break;
        }
        case 'department': {
          const deptResult = await this.getDepartmentReportData(startDate, endDate, churchId);
          data = deptResult;
          filename = 'department_report';
          break;
        }
        case 'attendance': {
          const attendanceResult = await this.getAttendanceReportData(startDate, endDate, churchId);
          data = attendanceResult;
          filename = 'attendance_report';
          break;
        }
        default:
          return this.badRequest(res, 'Invalid report type');
      }

      if (format === 'csv') {
        const csv = this.convertToCSV(data);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
        res.send(csv);
      } else if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}.json`);
        this.success(res, { data });
      } else {
        this.success(res, { data });
      }
    } catch (error) {
      this.logger.error('exportReport', error);
      this.error(res, 'Failed to export report');
    }
  }

  /**
   * Get financial report data for export
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @returns {Promise<Array>} Report data rows
   */
  async getFinancialReportData(startDate, endDate, churchId = null) {
    return await ReportsRepository.getFinancialReportData(startDate, endDate, churchId);
  }

  /**
   * Get department report data for export
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @returns {Promise<Array>} Report data rows
   */
  async getDepartmentReportData(startDate, endDate, churchId = null) {
    return await ReportsRepository.getDepartmentReportData(startDate, endDate, churchId);
  }

  /**
   * Get attendance report data for export
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @returns {Promise<Array>} Report data rows
   */
  async getAttendanceReportData(startDate, endDate, churchId = null) {
    return await ReportsRepository.getAttendanceReportData(startDate, endDate, churchId);
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
        created_by: req.user.id,
        church_id: req.user.church_id
      });

      this.success(res, { report });
    } catch (error) {
      this.logger.error('saveReport', error);
      this.error(res, 'Failed to save report');
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
      
      this.success(res, { reports });
    } catch (error) {
      this.logger.error('getSavedReports', error);
      this.error(res, 'Failed to fetch saved reports');
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

      const result = await ReportsRepository.generateCustomReport(
        dataSource, filters, columns, groupBy, sortBy, req.user.church_id
      );

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
        this.success(res, { data: result });
      } else {
        this.success(res, { data: result });
      }
    } catch (error) {
      this.logger.error('generateCustomReport', error);
      this.error(res, 'Failed to generate report');
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
        created_by: req.user.id,
        church_id: req.user.church_id
      });

      // Schedule the report
      const reportScheduler = require('../helpers/reportScheduler');
      reportScheduler.scheduleReport(report);

      this.success(res, { report });
    } catch (error) {
      this.logger.error('scheduleReport', error);
      this.error(res, 'Failed to schedule report');
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
      const reports = await ReportsRepository.getScheduledReportsByUser(req.user.id, req.user.church_id);

      this.success(res, { reports });
    } catch (error) {
      this.logger.error('getScheduledReports', error);
      this.error(res, 'Failed to fetch scheduled reports');
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

      const executions = await ReportsRepository.getReportExecutions(reportId, req.user.church_id);

      this.success(res, { executions });
    } catch (error) {
      this.logger.error('getReportExecutions', error);
      this.error(res, 'Failed to fetch report executions');
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
      const churchId = req.user?.church_id;
      const templates = await ReportsRepository.getReportTemplates(churchId);

      this.success(res, { templates });
    } catch (error) {
      this.logger.error('getReportTemplates', error);
      this.error(res, 'Failed to fetch report templates');
    }
  }

  /**
   * Dispatch a report_type to its data generator. Returns null for unknown
   * types so callers can 400. All generators are church-scoped.
   */
  async _generateReportData(reportType, dateRange, churchId) {
    const start = dateRange?.start || null;
    const end = dateRange?.end || null;
    switch (reportType) {
      case 'financial':
      case 'treasury':
        return ReportsRepository.getFinancialReportData(start, end, churchId);
      case 'departments':
        return ReportsRepository.getDepartmentReportData(start, end, churchId);
      case 'attendance':
        return ReportsRepository.getAttendanceReportData(start, end, churchId);
      case 'membership':
        return ReportsRepository.getMembershipGrowth(churchId, 12);
      case 'events':
        return ReportsRepository.getEventsReportData(start, end, churchId);
      default:
        return null;
    }
  }

  /**
   * List generated reports for this church (frontend Reports.jsx contract:
   * rows expose report_name, report_type, parameters, generated_at).
   */
  async listReports(req, res) {
    try {
      const reports = await ReportsRepository.getReports(req.user.church_id);
      this.success(res, { reports });
    } catch (error) {
      this.logger.error('listReports', error);
      this.error(res, 'Failed to fetch reports');
    }
  }

  /**
   * Generate a report: runs the type's data generator, then persists a row in
   * `reports` so the result is listable + downloadable later.
   * Body: { report_type, date_range: {start, end}, export_format, name? }
   */
  async createReport(req, res) {
    try {
      const { report_type, date_range, export_format, name } = req.body;
      const data = await this._generateReportData(report_type, date_range, req.user.church_id);
      if (data === null) return this.badRequest(res, `Unknown report type: ${report_type}`);

      const report = await ReportsRepository.createReport({
        name: name || `${report_type} report`,
        reportType: report_type,
        parameters: { date_range: date_range || {}, row_count: data.length },
        format: export_format || 'json',
        created_by: req.user.id,
        church_id: req.user.church_id
      });
      this.success(res, { report }, 'Report generated', 201);
    } catch (error) {
      this.logger.error('createReport', error);
      this.error(res, 'Failed to generate report');
    }
  }

  /**
   * Download a generated report: regenerate from the stored parameters and
   * stream in the requested format. `xlsx` degrades to CSV — no xlsx library
   * is installed, and the content-type is honest so clients name it .csv.
   */
  async downloadReport(req, res) {
    try {
      const report = await ReportsRepository.getReportById(req.params.id, req.user.church_id);
      if (!report) return this.error(res, 'Report not found', 404);

      const data = await this._generateReportData(
        report.report_type, report.parameters?.date_range, req.user.church_id
      ) || [];

      const format = req.query.format === 'pdf' ? 'pdf' : 'csv';
      const filename = `report_${report.id}.${format}`;
      if (format === 'pdf') {
        const pdf = this.convertToPDF(data, report.report_type);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.send(pdf);
      } else {
        const csv = this.convertToCSV(data);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.send(csv);
      }
    } catch (error) {
      this.logger.error('downloadReport', error);
      this.error(res, 'Failed to download report');
    }
  }

  /**
   * Convert data to CSV format
   * @param {Array} data - Data array to convert
   * @returns {string} CSV string
   */
  convertToCSV(data) {
    if (!data || data.length === 0) return '';

    // RFC 4180: quotes escape by doubling, not backslash (\\\" is literal junk).
    // Cells starting with = + - @ TAB CR execute as formulas in Excel/Sheets —
    // prefix with ' to neutralise (OWASP CSV injection guidance).
    const cell = (v) => {
      let s = v === null || v === undefined ? '' : String(v);
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return '"' + s.replace(/"/g, '""') + '"';
    };

    const headers = Object.keys(data[0]);
    const csvRows = [headers.map(cell).join(',')];
    for (const row of data) {
      csvRows.push(headers.map(h => cell(row[h])).join(','));
    }
    return csvRows.join('\r\n');
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