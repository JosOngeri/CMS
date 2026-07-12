import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  totalItems,
  showPageSizeSelector = true,
  showTotalItems = true,
  className = ''
}) => {
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };

  const pageSizes = [10, 25, 50, 100];

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
      {/* Page Size Selector */}
      {showPageSizeSelector && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--color-textSecondary)]">Show</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-3 py-1.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]-500"
            aria-label="Items per page"
          >
            {pageSizes.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
          <span className="text-sm text-[var(--color-textSecondary)]">per page</span>
        </div>
      )}

      {/* Total Items */}
      {showTotalItems && (
        <div className="text-sm text-[var(--color-textSecondary)]">
          Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems} items
        </div>
      )}

      {/* Pagination Controls */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        <button
          onClick={() => handlePageChange(1)}
          disabled={currentPage === 1}
          className="p-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[36px] min-w-[36px]"
          aria-label="Go to first page"
          aria-disabled={currentPage === 1}
        >
          <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* Previous Page */}
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[36px] min-w-[36px]"
          aria-label="Go to previous page"
          aria-disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, index) => (
            page === '...' ? (
              <span key={`ellipsis-${index}`} className="px-3 py-2 text-[var(--color-textSecondary)]">
                ...
              </span>
            ) : (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-3 py-2 border rounded-lg transition-colors min-h-[36px] min-w-[36px] ${
                  currentPage === page
                    ? 'bg-[var(--color-primary)]-600 text-white border-[var(--color-primary)]-600'
                    : 'border-[var(--color-border)] hover:bg-[var(--color-surface)]'
                }`}
                aria-label={`Go to page ${page}`}
                aria-current={currentPage === page ? 'page' : undefined}
              >
                {page}
              </button>
            )
          ))}
        </div>

        {/* Next Page */}
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[36px] min-w-[36px]"
          aria-label="Go to next page"
          aria-disabled={currentPage === totalPages}
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* Last Page */}
        <button
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[36px] min-w-[36px]"
          aria-label="Go to last page"
          aria-disabled={currentPage === totalPages}
        >
          <ChevronsRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
