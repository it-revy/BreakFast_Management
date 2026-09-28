import React from 'react';
import { PackageOpen } from 'lucide-react';

const EmptyState = ({ title = "No data available", message = "There are no records matching your current filter.", actionButton = null }) => {
  return (
    <div style={{
      textAlign: 'center',
      padding: '3rem 1.5rem',
      background: '#ffffff',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-md)'
    }}>
      <div style={{
        width: '54px',
        height: '54px',
        borderRadius: '50%',
        background: '#f1f5f9',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1rem'
      }}>
        <PackageOpen size={28} color="var(--text-muted)" />
      </div>
      <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>{title}</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '400px', margin: '0 auto 1.25rem auto' }}>
        {message}
      </p>
      {actionButton && <div>{actionButton}</div>}
    </div>
  );
};

export default EmptyState;
