import React, { useState, useEffect } from 'react';
import { getSettings, updateSettings } from '../hooks/useApi';

export default function SettingsPage() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await getSettings();
      setSettings(data.settings);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setSettings({ ...settings, [key]: value });
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(settings);
      setSaved(true);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Loading settings...</div>;

  return (
    <div className="settings-page">
      <div className="settings-section">
        <h2>eBay API Credentials</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Get your API keys from{' '}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              const url = 'https://developer.ebay.com/my/keys';
              if (window.electronAPI?.openExternal) {
                window.electronAPI.openExternal(url);
              } else {
                window.open(url, '_blank');
              }
            }}
            style={{ color: 'var(--accent)' }}
          >
            developer.ebay.com
          </a>
        </p>

        <div className="settings-field">
          <label>Client ID (App ID)</label>
          <input
            type="text"
            value={settings.ebay_client_id || ''}
            onChange={(e) => handleChange('ebay_client_id', e.target.value)}
            placeholder="Enter your eBay Client ID"
          />
        </div>

        <div className="settings-field">
          <label>Client Secret (Cert ID)</label>
          <input
            type="password"
            value={settings.ebay_client_secret || ''}
            onChange={(e) => handleChange('ebay_client_secret', e.target.value)}
            placeholder="Enter your eBay Client Secret"
          />
        </div>

        <div className="settings-field">
          <label>Environment</label>
          <select
            value={settings.ebay_environment || 'SANDBOX'}
            onChange={(e) => handleChange('ebay_environment', e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              color: 'var(--text-primary)',
              fontSize: '14px',
            }}
          >
            <option value="SANDBOX">Sandbox (Testing)</option>
            <option value="PRODUCTION">Production (Live)</option>
          </select>
          <div className="hint">Use Sandbox for testing. Switch to Production when ready.</div>
        </div>
      </div>

      <div className="settings-section">
        <h2>Telegram Notifications</h2>

        <div className="settings-field">
          <label>Bot Token</label>
          <input
            type="password"
            value={settings.telegram_bot_token || ''}
            onChange={(e) => handleChange('telegram_bot_token', e.target.value)}
            placeholder="Enter your Telegram Bot Token"
          />
          <div className="hint">Create a bot via @BotFather on Telegram</div>
        </div>

        <div className="settings-field">
          <label>Chat ID</label>
          <input
            type="text"
            value={settings.telegram_chat_id || ''}
            onChange={(e) => handleChange('telegram_chat_id', e.target.value)}
            placeholder="Enter your Telegram Chat ID"
          />
          <div className="hint">Get your chat ID from @userinfobot</div>
        </div>
      </div>

      <div className="settings-section">
        <h2>Monitoring</h2>

        <div className="settings-field">
          <label>Default Poll Interval (seconds)</label>
          <input
            type="number"
            value={settings.default_poll_interval || '30'}
            onChange={(e) => handleChange('default_poll_interval', e.target.value)}
            min="15"
            max="300"
          />
          <div className="hint">How often to check for new listings (min: 15s). Lower = faster but uses more API calls.</div>
        </div>
      </div>

      <button
        className="btn btn-primary"
        onClick={handleSave}
        disabled={saving}
        style={{ marginTop: '8px' }}
      >
        {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
      </button>
    </div>
  );
}
