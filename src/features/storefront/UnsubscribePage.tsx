import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export function UnsubscribePage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid unsubscribe link.');
      return;
    }

    (async () => {
      try {
        // Decode token (base64 of contact_id)
        const contactId = atob(token);

        // Update the contact
        const { error } = await supabase
          .from('contacts')
          .update({ unsubscribed: true })
          .eq('id', contactId);

        if (error) throw error;

        setStatus('success');
        setMessage('You have been successfully unsubscribed. You will no longer receive marketing emails from us.');
      } catch (err) {
        console.error('Unsubscribe error:', err);
        setStatus('error');
        setMessage('Something went wrong. Please try again or contact us directly.');
      }
    })();
  }, [token]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f5f5f5',
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '48px 40px',
        maxWidth: '480px',
        width: '90%',
        textAlign: 'center',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        {status === 'loading' && (
          <>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid #e5e7eb',
              borderTopColor: '#dc2626',
              borderRadius: '50%',
              animation: 'spin 0.6s linear infinite',
              margin: '0 auto 24px',
            }} />
            <p style={{ color: '#6b7280', fontSize: '15px' }}>Processing your request…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(22, 163, 74, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: '24px',
            }}>
              ✓
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1f2937', margin: '0 0 12px' }}>
              Unsubscribed
            </h1>
            <p style={{ color: '#6b7280', fontSize: '15px', lineHeight: 1.6, margin: 0 }}>
              {message}
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: '24px',
            }}>
              ✕
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1f2937', margin: '0 0 12px' }}>
              Error
            </h1>
            <p style={{ color: '#6b7280', fontSize: '15px', lineHeight: 1.6, margin: 0 }}>
              {message}
            </p>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
