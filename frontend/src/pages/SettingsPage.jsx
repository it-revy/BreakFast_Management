import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { Settings, Clock, Plus, Save, CheckCircle2 } from 'lucide-react';

const SettingsPage = () => {
  const [settings, setSettings] = useState({ cutoffTime: '12:00', timezone: 'Asia/Kolkata' });
  const [reasons, setReasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // New Reason modal state
  const [newReason, setNewReason] = useState({ code: '', label: '', isCustomAllowed: false, displayOrder: 10 });
  const [showReasonModal, setShowReasonModal] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await API.get('/settings');
      if (res.data.success) {
        setSettings(res.data.settings);
        setReasons(res.data.reasons);
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCutoff = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await API.put('/settings', settings);
      if (res.data.success) {
        setMessage({ type: 'success', text: 'Cutoff settings updated successfully.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddReason = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/settings/reasons', newReason);
      if (res.data.success) {
        setShowReasonModal(false);
        setNewReason({ code: '', label: '', isCustomAllowed: false, displayOrder: 10 });
        setMessage({ type: 'success', text: 'Opt-out reason added successfully.' });
        fetchSettings();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to add reason' });
    }
  };

  if (loading) {
    return <div className="page-body">Loading settings...</div>;
  }

  return (
    <div className="page-body">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Settings color="var(--accent-primary)" /> System Settings & Cutoff Configuration
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Configure daily cycle cutoff window and breakfast rejection reason types
        </p>
      </div>

      {message && (
        <div style={{
          background: message.type === 'error' ? 'var(--danger-bg)' : 'var(--success-bg)',
          border: `1px solid ${message.type === 'error' ? '#fca5a5' : 'var(--success)'}`,
          color: message.type === 'error' ? 'var(--danger-text)' : 'var(--success)',
          padding: '0.75rem 1.25rem',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <CheckCircle2 size={18} />
          {message.text || message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '1.5rem' }}>
        {/* Cutoff Time Configuration */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', fontSize: '1.2rem' }}>
            <Clock color="var(--warning)" /> Daily Cutoff Cycle Configuration
          </h2>

          <form onSubmit={handleSaveCutoff}>
            <div className="form-group">
              <label className="form-label">Daily Cutoff Time (24h Format HH:mm) *</label>
              <input
                type="text"
                className="form-input"
                value={settings.cutoffTime}
                onChange={(e) => setSettings({ ...settings, cutoffTime: e.target.value })}
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Default: 12:00 (Submissions and updates close at 12:00 PM IST)
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Timezone</label>
              <input
                type="text"
                className="form-input"
                value={settings.timezone}
                disabled
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: '1rem' }}>
              <Save size={16} /> {saving ? 'Saving...' : 'Save Cutoff Settings'}
            </button>
          </form>
        </div>

        {/* Reasons Management */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.2rem' }}>Configured Opt-Out Reasons</h2>
            <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setShowReasonModal(true)}>
              <Plus size={14} /> Add Reason
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {reasons.map(r => (
              <div key={r.code} className="glass-card" style={{ padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <strong style={{ color: 'var(--text-primary)', display: 'block' }}>{r.label}</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Code: {r.code}</span>
                </div>
                {r.isCustomAllowed && (
                  <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>Mandatory Text Required</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Reason Modal */}
      {showReasonModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2>Add Custom Rejection Reason</h2>
            <form onSubmit={handleAddReason} style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Reason Code (Uppercase) *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. WORK_TRIP"
                  value={newReason.code}
                  onChange={(e) => setNewReason({ ...newReason, code: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Reason Label *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Official Work Trip"
                  value={newReason.label}
                  onChange={(e) => setNewReason({ ...newReason, label: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="customTextCheck"
                  checked={newReason.isCustomAllowed}
                  onChange={(e) => setNewReason({ ...newReason, isCustomAllowed: e.target.checked })}
                />
                <label htmlFor="customTextCheck" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
                  Require mandatory text description field when selected
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowReasonModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Reason</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
