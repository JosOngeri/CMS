const BaseController = require('./BaseController');
const { createLogger } = require('../helpers/controllerLogger');
const accountingExportRepository = require('../repositories/AccountingExportRepository');

/**
 * Accounting Export Controller
 * Handles export to accounting software (QuickBooks, Xero, Sage, etc.)
 */
class AccountingExportController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('AccountingExportController');
  }

  async getAllExports(req, res) {
    try {
      const { export_format, status } = req.query;
      
      const result = await accountingExportRepository.getAllExports({ export_format, status });

      res.json({ success: true, data: result });
    } catch (error) {
      this.logger.error('getAllExports', error);
      res.status(500).json({ success: false, error: 'Failed to fetch exports' });
    }
  }

  async getExportById(req, res) {
    try {
      const { id } = req.params;

      const result = await accountingExportRepository.getExportById(id);

      if (!result) {
        return res.status(404).json({ success: false, error: 'Export not found' });
      }

      res.json({ success: true, data: result });
    } catch (error) {
      this.logger.error('getExportById', error);
      res.status(500).json({ success: false, error: 'Failed to fetch export' });
    }
  }

  async exportJournalEntries(req, res) {
    try {
      const { export_format, start_date, end_date, status } = req.body;

      const entries = await accountingExportRepository.getJournalEntries({
        start_date,
        end_date,
        status
      });

      const entryIds = entries.map(je => je.id);
      const lines = await accountingExportRepository.getJournalEntryLines(entryIds);

      const entriesWithLines = entries.map(je => ({
        ...je,
        lines: lines.filter(line => line.journal_entry_id === je.id)
      }));

      const exportData = this.generateJournalEntryExport(entriesWithLines, export_format);

      const exportRecord = await accountingExportRepository.createExportRecord({
        export_type: 'journal_entries',
        export_format,
        date_range_start: start_date,
        date_range_end: end_date,
        record_count: entriesWithLines.length,
        file_path: exportData.file_path,
        created_by: req.user.id
      });

      res.json({
        success: true,
        data: {
          export: exportRecord,
          export_data: exportData
        }
      });
    } catch (error) {
      this.logger.error('exportJournalEntries', error);
      res.status(500).json({ success: false, error: 'Failed to export journal entries' });
    }
  }

  async exportChartOfAccounts(req, res) {
    try {
      const { export_format } = req.body;

      const accounts = await accountingExportRepository.getChartOfAccounts();

      const exportData = this.generateChartOfAccountsExport(accounts, export_format);

      const exportRecord = await accountingExportRepository.createExportRecordWithoutDateRange({
        export_type: 'chart_of_accounts',
        export_format,
        record_count: accounts.length,
        file_path: exportData.file_path,
        created_by: req.user.id
      });

      res.json({
        success: true,
        data: {
          export: exportRecord,
          export_data: exportData
        }
      });
    } catch (error) {
      this.logger.error('exportChartOfAccounts', error);
      res.status(500).json({ success: false, error: 'Failed to export chart of accounts' });
    }
  }

  async exportTransactions(req, res) {
    try {
      const { export_format, start_date, end_date, transaction_type } = req.body;

      const transactions = await accountingExportRepository.getTransactions({
        start_date,
        end_date,
        transaction_type
      });

      const exportData = this.generateTransactionExport(transactions, export_format);

      const exportRecord = await accountingExportRepository.createExportRecord({
        export_type: 'transactions',
        export_format,
        date_range_start: start_date,
        date_range_end: end_date,
        record_count: transactions.length,
        file_path: exportData.file_path,
        created_by: req.user.id
      });

      res.json({
        success: true,
        data: {
          export: exportRecord,
          export_data: exportData
        }
      });
    } catch (error) {
      this.logger.error('exportTransactions', error);
      res.status(500).json({ success: false, error: 'Failed to export transactions' });
    }
  }

  generateJournalEntryExport(entries, format) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `journal-entries-${timestamp}`;

    switch (format) {
      case 'csv':
        return {
          format: 'csv',
          file_path: `/exports/${fileName}.csv`,
          content: this.generateCSV(entries, 'journal_entry')
        };
      case 'quickbooks':
        return {
          format: 'quickbooks',
          file_path: `/exports/${fileName}.iif`,
          content: this.generateQuickBooksIIF(entries, 'journal_entry')
        };
      case 'xero':
        return {
          format: 'xero',
          file_path: `/exports/${fileName}.csv`,
          content: this.generateXeroCSV(entries, 'journal_entry')
        };
      default:
        return {
          format: 'csv',
          file_path: `/exports/${fileName}.csv`,
          content: this.generateCSV(entries, 'journal_entry')
        };
    }
  }

  generateChartOfAccountsExport(accounts, format) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `chart-of-accounts-${timestamp}`;

    switch (format) {
      case 'csv':
        return {
          format: 'csv',
          file_path: `/exports/${fileName}.csv`,
          content: this.generateCSV(accounts, 'chart_of_accounts')
        };
      case 'quickbooks':
        return {
          format: 'quickbooks',
          file_path: `/exports/${fileName}.iif`,
          content: this.generateQuickBooksIIF(accounts, 'chart_of_accounts')
        };
      case 'xero':
        return {
          format: 'xero',
          file_path: `/exports/${fileName}.csv`,
          content: this.generateXeroCSV(accounts, 'chart_of_accounts')
        };
      default:
        return {
          format: 'csv',
          file_path: `/exports/${fileName}.csv`,
          content: this.generateCSV(accounts, 'chart_of_accounts')
        };
    }
  }

  generateTransactionExport(transactions, format) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `transactions-${timestamp}`;

    switch (format) {
      case 'csv':
        return {
          format: 'csv',
          file_path: `/exports/${fileName}.csv`,
          content: this.generateCSV(transactions, 'transaction')
        };
      case 'quickbooks':
        return {
          format: 'quickbooks',
          file_path: `/exports/${fileName}.iif`,
          content: this.generateQuickBooksIIF(transactions, 'transaction')
        };
      case 'xero':
        return {
          format: 'xero',
          file_path: `/exports/${fileName}.csv`,
          content: this.generateXeroCSV(transactions, 'transaction')
        };
      default:
        return {
          format: 'csv',
          file_path: `/exports/${fileName}.csv`,
          content: this.generateCSV(transactions, 'transaction')
        };
    }
  }

  generateCSV(data, type) {
    // Simple CSV generation
    const headers = Object.keys(data[0] || {}).join(',');
    const rows = data.map(row => Object.values(row).join(',')).join('\n');
    return `${headers}\n${rows}`;
  }

  generateQuickBooksIIF(data, type) {
    // QuickBooks IIF format generation
    let iif = '';
    
    if (type === 'chart_of_accounts') {
      iif = '!ACCNT\tNAME\tACCNTTYPE\tDESC\n';
      data.forEach(acc => {
        iif += `ACCNT\t${acc.account_code}\t${acc.account_type}\t${acc.account_name}\n`;
      });
    } else if (type === 'journal_entry') {
      iif = '!TRNS\tTRNSTYPE\tDATE\tACCNT\tAMOUNT\tMEMO\n';
      data.forEach(je => {
        if (je.lines && je.lines.length > 0) {
          je.lines.forEach(line => {
            iif += `TRNS\tJOURNAL\t${je.entry_date}\t${line.account_code}\t${line.debit_amount || 0}\t${je.description}\n`;
          });
        }
      });
    }

    return iif;
  }

  generateXeroCSV(data, type) {
    // Xero CSV format generation
    let csv = '';
    
    if (type === 'chart_of_accounts') {
      csv = '*Account Code,Account Name,Account Type,Description\n';
      data.forEach(acc => {
        csv += `${acc.account_code},"${acc.account_name}",${acc.account_type},"${acc.account_name}"\n`;
      });
    } else if (type === 'journal_entry') {
      csv = '*Date,Reference,Account Code,Account Name,Debit,Credit,Description\n';
      data.forEach(je => {
        if (je.lines && je.lines.length > 0) {
          je.lines.forEach(line => {
            csv += `${je.entry_date},${je.entry_number},${line.account_code},"${line.account_name}",${line.debit_amount || 0},${line.credit_amount || 0},"${je.description}"\n`;
          });
        }
      });
    }

    return csv;
  }
}

module.exports = new AccountingExportController();
