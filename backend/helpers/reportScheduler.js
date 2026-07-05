const cron = require('node-cron');
const { pool } = require('../config/database');
const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable');
const fs = require('fs');
const path = require('path');
const { createLogger } = require('./controllerLogger');

const logger = createLogger('reportScheduler');

class ReportScheduler {
  constructor() {
    this.scheduledJobs = new Map();
    this.init();
  }

  async init() {
    logger.info('init', 'Initializing report scheduler...');
    await this.loadScheduledReports();
    this.startScheduler();
  }

  async loadScheduledReports() {
    try {
      // Check if scheduled_reports table exists first
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'scheduled_reports'
        )
      `).catch(() => ({ rows: [{ exists: false }] }));

      if (!tableCheck.rows[0].exists) {
        logger.info('loadScheduledReports', 'scheduled_reports table does not exist, skipping report scheduler');
        return;
      }

      const result = await pool.query(
        `SELECT * FROM scheduled_reports WHERE is_active = true`
      );

      for (const report of result.rows) {
        this.scheduleReport(report);
      }

      logger.info('loadScheduledReports', `Loaded ${result.rows.length} scheduled reports`);
    } catch (error) {
      logger.error('loadScheduledReports', 'Error loading scheduled reports:', error.message);
      // Don't crash the server if report scheduler fails
    }
  }

  scheduleReport(report) {
    const { id, name, schedule_config, report_config } = report;
    const cronExpression = this.parseSchedule(schedule_config);

    if (!cronExpression) {
      logger.error('scheduleReport', `Invalid schedule for report ${id}: ${schedule_config}`);
      return;
    }

    const job = cron.schedule(cronExpression, async () => {
      await this.executeScheduledReport(report);
    }, {
      scheduled: true,
      timezone: 'Africa/Nairobi'
    });

    this.scheduledJobs.set(id, job);
    logger.info('scheduleReport', `Scheduled report "${name}" with cron: ${cronExpression}`);
  }

  parseSchedule(scheduleConfig) {
    // Parse schedule config (e.g., "daily", "weekly", "monthly", or custom cron)
    switch (scheduleConfig) {
      case 'daily':
        return '0 8 * * *'; // 8 AM daily
      case 'weekly':
        return '0 8 * * 1'; // 8 AM every Monday
      case 'monthly':
        return '0 8 1 * *'; // 8 AM on 1st of every month
      default:
        // Assume it's a custom cron expression
        return scheduleConfig;
    }
  }

  async executeScheduledReport(report) {
    try {
      logger.info('executeScheduledReport', `Executing scheduled report: ${report.name}`);
      
      const data = await this.generateReportData(report.report_config);
      const pdf = this.generatePDF(data, report.name);
      
      // Save PDF to disk
      const filename = `${report.name}_${Date.now()}.pdf`;
      const filepath = path.join(__dirname, '../uploads/reports', filename);
      
      if (!fs.existsSync(path.dirname(filepath))) {
        fs.mkdirSync(path.dirname(filepath), { recursive: true });
      }
      
      fs.writeFileSync(filepath, pdf);
      
      // Record execution
      await pool.query(
        `INSERT INTO report_executions (report_id, filename, status, executed_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
        [report.id, filename, 'completed']
      );
      
      logger.info('executeScheduledReport', `Report "${report.name}" executed successfully: ${filename}`);
      
      // TODO: Send notification/email to recipients
      
    } catch (error) {
      logger.error('executeScheduledReport', `Error executing scheduled report ${report.name}:`, error);
      
      // Record failure
      await pool.query(
        `INSERT INTO report_executions (report_id, status, error_message, executed_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
        [report.id, 'failed', error.message]
      );
    }
  }

  async generateReportData(reportConfig) {
    const { dataSource, filters, columns } = reportConfig;
    let query = '';
    let params = [];
    let paramIndex = 1;

    switch (dataSource) {
      case 'members':
        query = 'SELECT ';
        query += columns.map(col => `${col}`).join(', ');
        query += ' FROM users WHERE is_active = true';
        break;
      case 'payments':
        query = 'SELECT ';
        query += columns.map(col => `${col}`).join(', ');
        query += ' FROM payments WHERE 1=1';
        break;
      case 'approvals':
        query = 'SELECT ';
        query += columns.map(col => `${col}`).join(', ');
        query += ' FROM approval_requests WHERE 1=1';
        break;
      default:
        throw new Error(`Invalid data source: ${dataSource}`);
    }

    if (filters && filters.length > 0) {
      filters.forEach(filter => {
        query += ` AND ${filter.field} ${filter.operator} $${paramIndex++}`;
        params.push(filter.value);
      });
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  generatePDF(data, title) {
    if (!data || data.length === 0) {
      const doc = new jsPDF();
      doc.text('No data available', 14, 20);
      return doc.output();
    }

    const doc = new jsPDF();
    const headers = Object.keys(data[0]);
    const rows = data.map(row => headers.map(header => row[header] || ''));

    doc.setFontSize(18);
    doc.text(title, 14, 22);
    
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);

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

  startScheduler() {
    logger.info('startScheduler', 'Report scheduler started');
  }

  stopScheduler() {
    this.scheduledJobs.forEach((job, id) => {
      job.stop();
      logger.info('stopScheduler', `Stopped scheduled report ${id}`);
    });
    this.scheduledJobs.clear();
  }
}

// Singleton instance
const reportScheduler = new ReportScheduler();

module.exports = reportScheduler;
