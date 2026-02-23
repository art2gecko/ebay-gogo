import React, { useState } from 'react';
import { searchListings, createMonitor } from '../hooks/useApi';
import MonitorFilterEditor from './MonitorFilterEditor';

export default function SearchBar({ filters, onResults, onLoading }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newlyListed');
  const [showFilterEditor, setShowFilterEditor] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

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
    } catch (err) {
      console.error('Search failed:', err);
      onLoading(false);
    }
  };

  const handleMonitorClick = () => {
    if (!query.trim()) return;
    // Open filter editor so user can configure before creating
    setShowFilterEditor(true);
  };

  const handleCreateMonitor = async (advancedFilters) => {
    try {
      await createMonitor({
        keywords: query.trim(),
        filters: {
          price_min: filters.priceMin || advancedFilters.price_min || null,
          price_max: filters.priceMax || advancedFilters.price_max || null,
          condition: filters.condition || advancedFilters.condition || null,
          buying_options: filters.buyingOptions || advancedFilters.buying_options || 'FIXED_PRICE',
          free_shipping: filters.freeShipping || advancedFilters.free_shipping || false,
          title_include: advancedFilters.title_include || [],
          title_exclude: advancedFilters.title_exclude || [],
          min_seller_feedback: advancedFilters.min_seller_feedback || null,
          exclude_sellers: advancedFilters.exclude_sellers || [],
          max_total_cost: advancedFilters.max_total_cost || null,
        },
        poll_interval_sec: 30,
      });
      setShowFilterEditor(false);
      alert('Monitor created! New listings will appear in real-time.');
    } catch (err) {
      console.error('Failed to create monitor:', err);
    }
  };

  const handleQuickMonitor = async () => {
    if (!query.trim()) return;
    try {
      await createMonitor({
        keywords: query.trim(),
        filters: {
          price_min: filters.priceMin || null,
          price_max: filters.priceMax || null,
          condition: filters.condition || null,
          buying_options: filters.buyingOptions || 'FIXED_PRICE',
          free_shipping: filters.freeShipping || false,
        },
        poll_interval_sec: 30,
      });
      alert('Monitor created! Edit its filters in the Monitors tab.');
    } catch (err) {
      console.error('Failed to create monitor:', err);
    }
  };

  return (
    <>
      <form className="search-bar" onSubmit={handleSearch}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search eBay listings (e.g., iPhone 15, Pokemon cards, Nike Air Max)..."
        />
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
        </select>
        <button type="submit" className="btn btn-primary">
          Search
        </button>
        <button type="button" className="btn btn-success" onClick={handleQuickMonitor}>
          + Monitor
        </button>
        <button type="button" className="btn btn-outline" onClick={handleMonitorClick} title="Create monitor with advanced filters">
          + Filtered
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
          onChange={handleCreateMonitor}
          onClose={() => setShowFilterEditor(false)}
        />
      )}
    </>
  );
}

