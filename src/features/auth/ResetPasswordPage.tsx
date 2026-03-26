import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/useTheme';
import './Auth.css';

export function ResetPasswordPage() {
  const { theme } = useTheme();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we actually have the recovery token in the URL hash
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      // Supabase automatically parses this and sets the session behind the scenes
      // But we can just rely on the user session being set or the API call below working.
    }
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setMessage('Password updated successfully! Redirecting...');
      setTimeout(() => navigate('/'), 2000);
    }
  };

  const logoSrc = theme === 'dark' ? '/white logo - no bg.png' : '/LOGO - NO HIGH RES.png';

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-brand">
          <img src={logoSrc} alt="Isobex Lasers" className="auth-logo" />
        </div>
        <div className="auth-header">
          <h1>Update Password</h1>
          <p>Please enter your new password below.</p>
        </div>

        {error && <div className="auth-error">{error}</div>}
        {message && <div className="auth-success">{message}</div>}

        <form onSubmit={handleUpdate} className="auth-form">
          <div className="form-group">
            <label htmlFor="password">New Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" disabled={loading || !!message} className="btn-primary auth-submit">
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
