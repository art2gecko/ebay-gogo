import React from 'react';

export default function FilterSidebar({ filters, onChange }) {
  const update = (key, value) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="filter-sidebar">
      <h3 style={{ fontSize: '14px', marginBottom: '16px', color: 'var(--text-primary)' }}>
        Filters
      </h3>

      <div className="filter-group">
        <label>Price Range</label>
        <div className="filter-row">
          <input
            type="number"
            placeholder="Min"
            value={filters.priceMin || ''}
            onChange={(e) => update('priceMin', e.target.value || undefined)}
            min="0"
            step="0.01"
          />
          <input
            type="number"
            placeholder="Max"
            value={filters.priceMax || ''}
            onChange={(e) => update('priceMax', e.target.value || undefined)}
            min="0"
            step="0.01"
          />
        </div>
      </div>

      <div className="filter-group">
        <label>Condition</label>
        <select
          value={filters.condition || ''}
          onChange={(e) => update('condition', e.target.value || undefined)}
        >
          <option value="">Any Condition</option>
          <option value="NEW">New</option>
          <option value="USED">Used</option>
          <option value="REFURBISHED">Refurbished</option>
          <option value="PARTS">For Parts</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Buying Format</label>
        <select
          value={filters.buyingOptions || 'FIXED_PRICE'}
          onChange={(e) => update('buyingOptions', e.target.value)}
        >
          <option value="FIXED_PRICE">Buy It Now</option>
          <option value="AUCTION">Auction</option>
          <option value="BEST_OFFER">Best Offer</option>
        </select>
      </div>

      <div className="filter-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={filters.freeShipping || false}
            onChange={(e) => update('freeShipping', e.target.checked)}
          />
          Free Shipping Only
        </label>
      </div>
    </div>
  );
}
