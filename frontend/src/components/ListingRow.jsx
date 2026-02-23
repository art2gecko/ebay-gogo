import React from 'react';
import BuyButton from './BuyButton';

export default function ListingRow({ item, isNew }) {
  return (
    <tr className={isNew ? 'new-listing' : ''}>
      <td>
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt=""
            className="listing-image"
            loading="lazy"
          />
        ) : (
          <div className="listing-image" style={{ background: 'var(--bg-card)' }} />
        )}
      </td>
      <td className="listing-title">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            if (window.electronAPI?.openExternal) {
              window.electronAPI.openExternal(item.itemUrl);
            } else {
              window.open(item.itemUrl, '_blank');
            }
          }}
          title={item.title}
        >
          {item.title}
        </a>
      </td>
      <td className="price">${item.price?.toFixed(2)}</td>
      <td className="price-shipping">
        {item.shippingCost > 0 ? `+$${item.shippingCost.toFixed(2)}` : 'Free'}
      </td>
      <td className="price" style={{ fontWeight: 800 }}>
        ${item.totalCost?.toFixed(2)}
      </td>
      <td style={{ fontSize: '12px' }}>{item.condition || '—'}</td>
      <td>
        <div className="seller-info">
          <div className="seller-name">{item.sellerName || '—'}</div>
          <div className="seller-feedback">{item.sellerFeedback || ''}</div>
        </div>
      </td>
      <td>
        <BuyButton item={item} />
      </td>
    </tr>
  );
}
