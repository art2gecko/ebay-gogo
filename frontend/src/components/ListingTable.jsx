import React, { useState } from 'react';
import ListingRow from './ListingRow';

const SEARCH_PRESETS = [
  { label: 'Buy It Now \u2022 Newly Listed \u2022 Under $50', query: '', buyingOptions: 'FIXED_PRICE', sort: 'newlyListed', priceMax: '50', condition: '', freeShipping: false },
  { label: 'Auction \u2022 Ending Soon \u2022 Under $25', query: '', buyingOptions: 'AUCTION', sort: 'endingSoonest', priceMax: '25', condition: '', freeShipping: false },
  { label: 'Free Shipping \u2022 New \u2022 Under $100', query: '', buyingOptions: 'FIXED_PRICE', sort: 'newlyListed', priceMax: '100', condition: 'NEW', freeShipping: true },
];

const GHOST_HEADERS = ['Image', 'Title', 'Price', 'Shipping', 'Total', 'Condition', 'Seller', 'Action'];

export default function ListingTable({ listings, loading, total, newListingIds, onCreateMonitor, onRunSearch, onApplyPreset, hasSearched }) {
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedListings = React.useMemo(() => {
    if (!sortField) return listings;

    return [...listings].sort((a, b) => {
      let va = a[sortField];
      let vb = b[sortField];

      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();

      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [listings, sortField, sortDir]);

  const sortIndicator = (field) => {
    if (sortField !== field) return '';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  if (loading) {
    return <div className="loading">Searching eBay...</div>;
  }

  if (listings.length === 0 && !hasSearched) {
    return (
      <div className="empty-state-actionable">
        <div className="empty-state-hero">
          <div className="empty-state-icon">&#x1F50D;</div>
          <h2>Find eBay Deals in Real-Time</h2>
          <p className="empty-state-subtitle">Search for items, set up monitors, and get alerted the instant new listings appear.</p>
          <div className="empty-state-ctas">
            <button className="btn btn-primary btn-lg" onClick={onCreateMonitor}>
              Create a Monitor
            </button>
            <button className="btn btn-outline btn-lg" onClick={onRunSearch}>
              Run a Search
            </button>
          </div>
        </div>

        <div className="empty-state-presets">
          <div className="presets-label">Quick start with a preset:</div>
          <div className="presets-grid">
            {SEARCH_PRESETS.map((preset, i) => (
              <button
                key={i}
                className="preset-card"
                onClick={() => onApplyPreset && onApplyPreset(preset)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="onboarding-steps">
          <div className="onboarding-step">
            <div className="step-number">1</div>
            <div className="step-text">
              <strong>Search an item</strong>
              <span>Enter keywords above to find eBay listings</span>
            </div>
          </div>
          <div className="onboarding-step">
            <div className="step-number">2</div>
            <div className="step-text">
              <strong>Adjust filters</strong>
              <span>Set price, condition, and other criteria</span>
            </div>
          </div>
          <div className="onboarding-step">
            <div className="step-number">3</div>
            <div className="step-text">
              <strong>Save as Monitor</strong>
              <span>Get real-time alerts when new listings match</span>
            </div>
          </div>
        </div>

        <div className="ghost-table-preview">
          <table className="listing-table ghost-table">
            <thead>
              <tr>
                {GHOST_HEADERS.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3].map((row) => (
                <tr key={row} className="ghost-row">
                  {GHOST_HEADERS.map((_, ci) => (
                    <td key={ci}><div className="ghost-cell" /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="ghost-overlay">Results will appear here</div>
        </div>
      </div>
    );
  }

  if (listings.length === 0 && hasSearched) {
    return (
      <div className="empty-state">
        <h3>No Results Found</h3>
        <p>Try different keywords or adjust your filters.</p>
      </div>
    );
  }

  return (
    <div className="listing-table-wrapper">
      <div style={{ padding: '8px 20px', fontSize: '12px', color: 'var(--text-muted)' }}>
        Showing {listings.length} of {total.toLocaleString()} results
      </div>
      <table className="listing-table">
        <thead>
          <tr>
            <th style={{ width: '60px' }}>Image</th>
            <th onClick={() => handleSort('title')}>Title{sortIndicator('title')}</th>
            <th onClick={() => handleSort('price')} style={{ width: '90px' }}>Price{sortIndicator('price')}</th>
            <th onClick={() => handleSort('shippingCost')} style={{ width: '80px' }}>Shipping{sortIndicator('shippingCost')}</th>
            <th onClick={() => handleSort('totalCost')} style={{ width: '90px' }}>Total{sortIndicator('totalCost')}</th>
            <th style={{ width: '100px' }}>Condition</th>
            <th onClick={() => handleSort('sellerFeedbackScore')} style={{ width: '120px' }}>Seller{sortIndicator('sellerFeedbackScore')}</th>
            <th style={{ width: '80px' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {sortedListings.map((item) => (
            <ListingRow
              key={item.itemId}
              item={item}
              isNew={newListingIds?.has(item.itemId)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
