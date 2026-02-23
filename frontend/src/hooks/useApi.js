const API_BASE = 'http://127.0.0.1:8888/api';

export async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error ${response.status}: ${error}`);
  }

  return response.json();
}

export async function searchListings(params) {
  const query = new URLSearchParams();
  query.set('q', params.query);
  if (params.limit) query.set('limit', params.limit);
  if (params.offset) query.set('offset', params.offset);
  if (params.sort) query.set('sort', params.sort);
  if (params.priceMin) query.set('price_min', params.priceMin);
  if (params.priceMax) query.set('price_max', params.priceMax);
  if (params.condition) query.set('condition', params.condition);
  if (params.buyingOptions) query.set('buying_options', params.buyingOptions);
  if (params.freeShipping) query.set('free_shipping', 'true');

  return apiFetch(`/search?${query.toString()}`);
}

export async function createMonitor(data) {
  return apiFetch('/monitors', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getMonitors(activeOnly = true) {
  return apiFetch(`/monitors?active_only=${activeOnly}`);
}

export async function deleteMonitor(id) {
  return apiFetch(`/monitors/${id}`, { method: 'DELETE' });
}

export async function updateMonitor(id, data) {
  return apiFetch(`/monitors/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function getMonitorListings(id, limit = 100) {
  return apiFetch(`/monitors/${id}/listings?limit=${limit}`);
}

export async function getSettings() {
  return apiFetch('/settings');
}

export async function updateSettings(settings) {
  return apiFetch('/settings', {
    method: 'PUT',
    body: JSON.stringify({ settings }),
  });
}

export async function preparePurchase(itemId, itemUrl) {
  const query = new URLSearchParams({ ebay_item_id: itemId, item_url: itemUrl });
  return apiFetch(`/purchase/prepare?${query.toString()}`, { method: 'POST' });
}

export async function logPurchase(data) {
  return apiFetch('/purchase/log', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getPurchaseHistory(limit = 50) {
  return apiFetch(`/purchase/history?limit=${limit}`);
}
