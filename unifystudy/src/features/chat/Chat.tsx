import React from 'react';
import { Construction } from 'lucide-react';

export default function Chat() {
  return (
    <div style={{
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-1)',
      color: 'var(--color-text)',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <div style={{
        background: 'var(--bg-2)',
        padding: '3rem',
        borderRadius: '24px',
        border: '1px solid var(--glass-border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.5rem',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
      }}>
        <div style={{
          background: 'rgba(99, 102, 241, 0.1)',
          padding: '1.5rem',
          borderRadius: '50%',
          color: 'var(--color-primary)',
          marginBottom: '0.5rem'
        }}>
          <Construction size={48} />
        </div>
        
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Chat is Evolving</h2>
          <p style={{ opacity: 0.7, lineHeight: 1.6 }}>
            We're currently reworking the chat experience to be faster, cleaner, and more useful. 
            Check back soon for the upgrade!
          </p>
        </div>

        <button style={{
          marginTop: '1rem',
          padding: '0.8rem 2rem',
          background: 'var(--color-primary)',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          fontWeight: 600,
          cursor: 'not-allowed',
          opacity: 0.8
        }}>
          Under Construction
        </button>
      </div>
    </div>
  );
}
