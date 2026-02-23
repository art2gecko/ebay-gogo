import React, { useState } from 'react';
import ListingRow from './ListingRow';

export default function ListingTable({ listings, loading, total, newListingIds }) {
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

  if (listings.length === 0) {
    return (
      <div className="empty-state">
        <h3>No Listings Yet</h3>
        <p>Search for items or create a monitor to see listings here.</p>
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
