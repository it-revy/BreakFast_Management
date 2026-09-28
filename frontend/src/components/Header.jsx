import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Breadcrumb from './Breadcrumb';
import { LogOut, Bell, ChevronDown, Shield, Menu } from 'lucide-react';

const Header = ({ onToggleMobile }) => {
  const { user, activeRole, switchRole, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          className="hamburger-btn"
          onClick={onToggleMobile}
          aria-label="Toggle navigation menu"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            padding: '0.4rem',
            borderRadius: 'var(--radius-sm)',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Menu size={22} />
        </button>

        <Breadcrumb />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Notifications Icon */}
        <button className="btn btn-secondary" style={{ padding: '0.4rem 0.6rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Notifications">
          <Bell size={16} color="var(--text-secondary)" />
        </button>

        {/* Role Selector / Role Badge */}
        {user.roles && user.roles.length > 1 ? (
          <div className="role-switcher-container" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#f1f5f9', padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Role:</span>
            <select
              value={activeRole || ''}
              onChange={(e) => switchRole(e.target.value)}
              className="form-select"
              style={{
                padding: '0.15rem 0.4rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderColor: 'transparent',
                background: 'transparent',
                color: 'var(--accent-primary)',
                width: 'auto',
                cursor: 'pointer'
              }}
            >
              {user.roles.map(r => (
                <option key={r} value={r}>
                  {r.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', background: '#f1f5f9', padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            Role: <span style={{ color: 'var(--accent-primary)' }}>{(activeRole || (user.roles && user.roles[0]) || 'EMPLOYEE').replace(/_/g, ' ')}</span>
          </div>
        )}

        {/* User Profile Dropdown */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              padding: '0.2rem 0.4rem',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--accent-primary)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: '0.85rem'
            }}>
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="header-user-text" style={{ textAlign: 'left', lineHeight: 1.2 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{user.employeeId}</div>
            </div>
            <ChevronDown size={14} color="var(--text-muted)" />
          </button>

          {dropdownOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '0.5rem',
              width: '200px',
              background: '#ffffff',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--panel-shadow)',
              padding: '0.5rem 0',
              zIndex: 60
            }}>
              <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.25rem' }}>
                <strong style={{ fontSize: '0.85rem', display: 'block' }}>{user.name}</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</span>
              </div>

              <div style={{ padding: '0.25rem 0' }}>
                <div style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Shield size={14} /> Roles: {user.roles?.join(', ')}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.25rem', marginTop: '0.25rem' }}>
                <button
                  onClick={logout}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.5rem 1rem',
                    background: 'none',
                    border: 'none',
                    fontSize: '0.85rem',
                    color: 'var(--danger)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
