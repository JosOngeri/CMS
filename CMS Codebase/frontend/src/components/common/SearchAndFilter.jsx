import { useState, useEffect } from 'react';
import { Search, Filter, X, ChevronDown, SlidersHorizontal } from 'lucide-react';

const SearchAndFilter = ({
  onSearch,
  onFilter,
  onSort,
  searchPlaceholder = 'Search...',
  filters = [],
  sortOptions = [],
  defaultFilters = {},
  defaultSort = null,
  className = '',
  showAdvanced = true
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState(defaultFilters);
  const [currentSort, setCurrentSort] = useState(defaultSort);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      onSearch(searchTerm);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, onSearch]);

  useEffect(() => {
    onFilter(activeFilters);
  }, [activeFilters, onFilter]);

  useEffect(() => {
    if (currentSort) {
      onSort(currentSort);
    }
  }, [currentSort, onSort]);

  const handleFilterChange = (filterKey, value) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterKey]: value
    }));
  };

  const clearFilter = (filterKey) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[filterKey];
      return newFilters;
    });
  };

  const clearAllFilters = () => {
    setActiveFilters({});
    setSearchTerm('');
    setCurrentSort(null);
  };

  const hasActiveFilters = Object.keys(activeFilters).length > 0 || searchTerm || currentSort;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[var(--color-textSecondary)]" aria-hidden="true" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]-500"
            aria-label="Search"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--color-textSecondary)] hover:text-[var(--color-textSecondary)]"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Filter Button */}
        {showAdvanced && filters.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className={`px-4 py-2 border rounded-lg flex items-center gap-2 transition-colors ${
                Object.keys(activeFilters).length > 0
                  ? 'border-[var(--color-primary)]-500 bg-[var(--color-primary)]-50 text-[var(--color-primary)]-700'
                  : 'border-[var(--color-border)] hover:border-[var(--color-border)]'
              }`}
              aria-label="Open filters"
              aria-expanded={showFilterDropdown}
            >
              <Filter className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Filters</span>
              {Object.keys(activeFilters).length > 0 && (
                <span className="bg-[var(--color-primary)]-600 text-white text-xs px-2 py-0.5 rounded-full">
                  {Object.keys(activeFilters).length}
                </span>
              )}
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </button>

            {/* Filter Dropdown */}
            {showFilterDropdown && (
              <div className="absolute right-0 z-50 w-80 mt-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Filters</h3>
                  <button
                    onClick={() => setShowFilterDropdown(false)}
                    className="text-[var(--color-textSecondary)] hover:text-[var(--color-text)]"
                    aria-label="Close filters"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                {filters.map(filter => (
                  <div key={filter.key} className="mb-4">
                    <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                      {filter.label}
                    </label>
                    {filter.type === 'select' ? (
                      <select
                        value={activeFilters[filter.key] || ''}
                        onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]-500"
                        aria-label={filter.label}
                      >
                        <option value="">All</option>
                        {filter.options.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : filter.type === 'date' ? (
                      <input
                        type="date"
                        value={activeFilters[filter.key] || ''}
                        onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]-500"
                        aria-label={filter.label}
                      />
                    ) : filter.type === 'multiselect' ? (
                      <div className="space-y-1">
                        {filter.options.map(option => (
                          <label key={option.value} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={activeFilters[filter.key]?.includes(option.value) || false}
                              onChange={(e) => {
                                const currentValues = activeFilters[filter.key] || [];
                                if (e.target.checked) {
                                  handleFilterChange(filter.key, [...currentValues, option.value]);
                                } else {
                                  handleFilterChange(filter.key, currentValues.filter(v => v !== option.value));
                                }
                              }}
                              className="rounded border-[var(--color-border)]"
                              aria-label={option.label}
                            />
                            <span className="text-sm">{option.label}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={activeFilters[filter.key] || ''}
                        onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]-500"
                        aria-label={filter.label}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sort Button */}
        {showAdvanced && sortOptions.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className={`px-4 py-2 border rounded-lg flex items-center gap-2 transition-colors ${
                currentSort
                  ? 'border-[var(--color-primary)]-500 bg-[var(--color-primary)]-50 text-[var(--color-primary)]-700'
                  : 'border-[var(--color-border)] hover:border-[var(--color-border)]'
              }`}
              aria-label="Open sort options"
              aria-expanded={showSortDropdown}
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Sort</span>
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </button>

            {/* Sort Dropdown */}
            {showSortDropdown && (
              <div className="absolute right-0 z-50 w-64 mt-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Sort By</h3>
                  <button
                    onClick={() => setShowSortDropdown(false)}
                    className="text-[var(--color-textSecondary)] hover:text-[var(--color-text)]"
                    aria-label="Close sort options"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                {sortOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setCurrentSort(option.value);
                      setShowSortDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      currentSort === option.value
                        ? 'bg-[var(--color-primary)]-100 text-[var(--color-primary)]-700'
                        : 'hover:bg-[var(--color-surface)]'
                    }`}
                    aria-label={`Sort by ${option.label}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-[var(--color-textSecondary)]">Active filters:</span>
          {searchTerm && (
            <div className="flex items-center gap-1 px-3 py-1 bg-[var(--color-surface)] rounded-full">
              <span className="text-sm">Search: "{searchTerm}"</span>
              <button
                onClick={() => setSearchTerm('')}
                className="text-[var(--color-textSecondary)] hover:text-[var(--color-text)]"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </div>
          )}
          {Object.entries(activeFilters).map(([key, value]) => {
            const filter = filters.find(f => f.key === key);
            const displayValue = Array.isArray(value) ? value.join(', ') : value;
            return (
              <div key={key} className="flex items-center gap-1 px-3 py-1 bg-[var(--color-surface)] rounded-full">
                <span className="text-sm">{filter?.label}: {displayValue}</span>
                <button
                  onClick={() => clearFilter(key)}
                  className="text-[var(--color-textSecondary)] hover:text-[var(--color-text)]"
                  aria-label={`Clear ${filter?.label} filter`}
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </div>
            );
          })}
          {currentSort && (
            <div className="flex items-center gap-1 px-3 py-1 bg-[var(--color-surface)] rounded-full">
              <span className="text-sm">Sort: {sortOptions.find(s => s.value === currentSort)?.label}</span>
              <button
                onClick={() => setCurrentSort(null)}
                className="text-[var(--color-textSecondary)] hover:text-[var(--color-text)]"
                aria-label="Clear sort"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </div>
          )}
          <button
            onClick={clearAllFilters}
            className="text-sm text-red-600 hover:text-red-800"
            aria-label="Clear all filters"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchAndFilter;
