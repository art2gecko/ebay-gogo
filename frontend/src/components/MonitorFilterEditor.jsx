import React, { useState, useEffect } from 'react';

/**
 * Editor for advanced monitor filters.
 * Filters:
 *   - title_include: words that MUST appear in the listing title
 *   - title_exclude: words that must NOT appear in the listing title
 *   - min_seller_feedback: minimum seller feedback %
 *   - exclude_sellers: blocked seller usernames
 *   - max_total_cost: max price + shipping
 *   - (inherited) price_min, price_max, condition, buying_options, free_shipping
 */
export default function MonitorFilterEditor({ filters, keywords, onChange, onClose }) {
  const [monitorName, setMonitorName] = useState(keywords || '');
  const [pollInterval, setPollInterval] = useState('30');
  const [local, setLocal] = useState({
    price_min: '',
    price_max: '',
    condition: '',
    buying_options: 'FIXED_PRICE',
    free_shipping: false,
    title_include: '',
    title_exclude: '',
    min_seller_feedback: '',
    exclude_sellers: '',
    max_total_cost: '',
  });

  useEffect(() => {
    if (filters) {
      setLocal({
        price_min: filters.price_min ?? '',
        price_max: filters.price_max ?? '',
        condition: filters.condition ?? '',
        buying_options: filters.buying_options ?? 'FIXED_PRICE',
        free_shipping: filters.free_shipping ?? false,
        title_include: (filters.title_include || []).join(', '),
        title_exclude: (filters.title_exclude || []).join(', '),
        min_seller_feedback: filters.min_seller_feedback ?? '',
        exclude_sellers: (filters.exclude_sellers || []).join(', '),
        max_total_cost: filters.max_total_cost ?? '',
      });
    }
  }, [filters]);

  const handleSave = () => {
    const parsed = {
      price_min: local.price_min || null,
      price_max: local.price_max || null,
      condition: local.condition || null,
      buying_options: local.buying_options || 'FIXED_PRICE',
      free_shipping: local.free_shipping,
      title_include: local.title_include
        ? local.title_include.split(',').map(s => s.trim()).filter(Boolean)
        : [],
      title_exclude: local.title_exclude
        ? local.title_exclude.split(',').map(s => s.trim()).filter(Boolean)
        : [],
      min_seller_feedback: local.min_seller_feedback
        ? parseFloat(local.min_seller_feedback)
        : null,
      exclude_sellers: local.exclude_sellers
        ? local.exclude_sellers.split(',').map(s => s.trim()).filter(Boolean)
        : [],
      max_total_cost: local.max_total_cost
        ? parseFloat(local.max_total_cost)
        : null,
    };
    // If this is a new monitor creation (has keywords prop), include meta
    if (keywords !== undefined) {
      parsed._keywords = monitorName || keywords;
      parsed._poll_interval = parseInt(pollInterval, 10) || 30;
    }
    onChange(parsed);
  };

  const update = (key, value) => setLocal(prev => ({ ...prev, [key]: value }));

  return (
    <div className="filter-editor-overlay" onClick={onClose}>
      <div className="filter-editor" onClick={(e) => e.stopPropagation()}>
        <div className="filter-editor-header">
          <h3>{keywords !== undefined ? 'Save as Monitor' : 'Monitor Filters'}</h3>
          <button className="dismiss" onClick={onClose}>&times;</button>
        </div>

        <div className="filter-editor-body">
          {/* ---- Monitor config ---- */}
          {keywords !== undefined && (
            <div className="filter-editor-section">
              <div className="filter-editor-section-title">Monitor Setup</div>
              <div className="filter-editor-row">
                <label>Keywords</label>
                <input
                  type="text"
                  placeholder="e.g. iPhone 15 Pro"
                  value={monitorName}
                  onChange={(e) => setMonitorName(e.target.value)}
                />
              </div>
              <div className="filter-editor-row">
                <label>Check Frequency</label>
                <select
                  value={pollInterval}
                  onChange={(e) => setPollInterval(e.target.value)}
                >
                  <option value="15">Every 15 seconds</option>
                  <option value="30">Every 30 seconds</option>
                  <option value="60">Every 1 minute</option>
                  <option value="120">Every 2 minutes</option>
                  <option value="300">Every 5 minutes</option>
                </select>
              </div>
            </div>
          )}

          {/* ---- eBay API filters ---- */}
          <div className="filter-editor-section">
            <div className="filter-editor-section-title">Search Filters</div>

            <div className="filter-editor-row">
              <label>Price Range</label>
              <div className="filter-row">
                <input
                  type="number"
                  placeholder="Min"
                  value={local.price_min}
                  onChange={(e) => update('price_min', e.target.value)}
                  min="0"
                  step="0.01"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={local.price_max}
                  onChange={(e) => update('price_max', e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="filter-editor-row">
              <label>Condition</label>
              <select
                value={local.condition}
                onChange={(e) => update('condition', e.target.value)}
              >
                <option value="">Any Condition</option>
                <option value="NEW">New</option>
                <option value="USED">Used</option>
                <option value="REFURBISHED">Refurbished</option>
                <option value="PARTS">For Parts</option>
              </select>
            </div>

            <div className="filter-editor-row">
              <label>Buying Format</label>
              <select
                value={local.buying_options}
                onChange={(e) => update('buying_options', e.target.value)}
              >
                <option value="FIXED_PRICE">Buy It Now</option>
                <option value="AUCTION">Auction</option>
                <option value="BEST_OFFER">Best Offer</option>
              </select>
            </div>

            <div className="filter-editor-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={local.free_shipping}
                  onChange={(e) => update('free_shipping', e.target.checked)}
                />
                Free Shipping Only
              </label>
            </div>
          </div>

          {/* ---- Advanced client-side filters ---- */}
          <div className="filter-editor-section">
            <div className="filter-editor-section-title">Advanced Filters</div>

            <div className="filter-editor-row">
              <label>Title Must Contain</label>
              <input
                type="text"
                placeholder="e.g. sealed, mint, 1st edition"
                value={local.title_include}
                onChange={(e) => update('title_include', e.target.value)}
              />
              <span className="filter-hint">Comma-separated. ALL words must appear in the title.</span>
            </div>

            <div className="filter-editor-row">
              <label>Title Must NOT Contain</label>
              <input
                type="text"
                placeholder="e.g. damaged, replica, fake"
                value={local.title_exclude}
                onChange={(e) => update('title_exclude', e.target.value)}
              />
              <span className="filter-hint">Comma-separated. Listings with ANY of these words are hidden.</span>
            </div>

            <div className="filter-editor-row">
              <label>Max Total Cost (incl. shipping)</label>
              <input
                type="number"
                placeholder="e.g. 50.00"
                value={local.max_total_cost}
                onChange={(e) => update('max_total_cost', e.target.value)}
                min="0"
                step="0.01"
              />
              <span className="filter-hint">Skip listings where price + shipping exceeds this.</span>
            </div>

            <div className="filter-editor-row">
              <label>Min Seller Feedback %</label>
              <input
                type="number"
                placeholder="e.g. 95"
                value={local.min_seller_feedback}
                onChange={(e) => update('min_seller_feedback', e.target.value)}
                min="0"
                max="100"
                step="0.1"
              />
              <span className="filter-hint">Only show sellers with at least this feedback rating.</span>
            </div>

            <div className="filter-editor-row">
              <label>Exclude Sellers</label>
              <input
                type="text"
                placeholder="e.g. badSeller123, spamAccount"
                value={local.exclude_sellers}
                onChange={(e) => update('exclude_sellers', e.target.value)}
              />
              <span className="filter-hint">Comma-separated seller usernames to block.</span>
            </div>
          </div>
        </div>

        <div className="filter-editor-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>
            {keywords !== undefined ? 'Create Monitor' : 'Save Filters'}
          </button>
        </div>
      </div>
    </div>
  );
}
