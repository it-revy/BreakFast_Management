import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Utensils, CheckCircle2, XCircle, Clock, AlertTriangle, History, CalendarRange, Edit3 } from 'lucide-react';

const EmployeeDailyPage = () => {
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState('SINGLE_DAY');
  const [statusData, setStatusData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingMode, setEditingMode] = useState(false);

  // Single Day Form State
  const [response, setResponse] = useState('YES');
  const [reasonCode, setReasonCode] = useState('');
  const [reasonText, setReasonText] = useState('');

  // Multi-Day Absence Form State
  const [fromDate, setFromDate] = useState(new Date().toISOString().substring(0, 10));
  const [toDate, setToDate] = useState(new Date().toISOString().substring(0, 10));
  const [multiReasonCode, setMultiReasonCode] = useState('ON_LEAVE');
  const [multiReasonText, setMultiReasonText] = useState('');

  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchTodayStatus();
    fetchHistory();
  }, []);

  const fetchTodayStatus = async () => {
    try {
      const res = await API.get('/breakfast/today');
      if (res.data.success) {
        setStatusData(res.data);
        if (res.data.todayRecord) {
          setResponse(res.data.todayRecord.response === 'NO' ? 'NO' : 'YES');
          setReasonCode(res.data.todayRecord.reasonCode || '');
          setReasonText(res.data.todayRecord.reasonText || '');
        }
      }
    } catch (err) {
      console.error('Failed to fetch status:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await API.get('/breakfast/history');
      if (res.data.success) {
        setHistory(res.data.records);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  };

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (response === 'NO') {
      if (!reasonCode) {
        setMessage({ type: 'danger', text: 'Please select a reason for not taking breakfast.' });
        return;
      }
      if (reasonCode === 'OTHER' && !reasonText.trim()) {
        setMessage({ type: 'danger', text: 'Please specify the reason text when "Other" is selected.' });
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await API.post('/breakfast/submit', {
        response,
        reasonCode: response === 'NO' ? reasonCode : null,
        reasonText: response === 'NO' ? reasonText : null
      });

      if (res.data.success) {
        setMessage({ type: 'success', text: res.data.message });
        setEditingMode(false);
        fetchTodayStatus();
        fetchHistory();
      }
    } catch (err) {
      setMessage({
        type: 'danger',
        text: err.response?.data?.message || 'Failed to submit status.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMultiSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (fromDate > toDate) {
      setMessage({ type: 'danger', text: 'From Date must be before or equal to To Date.' });
      return;
    }

    if (multiReasonCode === 'OTHER' && !multiReasonText.trim()) {
      setMessage({ type: 'danger', text: 'Please specify reason text when "Other" is selected.' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await API.post('/breakfast/multi-day-absence', {
        fromDate,
        toDate,
        reasonCode: multiReasonCode,
        reasonText: multiReasonText
      });

      if (res.data.success) {
        setMessage({ type: 'success', text: res.data.message });
        fetchTodayStatus();
        fetchHistory();
      }
    } catch (err) {
      setMessage({
        type: 'danger',
        text: err.response?.data?.message || 'Failed to submit multi-day absence.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="page-body">Loading today's status...</div>;
  }

  const isPerm = statusData?.participationType === 'PERMANENT_NOT_TAKING';
  const hasExistingResponse = !!statusData?.todayRecord;

  return (
    <div className="page-body">
      {/* Header Greeting */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem' }}>Good Morning, {user?.name}</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.2rem', fontSize: '0.85rem' }}>
            Active Business Date: <strong style={{ color: 'var(--text-primary)' }}>{statusData?.activeFormattedDisplay || statusData?.businessDate}</strong> (Asia/Kolkata)
          </p>
          {statusData?.isCutoffPassed && (
            <span className="badge badge-warning" style={{ marginTop: '0.3rem', fontSize: '0.75rem' }}>
              ⏰ Past 12:00 PM Cutoff — Displaying Next Working Day Cycle ({statusData?.activeFormattedDisplay})
            </span>
          )}
        </div>

        <div className="panel-card" style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Clock size={18} color="var(--warning)" />
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 600 }}>CUTOFF WINDOW</span>
            <strong style={{ fontSize: '0.85rem', color: statusData?.isCutoffPassed ? 'var(--danger-text)' : 'var(--success-text)' }}>
              {statusData?.cutoffTime} IST {statusData?.isCutoffPassed ? '(CLOSED FOR TODAY)' : '(OPEN)'}
            </strong>
          </div>
        </div>
      </div>

      {statusData?.isPublicHoliday && (
        <div style={{
          background: 'var(--info-bg)',
          border: '1px solid #93c5fd',
          color: 'var(--info-text)',
          padding: '0.85rem 1.25rem',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem'
        }}>
          <CalendarRange size={20} color="var(--info)" />
          <div>
            <strong style={{ fontSize: '0.9rem', display: 'block' }}>Public Holiday ({statusData.holidayName})</strong>
            <span style={{ fontSize: '0.8rem' }}>Daily response is not required today.</span>
          </div>
        </div>
      )}

      {message && (
        <div style={{
          background: message.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
          border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fca5a5'}`,
          color: message.type === 'success' ? 'var(--success-text)' : 'var(--danger-text)',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.875rem'
        }}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {message.text}
        </div>
      )}

      {isPerm ? (
        <div className="panel-card" style={{ padding: '2rem', textAlign: 'center', marginBottom: '1.5rem' }}>
          <AlertTriangle size={40} color="var(--warning)" style={{ marginBottom: '0.75rem' }} />
          <h2>Permanent Non-Breakfast Participant</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0.5rem auto 1.25rem auto', fontSize: '0.875rem' }}>
            Your account is set to <strong>PERMANENT_NOT_TAKING</strong>. You are automatically preserved in monthly reports with 0 breakfasts taken.
          </p>
          <span className="badge badge-warning" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
            Report Status: Preserved (0 Breakfasts)
          </span>
        </div>
      ) : (
        <div className="panel-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          {/* Sub Tab Switcher */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem' }}>
            <button
              className={`btn ${activeSubTab === 'SINGLE_DAY' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveSubTab('SINGLE_DAY')}
              style={{ fontSize: '0.8rem' }}
            >
              <Utensils size={15} /> Today's Response
            </button>
            <button
              className={`btn ${activeSubTab === 'MULTI_DAY' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveSubTab('MULTI_DAY')}
              style={{ fontSize: '0.8rem' }}
            >
              <CalendarRange size={15} /> Planned Non-Breakfast Period
            </button>
          </div>

          {activeSubTab === 'SINGLE_DAY' ? (
            <div>
              {/* If response exists and not editing mode, show clean status display */}
              {hasExistingResponse && !editingMode ? (
                <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>TODAY'S SUBMITTED STATUS</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.35rem' }}>
                        <span className={`badge ${statusData.todayRecord.response === 'YES' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.9rem', padding: '0.35rem 0.75rem' }}>
                          {statusData.todayRecord.response === 'YES' ? '✓ TAKING BREAKFAST' : '✕ NOT TAKING'}
                        </span>
                        {statusData.todayRecord.response === 'NO' && (
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Reason: <strong>{statusData.todayRecord.reasonText || statusData.todayRecord.reasonCode}</strong>
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        Submitted at: {new Date(statusData.todayRecord.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    {!statusData.isCutoffPassed && (
                      <button className="btn btn-secondary" onClick={() => setEditingMode(true)} style={{ fontSize: '0.8rem' }}>
                        <Edit3 size={14} /> Change Response
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* YES / NO Submission Form */
                <div>
                  {statusData?.isCutoffPassed ? (
                    <div style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', padding: '1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem' }}>
                      Submissions for today closed at {statusData.cutoffTime} IST.
                    </div>
                  ) : (
                    <form onSubmit={handleSingleSubmit}>
                      <div style={{ marginBottom: '1.25rem' }}>
                        <label className="form-label" style={{ marginBottom: '0.6rem', display: 'block' }}>
                          Will you take breakfast today? ({statusData?.businessDate})
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                          <button
                            type="button"
                            className={`btn ${response === 'YES' ? 'btn-success' : 'btn-secondary'}`}
                            style={{ padding: '0.85rem', fontSize: '1rem', fontWeight: 600 }}
                            onClick={() => setResponse('YES')}
                          >
                            <CheckCircle2 size={20} />
                            YES — Taking
                          </button>
                          <button
                            type="button"
                            className={`btn ${response === 'NO' ? 'btn-danger' : 'btn-secondary'}`}
                            style={{ padding: '0.85rem', fontSize: '1rem', fontWeight: 600 }}
                            onClick={() => setResponse('NO')}
                          >
                            <XCircle size={20} />
                            NO — Not Taking
                          </button>
                        </div>
                      </div>

                      {/* Progressive Disclosure: Reason selector when NO is chosen */}
                      {response === 'NO' && (
                        <div className="glass-card" style={{ marginBottom: '1.25rem', background: '#f8fafc' }}>
                          <div className="form-group">
                            <label className="form-label">Why are you not taking breakfast? *</label>
                            <select
                              className="form-select"
                              value={reasonCode}
                              onChange={(e) => setReasonCode(e.target.value)}
                              required
                            >
                              <option value="">-- Choose Reason --</option>
                              {statusData?.reasons?.map(r => (
                                <option key={r.code} value={r.code}>{r.label}</option>
                              ))}
                            </select>
                          </div>

                          {reasonCode === 'OTHER' && (
                            <div className="form-group" style={{ marginTop: '0.75rem' }}>
                              <label className="form-label">Please specify the reason * (Mandatory Text)</label>
                              <input
                                type="text"
                                className="form-input"
                                placeholder="Enter specific reason..."
                                value={reasonText}
                                onChange={(e) => setReasonText(e.target.value)}
                                required
                              />
                            </div>
                          )}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={submitting}
                        >
                          {submitting ? 'Saving...' : hasExistingResponse ? 'Save Updated Answer' : 'Submit Response'}
                        </button>
                        {editingMode && (
                          <button type="button" className="btn btn-secondary" onClick={() => setEditingMode(false)}>
                            Cancel
                          </button>
                        )}
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Multi-Day Planned Absence */
            <div>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.35rem' }}>Planned Non-Breakfast Period</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1rem' }}>
                Specify planned non-participation dates (e.g. Leave, Business Travel, Personal Absence).
              </p>

              <form onSubmit={handleMultiSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">From Date *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">To Date *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Reason for Absence *</label>
                  <select
                    className="form-select"
                    value={multiReasonCode}
                    onChange={(e) => setMultiReasonCode(e.target.value)}
                    required
                  >
                    {statusData?.reasons?.map(r => (
                      <option key={r.code} value={r.code}>{r.label}</option>
                    ))}
                  </select>
                </div>

                {multiReasonCode === 'OTHER' && (
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label">Please specify the reason * (Mandatory)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Provide details..."
                      value={multiReasonText}
                      onChange={(e) => setMultiReasonText(e.target.value)}
                      required
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving Period...' : 'Save Planned Non-Breakfast Period'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* History Table */}
      <div className="panel-card" style={{ padding: '1.5rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem', fontSize: '1rem' }}>
          <History size={16} color="var(--accent-primary)" />
          Recent Breakfast Response History
        </h3>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Business Date</th>
                <th>Requested Response</th>
                <th>Actual Status</th>
                <th>Reason / Description</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    No submission history found.
                  </td>
                </tr>
              ) : (
                history.map(rec => (
                  <tr key={rec._id}>
                    <td><strong style={{ color: 'var(--text-primary)' }}>{rec.businessDate}</strong></td>
                    <td>
                      <span className={`badge ${rec.response === 'YES' ? 'badge-success' : 'badge-danger'}`}>
                        {rec.response === 'YES' ? '✓ TAKING' : '✕ NOT TAKING'}
                      </span>
                    </td>
                    <td>
                      {rec.actualStatus ? (
                        <span className={`badge ${rec.actualStatus === 'TAKEN' ? 'badge-success' : 'badge-warning'}`}>
                          {rec.actualStatus}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                      )}
                    </td>
                    <td>{rec.response === 'YES' ? '—' : rec.reasonText || rec.reasonCode}</td>
                    <td><span className="badge badge-secondary">{rec.source || 'EMPLOYEE'}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDailyPage;
