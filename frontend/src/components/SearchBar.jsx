import React, { useState } from 'react';
import { searchListings, createMonitor } from '../hooks/useApi';

export default function SearchBar({ filters, onResults, onLoading }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newlyListed');

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

  const handleMonitor = async () => {
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
      alert('Monitor created! New listings will appear in real-time.');
    } catch (err) {
      console.error('Failed to create monitor:', err);
    }
  };

  return (
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
      <button type="button" className="btn btn-success" onClick={handleMonitor}>
        + Monitor
      </button>
    </form>
  );
}
