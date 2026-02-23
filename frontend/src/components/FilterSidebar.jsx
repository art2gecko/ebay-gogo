import React from 'react';

export default function FilterSidebar({ filters, onChange }) {
  const update = (key, value) => {
    onChange({ ...filters, [key]: value });
  };

  const isBuyItNow = (filters.buyingOptions || 'FIXED_PRICE') === 'FIXED_PRICE';

  return (
    <div className="filter-sidebar">
      <h3 style={{ fontSize: '14px', marginBottom: '16px', color: 'var(--text-primary)' }}>
        Filters
      </h3>

      <div className="filter-group">
        <label>Buying Format</label>
        <div className="buying-format-toggle">
          <button
            type="button"
            className={`toggle-btn ${isBuyItNow ? 'active' : ''}`}
            onClick={() => update('buyingOptions', 'FIXED_PRICE')}
          >
            Buy It Now
          </button>
          <button
            type="button"
            className={`toggle-btn ${!isBuyItNow && filters.buyingOptions === 'AUCTION' ? 'active' : ''}`}
            onClick={() => update('buyingOptions', 'AUCTION')}
          >
            Auction
          </button>
          <button
            type="button"
            className={`toggle-btn ${filters.buyingOptions === 'BEST_OFFER' ? 'active' : ''}`}
            onClick={() => update('buyingOptions', 'BEST_OFFER')}
          >
            Best Offer
          </button>
        </div>
      </div>

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
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={filters.freeShipping || false}
            onChange={(e) => update('freeShipping', e.target.checked)}
          />
          Free Shipping Only
        </label>
      </div>

      <div className="filter-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={filters.showTotalPrice || false}
            onChange={(e) => update('showTotalPrice', e.target.checked)}
          />
          Sort by Total (Price + Ship)
        </label>
      </div>

      <div className="filter-divider" />

      <div className="filter-group">
        <label>Exclude Keywords</label>
        <input
          type="text"
          placeholder="e.g. broken, for parts"
          value={filters.excludeKeywords || ''}
          onChange={(e) => update('excludeKeywords', e.target.value)}
          style={{ fontSize: '12px' }}
        />
        <span className="filter-hint-sidebar">Comma-separated words to hide</span>
      </div>

      <div className="filter-group">
        <label>Min Seller Feedback</label>
        <select
          value={filters.minSellerFeedback || ''}
          onChange={(e) => update('minSellerFeedback', e.target.value || undefined)}
        >
          <option value="">Any Seller</option>
          <option value="90">90%+</option>
          <option value="95">95%+</option>
          <option value="98">98%+</option>
          <option value="99">99%+</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Location</label>
        <select
          value={filters.location || ''}
          onChange={(e) => update('location', e.target.value || undefined)}
        >
          <option value="">Worldwide</option>
          <option value="US">US Only</option>
        </select>
      </div>
    </div>
  );
}
