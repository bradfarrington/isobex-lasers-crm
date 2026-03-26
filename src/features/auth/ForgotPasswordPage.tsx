import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/useTheme';
import './Auth.css';

export function ForgotPasswordPage() {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        action: 'send_password_reset',
        email,
        redirectTo: `${window.location.origin}/update-password`
      }
    });

    if (error) {
      let msg = error.message || 'An error occurred. Please try again.';
      if (data?.error) msg = data.error;
      
      if ((error as any).context) {
        try {
          const ctx = await (error as any).context.json();
          if (ctx?.error) msg = ctx.error;
        } catch { /* ignore parse errors */ }
      }
      setError(msg);
    } else {
      setMessage('Password reset link sent! Check your email.');
    }
    setLoading(false);
  };

  const logoSrc = theme === 'dark' ? '/white logo - no bg.png' : '/LOGO - NO HIGH RES.png';

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-brand">
          <img src={logoSrc} alt="Isobex Lasers" className="auth-logo" />
        </div>
        <div className="auth-header">
          <h1>Reset Password</h1>
          <p>We'll send you a link to reset your password.</p>
        </div>

        {error && <div className="auth-error">{error}</div>}
        {message && <div className="auth-success">{message}</div>}

        <form onSubmit={handleReset} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>

          <button type="submit" disabled={loading || !!message} className="btn-primary auth-submit">
            {loading ? 'Sending link...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login" className="auth-link">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
