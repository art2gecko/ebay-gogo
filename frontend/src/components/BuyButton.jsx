import React, { useState } from 'react';
import { preparePurchase, logPurchase } from '../hooks/useApi';

export default function BuyButton({ item }) {
  const [buying, setBuying] = useState(false);

  const handleBuy = async () => {
    setBuying(true);
    try {
      // Get the Buy-It-Now URL from backend
      const result = await preparePurchase(item.itemId, item.itemUrl);

      // Log the purchase click
      await logPurchase({
        ebay_item_id: item.itemId,
        title: item.title,
        price: item.totalCost,
        currency: item.currency || 'USD',
        item_url: item.itemUrl,
      });

      // Open the eBay checkout page
      if (window.electronAPI?.openExternal) {
        window.electronAPI.openExternal(result.buyUrl);
      } else {
        window.open(result.buyUrl, '_blank');
      }
    } catch (err) {
      console.error('Buy failed:', err);
    } finally {
      setBuying(false);
    }
  };

  const isBuyItNow = item.buyingOptions?.includes('FIXED_PRICE');

  return (
    <button
      className={`btn btn-sm ${isBuyItNow ? 'btn-buy' : 'btn-outline'}`}
      onClick={handleBuy}
      disabled={buying}
    >
      {buying ? '...' : isBuyItNow ? 'BUY' : 'View'}
    </button>
  );
}
