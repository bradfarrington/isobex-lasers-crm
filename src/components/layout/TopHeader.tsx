import { useState, useRef, useEffect } from 'react';
import { Menu, PanelLeftClose, Sun, Moon, LogOut, KeyRound } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/lib/supabase';
import { useAlert } from '@/components/ui/AlertDialog';
import { useAuth } from '@/context/AuthContext';
import { GlobalSearch } from './GlobalSearch';
import './TopHeader.css';

interface TopHeaderProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

export function TopHeader({ onToggleSidebar, sidebarOpen }: TopHeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { showConfirm } = useAlert();
  const { appUser } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Derive initials from appUser full_name or fall back to email
  const getInitials = () => {
    if (appUser?.full_name) {
      const parts = appUser.full_name.trim().split(/\s+/);
      if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      return parts[0][0].toUpperCase();
    }
    if (appUser?.email) return appUser.email[0].toUpperCase();
    return '?';
  };

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    const confirmed = await showConfirm({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out?',
      confirmLabel: 'Sign Out',
    });
    if (confirmed) {
      await supabase.auth.signOut();
    }
  };

  const handleChangePassword = () => {
    setMenuOpen(false);
    setShowPasswordModal(true);
  };

  return (
    <>
      <header className="top-header">
        <div className="top-header-left">
          <button
            className="top-header-toggle"
            onClick={onToggleSidebar}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? <PanelLeftClose size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <div className="top-header-center">
          <GlobalSearch />
        </div>

        <div className="top-header-right">
          <button
            className="top-header-icon-btn"
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {/* Avatar + Dropdown */}
          <div className="top-header-avatar-wrap" ref={menuRef}>
            <button
              className="top-header-avatar"
              onClick={() => setMenuOpen(!menuOpen)}
              title={appUser?.full_name || 'Account'}
            >
              <span>{getInitials()}</span>
            </button>

            {menuOpen && (
              <div className="top-header-menu">
                <div className="top-header-menu-user">
                  <span className="top-header-menu-name">{appUser?.full_name || 'User'}</span>
                  <span className="top-header-menu-email">{appUser?.email || ''}</span>
                </div>
                <div className="top-header-menu-divider" />
                <button className="top-header-menu-item" onClick={handleChangePassword}>
                  <KeyRound size={14} />
                  Change Password
                </button>
                <button className="top-header-menu-item danger" onClick={handleLogout}>
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </>
  );
}

/* ═══════════════════════════════════════
   Inline Change Password Modal
   ═══════════════════════════════════════ */

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { showAlert } = useAlert();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const passwordsMatch = newPassword === confirmPassword;
  const isValid = newPassword.length >= 8 && passwordsMatch;

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        showAlert({ title: 'Error', message: error.message, variant: 'danger' });
      } else {
        showAlert({ title: 'Password Updated', message: 'Your password has been changed.', variant: 'success' });
        onClose();
      }
    } catch (err: any) {
      showAlert({ title: 'Error', message: err?.message || 'Failed to change password', variant: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="team-modal-overlay" onClick={onClose}>
      <div className="team-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
        <div className="team-modal-header">
          <h3>Change Password</h3>
          <button className="row-action-btn" onClick={onClose}>✕</button>
        </div>

        <div className="team-modal-body">
          <div className="smtp-field" style={{ marginBottom: 'var(--space-4)' }}>
            <label className="smtp-field-label">New Password</label>
            <input
              className="smtp-field-input"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters"
            />
          </div>

          <div className="smtp-field" style={{ marginBottom: 'var(--space-4)' }}>
            <label className="smtp-field-label">Confirm Password</label>
            <input
              className="smtp-field-input"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
            />
          </div>

          {newPassword.length > 0 && newPassword.length < 8 && (
            <p style={{ color: '#dc2626', fontSize: 'var(--font-size-xs)', margin: '0 0 var(--space-3)' }}>
              Password must be at least 8 characters
            </p>
          )}
          {confirmPassword.length > 0 && !passwordsMatch && (
            <p style={{ color: '#dc2626', fontSize: 'var(--font-size-xs)', margin: '0 0 var(--space-3)' }}>
              Passwords do not match
            </p>
          )}
        </div>

        <div className="team-modal-footer">
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-brand" onClick={handleSave} disabled={saving || !isValid}>
            {saving ? 'Saving…' : 'Update Password'}
          </button>
        </div>
      </div>
    </div>
  );
}
