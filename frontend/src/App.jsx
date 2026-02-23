import React, { useState, useCallback, useRef } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import SearchBar from './components/SearchBar';
import FilterSidebar from './components/FilterSidebar';
import ListingTable from './components/ListingTable';
import MonitorPanel from './components/MonitorPanel';
import SettingsPage from './components/SettingsPage';
import AlertBanner from './components/AlertBanner';

const TABS = {
  SEARCH: 'search',
  MONITORS: 'monitors',
  HISTORY: 'history',
  SETTINGS: 'settings',
};

export default function App() {
  const [activeTab, setActiveTab] = useState(TABS.SEARCH);
  const [listings, setListings] = useState([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({});
  const [alert, setAlert] = useState(null);
  const [apiCalls, setApiCalls] = useState(0);
  const [newListingIds, setNewListingIds] = useState(new Set());
  const [hasSearched, setHasSearched] = useState(false);

  // Sound for new listings
  const audioRef = useRef(null);

  const playNotificationSound = useCallback(() => {
    try {
      // Use Web Audio API for a simple beep
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.value = 800;
      gain.gain.value = 0.3;
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.15);
    } catch (e) {
      // Ignore audio errors
    }
  }, []);

  const handleWsMessage = useCallback((message) => {
    if (message.type === 'new_listing') {
      const item = message.data;
      setListings((prev) => [item, ...prev]);
      setNewListingIds((prev) => new Set([...prev, item.itemId]));

      // Show alert
      setAlert(`New listing: ${item.title} - $${item.totalCost.toFixed(2)}`);

      // Play sound
      playNotificationSound();

      // Desktop notification
      if (window.electronAPI?.showNotification) {
        window.electronAPI.showNotification(
          'New eBay Listing!',
          `${item.title} - $${item.totalCost.toFixed(2)}`
        );
      }

      // Clear new highlight after 5 seconds
      setTimeout(() => {
        setNewListingIds((prev) => {
          const next = new Set(prev);
          next.delete(item.itemId);
          return next;
        });
      }, 5000);
    }

    if (message.type === 'monitor_status') {
      setApiCalls(message.data.apiCallsToday || 0);
    }

    if (message.type === 'rate_limit') {
      setAlert(message.message);
    }

    if (message.type === 'monitor_error') {
      setAlert(`Monitor error: ${message.data.error}`);
    }
  }, [playNotificationSound]);

  const { connected, reconnect, lastConnectedAt } = useWebSocket(handleWsMessage);

  const handleSearchResults = useCallback((results) => {
    setListings(results.items);
    setSearchTotal(results.total);
    setLoading(false);
    setHasSearched(true);
  }, []);

  // Refs for SearchBar actions triggered from empty state
  const searchBarRef = useRef(null);

  return (
    <div className="app">
      <div className="app-header">
        <h1>eBay-GoGo</h1>
        <div className="nav-tabs">
          {Object.entries(TABS).map(([key, value]) => (
            <button
              key={value}
              className={`nav-tab ${activeTab === value ? 'active' : ''}`}
              onClick={() => setActiveTab(value)}
            >
              {key.charAt(0) + key.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <div className={`connection-pill ${connected ? 'pill-connected' : 'pill-disconnected'}`}>
          <span className={`status-dot ${connected ? 'connected' : 'disconnected'}`} />
          {connected ? 'Connected' : 'Disconnected'}
          {connected && lastConnectedAt && (
            <span className="last-sync">Last sync: {new Date(lastConnectedAt).toLocaleTimeString()}</span>
          )}
        </div>
      </div>

      {!connected && (
        <div className="disconnected-banner">
          <span>Disconnected — monitoring paused</span>
          <div className="disconnected-actions">
            <button className="btn btn-sm btn-primary" onClick={reconnect}>Reconnect</button>
          </div>
        </div>
      )}

      {alert && (
        <AlertBanner message={alert} onDismiss={() => setAlert(null)} />
      )}

      <div className="app-body">
        {activeTab === TABS.SEARCH && (
          <>
            <FilterSidebar filters={filters} onChange={setFilters} />
            <div className="main-content">
              <SearchBar
                ref={searchBarRef}
                filters={filters}
                onResults={handleSearchResults}
                onLoading={setLoading}
                onFiltersChange={setFilters}
              />
              <ListingTable
                listings={listings}
                loading={loading}
                total={searchTotal}
                newListingIds={newListingIds}
                hasSearched={hasSearched}
                onCreateMonitor={() => searchBarRef.current?.openMonitorEditor()}
                onRunSearch={() => searchBarRef.current?.focusSearch()}
                onApplyPreset={(preset) => searchBarRef.current?.applyPreset(preset)}
              />
            </div>
          </>
        )}

        {activeTab === TABS.MONITORS && (
          <div className="main-content">
            <MonitorPanel />
          </div>
        )}

        {activeTab === TABS.HISTORY && (
          <div className="main-content">
            <PurchaseHistory />
          </div>
        )}

        {activeTab === TABS.SETTINGS && (
          <div className="main-content">
            <SettingsPage />
          </div>
        )}
      </div>

      <div className="status-bar">
        <span>
          <span className={`status-dot ${connected ? 'connected' : 'disconnected'}`} />
          {connected ? 'Connected' : 'Disconnected'}
        </span>
        <span>API calls today: {apiCalls} / 5,000</span>
      </div>
    </div>
  );
}

function PurchaseHistory() {
  const [history, setHistory] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    import('./hooks/useApi').then(({ getPurchaseHistory }) => {
      getPurchaseHistory()
        .then((data) => setHistory(data.history))
        .catch(() => {})
        .finally(() => setLoading(false));
    });
  }, []);

  if (loading) return <div className="loading">Loading purchase history...</div>;

  if (history.length === 0) {
    return (
      <div className="empty-state">
        <h3>No Purchase History</h3>
        <p>Items you click "Buy" on will appear here.</p>
      </div>
    );
  }

  return (
    <div className="listing-table-wrapper">
      <table className="listing-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Price</th>
            <th>Date</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {history.map((item) => (
            <tr key={item.id}>
              <td className="listing-title">{item.title}</td>
              <td className="price">${item.price?.toFixed(2)}</td>
              <td>{new Date(item.clicked_at).toLocaleString()}</td>
              <td>
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => {
                    if (window.electronAPI?.openExternal) {
                      window.electronAPI.openExternal(item.item_url);
                    } else {
                      window.open(item.item_url, '_blank');
                    }
                  }}
                >
                  View on eBay
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
