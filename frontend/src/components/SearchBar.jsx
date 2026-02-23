import React, { useState, useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { searchListings, createMonitor } from '../hooks/useApi';
import MonitorFilterEditor from './MonitorFilterEditor';

const RECENT_SEARCHES_KEY = 'ebay_gogo_recent_searches';
const MAX_RECENT = 10;

function loadRecentSearches() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
  } catch { return []; }
}

function saveRecentSearch(query) {
  const recent = loadRecentSearches().filter((q) => q !== query);
  recent.unshift(query);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

const SearchBar = forwardRef(function SearchBar({ filters, onResults, onLoading, onFiltersChange }, ref) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newlyListed');
  const [showFilterEditor, setShowFilterEditor] = useState(false);
  const [hasResults, setHasResults] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const [recentSearches, setRecentSearches] = useState(loadRecentSearches);
  const inputRef = useRef(null);

  // Close recent searches dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e) => {
      if (!e.target.closest('.search-input-wrapper')) {
        setShowRecent(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  useImperativeHandle(ref, () => ({
    openMonitorEditor: () => setShowFilterEditor(true),
    focusSearch: () => inputRef.current?.focus(),
    applyPreset: (preset) => {
      if (onFiltersChange) {
        onFiltersChange({
          priceMax: preset.priceMax || undefined,
          condition: preset.condition || undefined,
          buyingOptions: preset.buyingOptions || 'FIXED_PRICE',
          freeShipping: preset.freeShipping || false,
        });
      }
      setSort(preset.sort || 'newlyListed');
      inputRef.current?.focus();
    },
  }));

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    saveRecentSearch(query.trim());
    setRecentSearches(loadRecentSearches());
    setShowRecent(false);

    onLoading(true);
    try {
      const results = await searchListings({
        query: query.trim(),
        sort,
        priceMin: filters.priceMin,
        priceMax: filters.priceMax,
        condition: filters.condition,
        buyingOptions: filters.buyingOptions || 'FIXED_PRICE',
        freeShipping: filters.freeShipping,
      });
      onResults(results);
      setHasResults(true);
    } catch (err) {
      console.error('Search failed:', err);
      onLoading(false);
    }
  };

  const handleCreateMonitor = async (advancedFilters) => {
    const monitorKeywords = advancedFilters._keywords || query.trim();
    const pollInterval = advancedFilters._poll_interval || 30;
    // Remove internal meta keys before sending
    const { _keywords, _poll_interval, ...filterData } = advancedFilters;
    try {
      await createMonitor({
        keywords: monitorKeywords,
        filters: {
          price_min: filters.priceMin || filterData.price_min || null,
          price_max: filters.priceMax || filterData.price_max || null,
          condition: filters.condition || filterData.condition || null,
          buying_options: filters.buyingOptions || filterData.buying_options || 'FIXED_PRICE',
          free_shipping: filters.freeShipping || filterData.free_shipping || false,
          title_include: filterData.title_include || [],
          title_exclude: filterData.title_exclude || [],
          min_seller_feedback: filterData.min_seller_feedback || null,
          exclude_sellers: filterData.exclude_sellers || [],
          max_total_cost: filterData.max_total_cost || null,
        },
        poll_interval_sec: pollInterval,
      });
      setShowFilterEditor(false);
      alert('Monitor created! New listings will appear in real-time.');
    } catch (err) {
      console.error('Failed to create monitor:', err);
    }
  };

  const handleRecentClick = (q) => {
    setQuery(q);
    setShowRecent(false);
    // Trigger search after setting query
    setTimeout(() => {
      inputRef.current?.closest('form')?.requestSubmit();
    }, 0);
  };

  return (
    <>
      <form className="search-bar" onSubmit={handleSearch}>
        <div className="search-input-wrapper">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (!query && recentSearches.length > 0) setShowRecent(true);
            }}
            placeholder="Search eBay listings (e.g., iPhone 15, Pokemon cards, Nike Air Max)..."
          />
          {!query && <span className="search-hint">Press Enter to search</span>}
          {showRecent && recentSearches.length > 0 && (
            <div className="recent-dropdown">
              <div className="recent-dropdown-label">Recent searches</div>
              {recentSearches.map((q, i) => (
                <button
                  key={i}
                  type="button"
                  className="recent-item"
                  onClick={() => handleRecentClick(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          style={{
            padding: '10px 12px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            outline: 'none',
          }}
        >
          <option value="newlyListed">Newly Listed</option>
          <option value="price">Price: Low to High</option>
          <option value="-price">Price: High to Low</option>
          <option value="endingSoonest">Ending Soonest</option>
        </select>
        <button type="submit" className="btn btn-primary">
          {hasResults ? 'Search' : 'Search'}
        </button>
        <button
          type="button"
          className="btn btn-success"
          onClick={() => setShowFilterEditor(true)}
          title="Save current search as a monitor with filters"
        >
          Save as Monitor
        </button>
      </form>

      {showFilterEditor && (
        <MonitorFilterEditor
          filters={{
            price_min: filters.priceMin || '',
            price_max: filters.priceMax || '',
            condition: filters.condition || '',
            buying_options: filters.buyingOptions || 'FIXED_PRICE',
            free_shipping: filters.freeShipping || false,
          }}
          keywords={query}
          onChange={handleCreateMonitor}
          onClose={() => setShowFilterEditor(false)}
        />
      )}
    </>
  );
});

export default SearchBar;
