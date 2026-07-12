import { useState } from 'react';
import { Search, Filter, X, Save, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const AdvancedSearch = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({
    type: 'all',
    dateRange: 'all',
    category: 'all',
    tags: []
  });
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [savedSearches, setSavedSearches] = useState([]);

  const handleSearch = async () => {
    setSearching(true);
    try {
      const response = await api.post('/search', { query, filters });
      setResults(response.data.results || []);
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleSaveSearch = async () => {
    try {
      await api.post('/search/saved', { query, filters, name: query.substring(0, 30) });
      toast.success('Search saved');
    } catch (error) {
      toast.error('Failed to save search');
    }
  };

  const loadSavedSearch = async (savedSearch) => {
    setQuery(savedSearch.query);
    setFilters(savedSearch.filters);
    handleSearch();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Advanced Search</h2>
        <button
          onClick={handleSaveSearch}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-surface)] rounded-lg hover:bg-[var(--color-surface)]"
          aria-label="Save current search"
        >
          <Save size={16} aria-hidden="true" />
          Save Search
        </button>
      </div>

      {/* Search Input */}
      <div className="bg-[var(--color-surface)] border rounded-lg p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-textSecondary)]" size={20} aria-hidden="true" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search across all content..."
              className="w-full pl-10 pr-4 py-3 border rounded-lg"
              aria-label="Search query"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching}
            className="px-6 py-3 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 disabled:bg-[var(--color-surface)]"
            aria-label="Execute search"
            aria-busy={searching}
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[var(--color-surface)] border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={20} aria-hidden="true" />
          <h3 className="font-semibold">Filters</h3>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="search-type">Type</label>
            <select
              id="search-type"
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="w-full p-2 border rounded-lg"
              aria-label="Filter by content type"
            >
              <option value="all">All Types</option>
              <option value="members">Members</option>
              <option value="documents">Documents</option>
              <option value="events">Events</option>
              <option value="announcements">Announcements</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="search-date">Date Range</label>
            <select
              id="search-date"
              value={filters.dateRange}
              onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
              className="w-full p-2 border rounded-lg"
              aria-label="Filter by date range"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="search-category">Category</label>
            <select
              id="search-category"
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="w-full p-2 border rounded-lg"
              aria-label="Filter by category"
            >
              <option value="all">All Categories</option>
              <option value="policies">Policies</option>
              <option value="reports">Reports</option>
              <option value="forms">Forms</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="search-tags">Tags</label>
            <input
              id="search-tags"
              type="text"
              value={filters.tags.join(', ')}
              onChange={(e) => setFilters({ ...filters, tags: e.target.value.split(',').map(t => t.trim()) })}
              placeholder="Comma-separated tags"
              className="w-full p-2 border rounded-lg"
              aria-label="Filter by tags"
            />
          </div>
        </div>
      </div>

      {/* Saved Searches */}
      {savedSearches.length > 0 && (
        <div className="bg-[var(--color-surface)] border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={20} aria-hidden="true" />
            <h3 className="font-semibold">Saved Searches</h3>
          </div>
          <div className="space-y-2">
            {savedSearches.map((saved, index) => (
              <div
                key={index}
                onClick={() => loadSavedSearch(saved)}
                className="flex items-center justify-between p-3 bg-[var(--color-background)] rounded-lg cursor-pointer hover:bg-[var(--color-surface)]"
                role="button"
                tabIndex={0}
                aria-label={`Load saved search: ${saved.name}`}
                onKeyPress={(e) => e.key === 'Enter' && loadSavedSearch(saved)}
              >
                <div>
                  <div className="font-medium">{saved.name}</div>
                  <div className="text-sm text-[var(--color-textSecondary)]">{saved.query}</div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSavedSearches(savedSearches.filter((_, i) => i !== index));
                  }}
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                  aria-label={`Delete saved search: ${saved.name}`}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Results ({results.length})</h3>
          <select className="px-3 py-2 border rounded-lg text-sm" aria-label="Sort results by">
            <option>Relevance</option>
            <option>Date (Newest)</option>
            <option>Date (Oldest)</option>
          </select>
        </div>
        {results.map((result, index) => (
          <div key={index} className="bg-[var(--color-surface)] border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[var(--color-primary)]-100 text-[var(--color-primary)]-600 rounded">
                {result.type === 'document' && '📄'}
                {result.type === 'member' && '👤'}
                {result.type === 'event' && '📅'}
                {result.type === 'announcement' && '📢'}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold">{result.title}</h4>
                <p className="text-sm text-[var(--color-textSecondary)] mt-1">{result.description}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-[var(--color-textSecondary)]">
                  <span className="px-2 py-1 bg-[var(--color-surface)] rounded">{result.type}</span>
                  <span>{new Date(result.date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {results.length === 0 && !searching && (
        <div className="text-center py-12 text-[var(--color-textSecondary)]">
          <Search size={48} className="mx-auto mb-4 text-[var(--color-textSecondary)]" />
          <p>Enter a search query to find content</p>
        </div>
      )}
    </div>
  );
};

export default AdvancedSearch;
