import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, Search, Download, Filter, MoreVertical, FileSpreadsheet, FileText } from 'lucide-react'
import { FixedSizeList as List } from 'react-window'
import XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const DataTable = ({
  columns,
  data,
  sortable = true,
  selectable = true,
  rowActions = [],
  batchActions = [],
  pagination = true,
  exportable = true,
  enableExcelExport = true,
  enablePDFExport = true,
  enableCSVExport = true,
  filterable = true,
  pageSize = 10,
  enableVirtualScroll = false,
  virtualScrollHeight = 400,
  idField = 'id'
}) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
  const [selectedRows, setSelectedRows] = useState(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({})

  // Sorting logic
  const handleSort = (key) => {
    if (!sortable) return
    
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const sortedData = () => {
    if (!sortConfig.key) return data

    return [...data].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1
      }
      return 0
    })
  }

  // Filtering logic
  const filteredData = sortedData().filter(row => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      return Object.values(row).some(value => 
        String(value).toLowerCase().includes(searchLower)
      )
    }
    
    if (Object.keys(filters).length > 0) {
      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true
        return String(row[key]) === String(value)
      })
    }
    
    return true
  })

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / pageSize)
  const paginatedData = pagination 
    ? filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : filteredData

  // Selection logic
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedRows(new Set(paginatedData.map(row => row[idField])))
    } else {
      setSelectedRows(new Set())
    }
  }

  const handleSelectRow = (rowId) => {
    const newSelected = new Set(selectedRows)
    if (newSelected.has(rowId)) {
      newSelected.delete(rowId)
    } else {
      newSelected.add(rowId)
    }
    setSelectedRows(newSelected)
  }

  // Export functionality
  const exportToCSV = () => {
    const headers = columns.map(col => col.header).join(',')
    const rows = filteredData.map(row =>
      columns.map(col => row[col.key]).join(',')
    )
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'export.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportToExcel = () => {
    // Prepare data for Excel export
    const exportData = filteredData.map(row => {
      const rowData = {}
      columns.forEach(col => {
        rowData[col.header] = row[col.key]
      })
      return rowData
    })

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(exportData)

    // Create workbook
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data')

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(workbook, `export_${timestamp}.xlsx`)
  }

  const exportToPDF = () => {
    // Prepare data for PDF export
    const tableHeaders = columns.map(col => col.header)
    const tableData = filteredData.map(row =>
      columns.map(col => row[col.key])
    )

    // Create PDF document
    const doc = new jsPDF()

    // Add title
    doc.setFontSize(16)
    doc.text('Data Export', 14, 15)

    // Add timestamp
    doc.setFontSize(10)
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22)

    // Add table
    autoTable(doc, {
      head: [tableHeaders],
      body: tableData,
      startY: 28,
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [66, 66, 66],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      }
    })

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 10)
    doc.save(`export_${timestamp}.pdf`)
  }

  return (
    <div className="data-table-container">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        {filterable && (
          <div className="relative w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--color-textSecondary)]" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              aria-label="Search data"
            />
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
          {batchActions.length > 0 && selectedRows.size > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {batchActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => action.onExecute(selectedRows)}
                  className="px-4 py-3 md:px-3 md:py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm min-h-[44px]"
                  aria-label={action.label}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
          
          {exportable && (
            <div className="flex items-center gap-2">
              {enableCSVExport && (
                <button
                  onClick={exportToCSV}
                  className="px-4 py-3 md:px-3 md:py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] flex items-center justify-center gap-2 text-sm min-h-[44px]"
                  aria-label="Export as CSV"
                  title="Export as CSV"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">CSV</span>
                </button>
              )}
              {enableExcelExport && (
                <button
                  onClick={exportToExcel}
                  className="px-4 py-3 md:px-3 md:py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] flex items-center justify-center gap-2 text-sm min-h-[44px]"
                  aria-label="Export as Excel"
                  title="Export as Excel"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span className="hidden sm:inline">Excel</span>
                </button>
              )}
              {enablePDFExport && (
                <button
                  onClick={exportToPDF}
                  className="px-4 py-3 md:px-3 md:py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] flex items-center justify-center gap-2 text-sm min-h-[44px]"
                  aria-label="Export as PDF"
                  title="Export as PDF"
                >
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">PDF</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Table - Desktop View */}
      <div className="hidden md:block overflow-x-auto border border-[var(--color-border)] rounded-lg">
        <table className="w-full" role="table" aria-label="Data table">
          <thead className="bg-[var(--color-background)]">
            <tr>
              {selectable && (
                <th className="px-4 py-3 text-left" scope="col">
                  <input
                    type="checkbox"
                    checked={paginatedData.length > 0 && paginatedData.every(row => selectedRows.has(row[idField]))}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded"
                    aria-label="Select all rows"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text)] cursor-pointer hover:bg-[var(--color-surface)]"
                  onClick={() => handleSort(column.key)}
                  scope="col"
                  aria-sort={
                    sortConfig.key === column.key
                      ? sortConfig.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                >
                  <div className="flex items-center gap-2">
                    {column.header}
                    {sortable && (
                      <div className="flex flex-col" aria-hidden="true">
                        <ChevronUp className={`h-3 w-3 ${sortConfig.key === column.key && sortConfig.direction === 'asc' ? 'text-primary-600' : 'text-[var(--color-textSecondary)]'}`} />
                        <ChevronDown className={`h-3 w-3 ${sortConfig.key === column.key && sortConfig.direction === 'desc' ? 'text-primary-600' : 'text-[var(--color-textSecondary)]'}`} />
                      </div>
                    )}
                  </div>
                </th>
              ))}
              {rowActions.length > 0 && (
                <th className="px-4 py-3 text-right" scope="col">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {paginatedData.map((row, index) => (
              <tr key={row[idField] || index} className="hover:bg-[var(--color-background)]">
                {selectable && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(row[idField])}
                      onChange={() => handleSelectRow(row[idField])}
                      className="rounded"
                      aria-label={`Select row ${index + 1}`}
                    />
                  </td>
                )}
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 text-sm text-[var(--color-text)]">
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
                {rowActions.length > 0 && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {rowActions.map((action, actionIndex) => (
                        <button
                          key={actionIndex}
                          onClick={() => action.onExecute(row)}
                          className="p-1 hover:bg-[var(--color-surface)] rounded"
                          title={action.label}
                          aria-label={action.label}
                        >
                          <action.icon className="h-4 w-4 text-[var(--color-textSecondary)]" />
                        </button>
                      ))}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Virtual Scroll View for Large Datasets */}
      {enableVirtualScroll && filteredData.length > 50 && (
        <div className="hidden md:block border border-[var(--color-border)] rounded-lg overflow-hidden">
          <div className="bg-[var(--color-background)]">
            <table className="w-full" role="table" aria-label="Data table with virtual scrolling">
              <thead>
                <tr>
                  {selectable && (
                    <th className="px-4 py-3 text-left" scope="col">
                      <input
                        type="checkbox"
                        checked={filteredData.length > 0 && filteredData.every(row => selectedRows.has(row[idField]))}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded"
                        aria-label="Select all rows"
                      />
                    </th>
                  )}
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text)] cursor-pointer hover:bg-[var(--color-surface)]"
                      onClick={() => handleSort(column.key)}
                      scope="col"
                      aria-sort={
                        sortConfig.key === column.key
                          ? sortConfig.direction === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                    >
                      <div className="flex items-center gap-2">
                        {column.header}
                        {sortable && (
                          <div className="flex flex-col" aria-hidden="true">
                            <ChevronUp className={`h-3 w-3 ${sortConfig.key === column.key && sortConfig.direction === 'asc' ? 'text-primary-600' : 'text-[var(--color-textSecondary)]'}`} />
                            <ChevronDown className={`h-3 w-3 ${sortConfig.key === column.key && sortConfig.direction === 'desc' ? 'text-primary-600' : 'text-[var(--color-textSecondary)]'}`} />
                          </div>
                        )}
                      </div>
                    </th>
                  ))}
                  {rowActions.length > 0 && (
                    <th className="px-4 py-3 text-right" scope="col">Actions</th>
                  )}
                </tr>
              </thead>
            </table>
          </div>
          <div style={{ height: virtualScrollHeight }}>
            <List
              height={virtualScrollHeight}
              itemCount={filteredData.length}
              itemSize={50}
              width="100%"
            >
              {({ index, style }) => {
                const row = filteredData[index]
                return (
                  <div style={style} className="flex items-center border-b border-[var(--color-border)] hover:bg-[var(--color-background)] px-4">
                    {selectable && (
                      <input
                        type="checkbox"
                        checked={selectedRows.has(row[idField])}
                        onChange={() => handleSelectRow(row[idField])}
                        className="rounded mr-4"
                        aria-label={`Select row ${index + 1}`}
                      />
                    )}
                    {columns.map((column) => (
                      <div key={column.key} className="flex-1 text-sm text-[var(--color-text)] truncate">
                        {column.render ? column.render(row[column.key], row) : row[column.key]}
                      </div>
                    ))}
                    {rowActions.length > 0 && (
                      <div className="flex items-center justify-end gap-2 ml-4">
                        {rowActions.map((action, actionIndex) => (
                          <button
                            key={actionIndex}
                            onClick={() => action.onExecute(row)}
                            className="p-1 hover:bg-[var(--color-surface)] rounded"
                            title={action.label}
                            aria-label={action.label}
                          >
                            <action.icon className="h-4 w-4 text-[var(--color-textSecondary)]" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              }}
            </List>
          </div>
        </div>
      )}

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {paginatedData.map((row, index) => (
          <div key={row[idField] || index} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              {selectable && (
                <input
                  type="checkbox"
                  checked={selectedRows.has(row[idField])}
                  onChange={() => handleSelectRow(row[idField])}
                  className="rounded mt-1"
                  aria-label={`Select row ${index + 1}`}
                />
              )}
              {rowActions.length > 0 && (
                <div className="flex items-center gap-2 ml-auto">
                  {rowActions.map((action, actionIndex) => (
                    <button
                      key={actionIndex}
                      onClick={() => action.onExecute(row)}
                      className="p-2 hover:bg-[var(--color-surface)] rounded-lg"
                      title={action.label}
                      aria-label={action.label}
                    >
                      <action.icon className="h-5 w-5 text-[var(--color-textSecondary)]" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              {columns.map((column) => (
                <div key={column.key} className="flex flex-col">
                  <span className="text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wide">
                    {column.header}
                  </span>
                  <span className="text-sm text-[var(--color-text)]">
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4">
          <div className="text-sm text-[var(--color-textSecondary)] text-center sm:text-left">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} results
          </div>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-4 py-3 md:px-3 md:py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] disabled:opacity-50 disabled:cursor-not-allowed text-sm min-h-[44px]"
              aria-label="Previous page"
            >
              Previous
            </button>
            <span className="px-3 py-2 text-sm text-[var(--color-textSecondary)]" aria-live="polite">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-3 md:px-3 md:py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] disabled:opacity-50 disabled:cursor-not-allowed text-sm min-h-[44px]"
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DataTable
