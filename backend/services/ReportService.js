const logger = require('../config/logging');

/**
 * Report Service
 * Handles report generation, formatting, and document creation
 * Supports multiple output formats: text, CSV, and future PDF generation
 */
class ReportService {
  /**
   * Generate a collection statement in text format
   * @param {Array} collections - Array of collection records
   * @param {Object} userInfo - User information for the statement header
   * @param {Object} options - Formatting options
   * @returns {string} Formatted statement text
   */
  generateCollectionStatement(collections, userInfo, options = {}) {
    const {
      includeHeader = true,
      includeSummary = true,
      includeDetails = true,
      dateFormat = 'YYYY-MM-DD'
    } = options;

    let statement = '';

    // Header section
    if (includeHeader) {
      statement += this.generateStatementHeader(userInfo);
    }

    // Summary section
    if (includeSummary) {
      statement += this.generateStatementSummary(collections);
    }

    // Details section
    if (includeDetails) {
      statement += this.generateStatementDetails(collections);
    }

    return statement;
  }

  /**
   * Generate statement header
   * @param {Object} userInfo - User information
   * @returns {string} Header text
   */
  generateStatementHeader(userInfo) {
    const header = `COLLECTION STATEMENT\n`;
    header += `Generated: ${new Date().toLocaleString()}\n`;
    header += `User ID: ${userInfo.id || 'N/A'}\n`;
    header += `User Name: ${userInfo.name || 'N/A'}\n\n`;
    return header;
  }

  /**
   * Generate statement summary
   * @param {Array} collections - Array of collection records
   * @returns {string} Summary text
   */
  generateStatementSummary(collections) {
    const total = collections.reduce((sum, row) => sum + parseFloat(row.amount || 0), 0);
    const count = collections.length;

    let summary = `SUMMARY\n`;
    summary += `Total Collections: ${count}\n`;
    summary += `Total Amount: KES ${total.toLocaleString()}\n\n`;
    return summary;
  }

  /**
   * Generate statement details with formatted table
   * @param {Array} collections - Array of collection records
   * @returns {string} Details text
   */
  generateStatementDetails(collections) {
    let details = `DETAILS\n`;
    
    // Table header
    details += `${'Date'.padEnd(20)}${'Purpose'.padEnd(20)}${'Fund'.padEnd(15)}${'Amount'.padEnd(15)}\n`;
    details += `${'='.repeat(70)}\n`;

    // Table rows
    collections.forEach(row => {
      const date = row.date ? row.date.substring(0, 10) : 'N/A';
      const purpose = row.purpose || 'N/A';
      const fund = row.fund || 'N/A';
      const amount = 'KES ' + parseFloat(row.amount || 0).toLocaleString();
      
      details += `${date.padEnd(20)}${purpose.padEnd(20)}${fund.padEnd(15)}${amount.padEnd(15)}\n`;
    });

    return details;
  }

  /**
   * Generate CSV format for collections
   * @param {Array} collections - Array of collection records
   * @returns {string} CSV formatted string
   */
  generateCollectionCSV(collections) {
    const headers = ['Date', 'Purpose', 'Fund', 'Amount'];
    const csvRows = [headers.join(',')];

    collections.forEach(row => {
      const date = row.date ? row.date.substring(0, 10) : '';
      const purpose = this.escapeCSV(row.purpose || '');
      const fund = this.escapeCSV(row.fund || '');
      const amount = row.amount || 0;
      
      csvRows.push(`${date},${purpose},${fund},${amount}`);
    });

    return csvRows.join('\n');
  }

  /**
   * Escape CSV values
   * @param {string} value - Value to escape
   * @returns {string} Escaped value
   */
  escapeCSV(value) {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Generate financial report summary
   * @param {Object} financialData - Financial data object
   * @returns {Object} Summary with calculations
   */
  generateFinancialSummary(financialData) {
    const {
      total_income = 0,
      total_expenses = 0,
      target_amount = 0
    } = financialData;

    const net_amount = total_income - total_expenses;
    const progress = target_amount > 0 ? (total_income / target_amount) * 100 : 0;
    const variance = target_amount - total_income;

    return {
      total_income,
      total_expenses,
      net_amount,
      target_amount,
      progress: Math.min(progress, 100),
      variance,
      is_on_track: variance >= 0
    };
  }

  /**
   * Generate progress report with status indicators
   * @param {number} current - Current value
   * @param {number} target - Target value
   * @returns {Object} Progress information
   */
  generateProgressReport(current, target) {
    const percentage = target > 0 ? (current / target) * 100 : 0;
    
    let status = 'on_track';
    if (percentage >= 100) {
      status = 'completed';
    } else if (percentage >= 75) {
      status = 'ahead';
    } else if (percentage >= 50) {
      status = 'on_track';
    } else if (percentage >= 25) {
      status = 'behind';
    } else {
      status = 'critical';
    }

    return {
      current,
      target,
      percentage: Math.min(percentage, 100),
      remaining: Math.max(0, target - current),
      status
    };
  }

  /**
   * Format currency for display
   * @param {number} amount - Amount to format
   * @param {string} currency - Currency code (default: KES)
   * @returns {string} Formatted currency string
   */
  formatCurrency(amount, currency = 'KES') {
    return `${currency} ${parseFloat(amount || 0).toLocaleString()}`;
  }

  /**
   * Generate statement filename
   * @param {string} userId - User ID
   * @param {string} format - File format (txt, csv, pdf)
   * @returns {string} Generated filename
   */
  generateStatementFilename(userId, format = 'txt') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `statement_${userId}_${timestamp}.${format}`;
  }

  /**
   * Validate report parameters
   * @param {Object} params - Report parameters
   * @returns {Object} Validation result
   */
  validateReportParameters(params) {
    const errors = [];

    if (params.start_date && params.end_date) {
      const start = new Date(params.start_date);
      const end = new Date(params.end_date);
      if (end < start) {
        errors.push('End date must be after start date');
      }
    }

    if (params.format && !['txt', 'csv', 'pdf'].includes(params.format)) {
      errors.push('Invalid format. Must be txt, csv, or pdf');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = new ReportService();