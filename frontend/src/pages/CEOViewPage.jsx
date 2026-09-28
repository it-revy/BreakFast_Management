import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { PieChart, TrendingUp, Users, CheckCircle2, XCircle, Coffee } from 'lucide-react';

const CEOViewPage = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCeoData();
  }, []);

  const fetchCeoData = async () => {
    try {
      const res = await API.get('/reports/ceo');
      if (res.data.success) {
        setReport(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch CEO report:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="page-body">Loading CEO Executive Summary...</div>;
  }

  const summary = report?.executiveSummary || {};
  const dailyTrend = report?.dailyTrend || [];
  const reasons = report?.reasonDistribution || {};

  return (
    <div className="page-body">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <PieChart color="var(--accent-primary)" /> Executive Analytics Dashboard (CEO View)
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          High-level operational overview, trend metrics, and company participation distribution
        </p>
      </div>

      {/* Summary Metrics */}
      <div className="grid-metrics">
        <div className="glass-panel metric-card" style={{ padding: '1.5rem' }}>
          <div>
            <div className="metric-label">TOTAL COMPANY HEADCOUNT</div>
            <div className="metric-val">{summary.totalEmployees || 0}</div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Normal: {summary.normalCount || 0} | Permanent Non-Takers: {summary.permNotTakingCount || 0}
            </span>
          </div>
          <Users size={40} color="var(--accent-primary)" opacity={0.8} />
        </div>

        <div className="glass-panel metric-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--success)' }}>
          <div>
            <div className="metric-label">DAILY PARTICIPATION RATE</div>
            <div className="metric-val" style={{ color: 'var(--success)' }}>{summary.overallParticipationRate || 0}%</div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Normal employees taking breakfast today</span>
          </div>
          <TrendingUp size={40} color="var(--success)" opacity={0.8} />
        </div>

        <div className="glass-panel metric-card" style={{ padding: '1.5rem', borderLeft: '4px solid #818cf8' }}>
          <div>
            <div className="metric-label">TODAY'S CONFIRMED HEADCOUNT</div>
            <div className="metric-val" style={{ color: '#818cf8' }}>{summary.todayYes || 0}</div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Breakfast orders confirmed</span>
          </div>
          <Coffee size={40} color="#818cf8" opacity={0.8} />
        </div>

        <div className="glass-panel metric-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--danger)' }}>
          <div>
            <div className="metric-label">TODAY OPT-OUT / NOT TAKING</div>
            <div className="metric-val" style={{ color: 'var(--danger)' }}>{summary.todayNo || 0}</div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Opted out with reason</span>
          </div>
          <XCircle size={40} color="var(--danger)" opacity={0.8} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '1.5rem' }}>
        {/* Daily Trend Table */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={18} color="var(--accent-primary)" />
            Daily Participation Trend ({report?.currentMonth})
          </h3>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Confirmed Taking</th>
                  <th>Opted Out</th>
                  <th>Total Responses</th>
                </tr>
              </thead>
              <tbody>
                {dailyTrend.length === 0 ? (
                  <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No trends recorded yet.</td></tr>
                ) : (
                  dailyTrend.map(d => (
                    <tr key={d.date}>
                      <td><strong style={{ color: 'var(--text-primary)' }}>{d.date}</strong></td>
                      <td><span style={{ color: 'var(--success)', fontWeight: 700 }}>{d.yes}</span></td>
                      <td><span style={{ color: 'var(--danger)', fontWeight: 700 }}>{d.no}</span></td>
                      <td>{d.yes + d.no}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Reason Distribution Card */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.25rem' }}>Opt-Out Reason Distribution</h3>
          {Object.keys(reasons).length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No opt-out reasons logged this month.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {Object.entries(reasons).map(([reason, count]) => (
                <div key={reason} className="glass-card" style={{ padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{reason}</span>
                  <span className="badge badge-danger" style={{ fontSize: '0.85rem' }}>{count} times</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CEOViewPage;
