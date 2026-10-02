/**
 * Export Service
 * File formatting logic for accounting software exports
 * (CSV, QuickBooks IIF, Xero CSV)
 */
class ExportService {
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

module.exports = new ExportService();
