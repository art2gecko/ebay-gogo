import React, { useState, useEffect, useCallback } from 'react';
import { getMonitors, deleteMonitor, updateMonitor, getMonitorListings } from '../hooks/useApi';

export default function MonitorPanel() {
  const [monitors, setMonitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonitor, setSelectedMonitor] = useState(null);
  const [listings, setListings] = useState([]);

  const loadMonitors = useCallback(async () => {
    try {
      const data = await getMonitors(false);
      setMonitors(data.monitors);
    } catch (err) {
      console.error('Failed to load monitors:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMonitors();
    const interval = setInterval(loadMonitors, 10000);
    return () => clearInterval(interval);
  }, [loadMonitors]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this monitor?')) return;
    try {
      await deleteMonitor(id);
      loadMonitors();
      if (selectedMonitor === id) {
        setSelectedMonitor(null);
        setListings([]);
      }
    } catch (err) {
      console.error('Failed to delete monitor:', err);
    }
  };

  const handleToggle = async (id, currentActive) => {
    try {
      await updateMonitor(id, { active: currentActive ? 0 : 1 });
      loadMonitors();
    } catch (err) {
      console.error('Failed to toggle monitor:', err);
    }
  };

  const handleViewListings = async (id) => {
    setSelectedMonitor(id);
    try {
      const data = await getMonitorListings(id);
      setListings(data.listings);
    } catch (err) {
      console.error('Failed to load listings:', err);
    }
  };

  if (loading) return <div className="loading">Loading monitors...</div>;

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      <div style={{ width: '400px', borderRight: '1px solid var(--border)', overflow: 'auto' }}>
        <div className="monitor-panel">
          <div className="monitor-stats">
            <div className="monitor-stat">
              <div className="stat-value">{monitors.length}</div>
              <div className="stat-label">Monitors</div>
            </div>
            <div className="monitor-stat">
              <div className="stat-value">{monitors.filter(m => m.active).length}</div>
              <div className="stat-label">Active</div>
            </div>
          </div>
        </div>

        {monitors.length === 0 ? (
          <div className="empty-state">
            <h3>No Monitors</h3>
            <p>Search for items and click "+ Monitor" to start monitoring.</p>
          </div>
        ) : (
          <div className="monitor-list">
            {monitors.map((m) => (
              <div
                key={m.id}
                className="monitor-card"
                style={{
                  borderColor: selectedMonitor === m.id ? 'var(--accent)' : undefined,
                  cursor: 'pointer',
                }}
                onClick={() => handleViewListings(m.id)}
              >
                <div>
                  <div className="monitor-keywords">{m.keywords}</div>
                  <div className="monitor-meta">
                    Every {m.poll_interval_sec}s
                    {' | '}
                    {m.active ? (
                      <span style={{ color: 'var(--success)' }}>Active</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Paused</span>
                    )}
                  </div>
                </div>
                <div className="monitor-actions">
                  <button
                    className={`btn btn-sm ${m.active ? 'btn-outline' : 'btn-success'}`}
                    onClick={(e) => { e.stopPropagation(); handleToggle(m.id, m.active); }}
                  >
                    {m.active ? 'Pause' : 'Resume'}
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {selectedMonitor ? (
          listings.length > 0 ? (
            <table className="listing-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Price</th>
                  <th>Seller</th>
                  <th>Found At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((l) => (
                  <tr key={l.id}>
                    <td className="listing-title">
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (window.electronAPI?.openExternal) {
                            window.electronAPI.openExternal(l.item_url);
                          } else {
                            window.open(l.item_url, '_blank');
                          }
                        }}
                      >
                        {l.title}
                      </a>
                    </td>
                    <td className="price">${l.price?.toFixed(2)}</td>
                    <td className="seller-name">{l.seller_name}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {new Date(l.first_seen_at).toLocaleString()}
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-buy"
                        onClick={() => {
                          if (window.electronAPI?.openExternal) {
                            window.electronAPI.openExternal(l.item_url);
                          } else {
                            window.open(l.item_url, '_blank');
                          }
                        }}
                      >
                        BUY
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <h3>No Listings Found Yet</h3>
              <p>This monitor hasn't found any new listings yet. Keep it running!</p>
            </div>
          )
        ) : (
          <div className="empty-state">
            <h3>Select a Monitor</h3>
            <p>Click on a monitor to view its found listings.</p>
          </div>
        )}
      </div>
    </div>
  );
}
