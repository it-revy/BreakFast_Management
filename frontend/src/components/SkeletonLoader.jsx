import React from 'react';

const SkeletonLoader = ({ rows = 5, cols = 4 }) => {
  return (
    <div style={{ width: '100%', padding: '1rem', background: '#ffffff', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        {Array.from({ length: cols }).map((_, idx) => (
          <div
            key={idx}
            style={{
              height: '24px',
              flex: 1,
              background: '#f1f5f9',
              borderRadius: '4px',
              animation: 'pulse 1.5s infinite ease-in-out'
            }}
          />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
          {Array.from({ length: cols }).map((_, cIdx) => (
            <div
              key={cIdx}
              style={{
                height: '18px',
                flex: 1,
                background: '#f8fafc',
                borderRadius: '4px'
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export default SkeletonLoader;
