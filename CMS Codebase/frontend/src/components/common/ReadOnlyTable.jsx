import React from 'react';
import { Lock, Eye } from 'lucide-react';

/**
 * ReadOnlyTable - Read-only version of data table
 */
const ReadOnlyTable = ({ 
  columns, 
  data, 
  title, 
  showBadge = true,
  emptyMessage = 'No data available'
}) => {
  return (
    <div className="relative">
      {showBadge && (
        <div className="mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-lg">
            <Eye className="w-4 h-4 text-yellow-600" aria-hidden="true" />
            <span className="text-sm font-medium text-yellow-700">
              View Only Mode
            </span>
          </div>
        </div>
      )}
      {title && (
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-semibold text-[var(--color-text)]">
            {title}
          </h3>
          <Lock className="w-4 h-4 text-[var(--color-textSecondary)]" aria-hidden="true" />
        </div>
      )}
      <div className="bg-[var(--color-background)] rounded-lg border border-[var(--color-border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" role="table" aria-label={title || 'Read-only data table'}>
            <thead className="bg-[var(--color-surface)]">
              <tr>
                {columns.map((column, index) => (
                  <th
                    key={index}
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider"
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-[var(--color-surface)] divide-y divide-[var(--color-border)]">
              {data && data.length > 0 ? (
                data.map((row, rowIndex) => (
                  <tr key={rowIndex} className="opacity-75">
                    {columns.map((column, colIndex) => (
                      <td
                        key={colIndex}
                        className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-textSecondary)]"
                      >
                        {column.render ? column.render(row) : row[column.accessor]}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center">
                    <p className="text-sm text-[var(--color-textSecondary)]">{emptyMessage}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/**
 * ReadOnlyDataTable - Wrapper for read-only data display
 */
const ReadOnlyDataTable = ({ 
  title, 
  data, 
  columns, 
  onRefresh,
  showRefresh = false,
  showBadge = true 
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {title && (
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-[var(--color-text)]">
              {title}
            </h3>
            <Lock className="w-4 h-4 text-[var(--color-textSecondary)]" aria-hidden="true" />
          </div>
        )}
        {showRefresh && onRefresh && (
          <button
            onClick={onRefresh}
            className="text-[var(--color-textSecondary)] hover:text-[var(--color-textSecondary)]"
            aria-label="Refresh data"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
      </div>
      <ReadOnlyTable
        columns={columns}
        data={data}
        showBadge={showBadge}
      />
    </div>
  );
};

export default ReadOnlyTable;
export { ReadOnlyDataTable };
