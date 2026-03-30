import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import * as api from '@/lib/api';
import { useAlert } from '@/components/ui/AlertDialog';
import { useAuth } from '@/context/AuthContext';
import type { AppUser, AppUserPermissions, UserRole } from '@/types/database';
import {
  Users, Shield, ShieldCheck, ShieldAlert, Loader2, Save,
  Mail, UserPlus, UserX, UserCheck, Pencil, X, Info, KeyRound,
} from 'lucide-react';

/* ═══════════════════════════════════════════
   Permission Labels Map
   ═══════════════════════════════════════════ */

const PERMISSION_LABELS: { key: keyof AppUserPermissions; label: string; description: string }[] = [
  { key: 'dashboard', label: 'Dashboard', description: 'View dashboard stats and activity' },
  { key: 'crm', label: 'Contacts', description: 'View and manage contacts' },
  { key: 'companies', label: 'Companies', description: 'View and manage companies' },
  { key: 'pipeline', label: 'Pipeline', description: 'View and manage sales pipeline' },
  { key: 'store', label: 'Online Store', description: 'Manage products, collections and store pages' },
  { key: 'orders', label: 'Orders', description: 'View and manage customer orders' },
  { key: 'email_marketing', label: 'Email Marketing', description: 'Create and send email campaigns' },
  { key: 'reviews', label: 'Reviews', description: 'Manage customer reviews' },
  { key: 'documents', label: 'Documents', description: 'View and manage documents' },
  { key: 'installations', label: 'Installations', description: 'Track installations' },
  { key: 'support', label: 'Support', description: 'Handle support tickets' },
  { key: 'reporting', label: 'Reporting', description: 'View business reports and analytics' },
  { key: 'settings', label: 'Settings', description: 'Access system settings' },
];

const DEFAULT_PERMISSIONS: AppUserPermissions = {
  dashboard: true,
  crm: true,
  companies: true,
  pipeline: true,
  store: false,
  orders: false,
  email_marketing: false,
  reviews: false,
  documents: false,
  installations: false,
  support: false,
  reporting: false,
  settings: false,
};

const ROLE_INFO: Record<UserRole, { icon: typeof Shield; label: string; color: string; bg: string }> = {
  owner: { icon: ShieldAlert, label: 'Owner', color: '#dc2626', bg: 'rgba(220, 38, 38, 0.08)' },
  admin: { icon: ShieldCheck, label: 'Admin', color: '#2563eb', bg: 'rgba(37, 99, 235, 0.08)' },
  staff: { icon: Shield, label: 'Staff', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.08)' },
};

const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  active: { color: '#16a34a', bg: 'rgba(22, 163, 74, 0.1)' },
  invited: { color: '#d97706', bg: 'rgba(217, 119, 6, 0.1)' },
  deactivated: { color: '#dc2626', bg: 'rgba(220, 38, 38, 0.1)' },
};

export function TeamPanel() {
  const { showAlert, showConfirm } = useAlert();
  const { appUser: currentUser, isAdmin } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<AppUser | null>(null);

  // Load team members
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await api.fetchAppUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load team members:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <div className="settings-panel-head">
          <h3>Team</h3>
          <p className="settings-panel-desc">Loading…</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
          <div className="loading-spinner" />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="settings-panel-head">
        <h3>Team</h3>
        <p className="settings-panel-desc">
          Invite team members, assign roles, and control what each person can access.
        </p>
      </div>

      {/* Status Card */}
      <div className="settings-integration-card connected">
        <div className="settings-integration-icon">
          <Users size={24} />
        </div>
        <div className="settings-integration-info">
          <h4>{users.length} Team Member{users.length !== 1 ? 's' : ''}</h4>
          <p>{users.filter(u => u.status === 'active').length} active, {users.filter(u => u.status === 'invited').length} pending invites</p>
        </div>
        {isAdmin && (
          <div className="settings-integration-action">
            <button
              className="btn-brand"
              onClick={() => setShowInvite(true)}
              style={{ gap: '6px' }}
            >
              <UserPlus size={16} /> Invite
            </button>
          </div>
        )}
      </div>

      {/* Invite Form */}
      {showInvite && (
        <InviteForm
          onClose={() => setShowInvite(false)}
          onInvited={() => { loadUsers(); setShowInvite(false); }}
        />
      )}

      {/* Team List */}
      <div className="settings-section">
        <div className="settings-section-title">Team Members</div>
        {users.length === 0 ? (
          <div className="team-empty">
            <Users size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
            <p>No team members yet. Invite your first team member above.</p>
          </div>
        ) : (
          <div className="team-list">
            {users.map(user => (
              <TeamMemberRow
                key={user.id}
                user={user}
                isCurrentUser={user.auth_user_id === currentUser?.auth_user_id}
                canEdit={isAdmin && user.role !== 'owner'}
                onEdit={() => setEditingUser(user)}
                onResetPassword={() => setResetPasswordUser(user)}
                onToggleStatus={async () => {
                  const action = user.status === 'deactivated' ? 'reactivate' : 'deactivate';
                  const ok = await showConfirm({
                    title: `${action === 'deactivate' ? 'Deactivate' : 'Reactivate'} User`,
                    message: `Are you sure you want to ${action} ${user.full_name}?`,
                    confirmLabel: action === 'deactivate' ? 'Deactivate' : 'Reactivate',
                  });
                  if (!ok) return;
                  try {
                    if (action === 'deactivate') {
                      await api.deactivateUser(user.id);
                    } else {
                      await api.reactivateUser(user.id);
                    }
                    loadUsers();
                    showAlert({ title: 'Done', message: `${user.full_name} has been ${action}d.`, variant: 'success' });
                  } catch (err) {
                    showAlert({ title: 'Error', message: `Failed to ${action} user.`, variant: 'danger' });
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="smtp-info-box">
        <Info size={14} />
        <span>
          Invited users will receive an email with their login credentials. Staff members can only
          access the sections you enable in their permissions. Owners and admins have full access.
        </span>
      </div>

      {/* Edit Permissions Modal */}
      {editingUser && (
        <EditPermissionsModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={() => { loadUsers(); setEditingUser(null); }}
        />
      )}

      {/* Reset Password Modal */}
      {resetPasswordUser && (
        <ResetPasswordModal
          user={resetPasswordUser}
          isSelf={resetPasswordUser.auth_user_id === currentUser?.auth_user_id}
          onClose={() => setResetPasswordUser(null)}
        />
      )}
    </>
  );
}

/* ═══════════════════════════════════════════
   Invite Form
   ═══════════════════════════════════════════ */

function InviteForm({ onClose, onInvited }: { onClose: () => void; onInvited: () => void }) {
  const { showAlert } = useAlert();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'staff'>('staff');
  const [permissions, setPermissions] = useState<AppUserPermissions>({ ...DEFAULT_PERMISSIONS });
  const [sending, setSending] = useState(false);

  const togglePermission = (key: keyof AppUserPermissions) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) return;
    setSending(true);
    try {
      const result = await api.inviteUser({
        full_name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        permissions: role === 'admin' ? Object.fromEntries(PERMISSION_LABELS.map(p => [p.key, true])) as AppUserPermissions : permissions,
      });
      if (result.error) {
        showAlert({ title: 'Error', message: result.error, variant: 'danger' });
      } else {
        showAlert({ title: 'Invited!', message: `${name} has been invited. A welcome email has been sent to ${email}.`, variant: 'success' });
        onInvited();
      }
    } catch (err: any) {
      showAlert({ title: 'Error', message: err?.message || 'Failed to invite user', variant: 'danger' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="team-invite-card">
      <div className="team-invite-header">
        <h4><UserPlus size={16} /> Invite Team Member</h4>
        <button className="row-action-btn" onClick={onClose}><X size={16} /></button>
      </div>

      <div className="team-invite-body">
        <div className="smtp-field-row">
          <div className="smtp-field">
            <label className="smtp-field-label">Full Name</label>
            <input
              className="smtp-field-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="John Smith"
            />
          </div>
          <div className="smtp-field">
            <label className="smtp-field-label">Email Address</label>
            <input
              className="smtp-field-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="john@isobexlasers.com"
            />
          </div>
        </div>

        <div className="smtp-field" style={{ marginBottom: 'var(--space-4)' }}>
          <label className="smtp-field-label">Role</label>
          <div className="team-role-selector">
            <button
              className={`team-role-btn ${role === 'staff' ? 'active' : ''}`}
              onClick={() => setRole('staff')}
            >
              <Shield size={14} />
              Staff
            </button>
            <button
              className={`team-role-btn ${role === 'admin' ? 'active' : ''}`}
              onClick={() => setRole('admin')}
            >
              <ShieldCheck size={14} />
              Admin
            </button>
          </div>
        </div>

        {role === 'staff' && (
          <div className="team-permissions-grid">
            <div className="settings-section-title" style={{ marginBottom: 'var(--space-3)' }}>
              Section Access
            </div>
            {PERMISSION_LABELS.map(p => (
              <label key={p.key} className="team-permission-toggle">
                <div className="team-permission-info">
                  <span className="team-permission-label">{p.label}</span>
                  <span className="team-permission-desc">{p.description}</span>
                </div>
                <input
                  type="checkbox"
                  checked={permissions[p.key]}
                  onChange={() => togglePermission(p.key)}
                />
              </label>
            ))}
          </div>
        )}

        {role === 'admin' && (
          <div className="smtp-info-box" style={{ marginTop: 0, marginBottom: 'var(--space-4)' }}>
            <Info size={14} />
            <span>Admins have full access to all sections and can manage team members.</span>
          </div>
        )}
      </div>

      <div className="team-invite-footer">
        <button className="btn-outline" onClick={onClose}>Cancel</button>
        <button
          className="btn-brand"
          onClick={handleSubmit}
          disabled={sending || !name.trim() || !email.trim()}
        >
          {sending ? <><Loader2 size={16} className="spin" /> Sending…</> : <><Mail size={16} /> Send Invite</>}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Team Member Row
   ═══════════════════════════════════════════ */

function TeamMemberRow({
  user,
  isCurrentUser,
  canEdit,
  onEdit,
  onResetPassword,
  onToggleStatus,
}: {
  user: AppUser;
  isCurrentUser: boolean;
  canEdit: boolean;
  onEdit: () => void;
  onResetPassword: () => void;
  onToggleStatus: () => void;
}) {
  const roleInfo = ROLE_INFO[user.role];
  const statusStyle = STATUS_STYLES[user.status] || STATUS_STYLES.active;
  const RoleIcon = roleInfo.icon;

  return (
    <div className={`team-member-row ${user.status === 'deactivated' ? 'deactivated' : ''}`}>
      {/* Header wrapper for responsive card */}
      <div className="team-member-header">
        {/* Avatar */}
        <div className="team-member-avatar" style={{ background: roleInfo.bg, color: roleInfo.color }}>
          {user.full_name.charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div className="team-member-info">
          <div className="team-member-name">
            {user.full_name}
            {isCurrentUser && <span className="team-member-you">(You)</span>}
          </div>
          <div className="team-member-email">{user.email}</div>
        </div>
      </div>

      {/* Pills — always pinned right */}
      <div className="team-member-pills">
        <div className="team-member-role" style={{ background: roleInfo.bg, color: roleInfo.color }}>
          <RoleIcon size={12} />
          {roleInfo.label}
        </div>
        <div className="team-member-status" style={{ background: statusStyle.bg, color: statusStyle.color }}>
          {user.status}
        </div>
      </div>

      {/* Actions — hover overlay for other users */}
      {canEdit && !isCurrentUser && (
        <div className="team-member-actions">
          <button className="row-action-btn" title="Edit Permissions" onClick={onEdit}>
            <Pencil size={14} />
          </button>
          <button className="row-action-btn" title="Reset Password" onClick={onResetPassword}>
            <KeyRound size={14} />
          </button>
          <button
            className={`row-action-btn ${user.status === 'deactivated' ? '' : 'danger'}`}
            title={user.status === 'deactivated' ? 'Reactivate' : 'Deactivate'}
            onClick={onToggleStatus}
          >
            {user.status === 'deactivated' ? <UserCheck size={14} /> : <UserX size={14} />}
          </button>
        </div>
      )}

      {/* Change own password */}
      {isCurrentUser && (
        <div className="team-member-actions">
          <button className="row-action-btn" title="Change My Password" onClick={onResetPassword}>
            <KeyRound size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Edit Permissions Modal
   ═══════════════════════════════════════════ */

function EditPermissionsModal({
  user,
  onClose,
  onSaved,
}: {
  user: AppUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showAlert } = useAlert();
  const [role, setRole] = useState<UserRole>(user.role);
  const [permissions, setPermissions] = useState<AppUserPermissions>({ ...user.permissions });
  const [saving, setSaving] = useState(false);

  const togglePermission = (key: keyof AppUserPermissions) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateAppUser(user.id, {
        role,
        permissions: role === 'admin' ? Object.fromEntries(PERMISSION_LABELS.map(p => [p.key, true])) as AppUserPermissions : permissions,
      });
      showAlert({ title: 'Updated', message: `${user.full_name}'s permissions have been updated.`, variant: 'success' });
      onSaved();
    } catch (err: any) {
      showAlert({ title: 'Error', message: err?.message || 'Failed to update permissions', variant: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="team-modal-overlay" onClick={onClose}>
      <div className="team-modal" onClick={e => e.stopPropagation()}>
        <div className="team-modal-header">
          <h3>Edit {user.full_name}</h3>
          <button className="row-action-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="team-modal-body">
          {/* Role Selector */}
          <div className="smtp-field" style={{ marginBottom: 'var(--space-5)' }}>
            <label className="smtp-field-label">Role</label>
            <div className="team-role-selector">
              <button
                className={`team-role-btn ${role === 'staff' ? 'active' : ''}`}
                onClick={() => setRole('staff')}
              >
                <Shield size={14} />
                Staff
              </button>
              <button
                className={`team-role-btn ${role === 'admin' ? 'active' : ''}`}
                onClick={() => setRole('admin')}
              >
                <ShieldCheck size={14} />
                Admin
              </button>
            </div>
          </div>

          {/* Permissions Grid */}
          {role === 'staff' && (
            <div className="team-permissions-grid">
              <div className="settings-section-title" style={{ marginBottom: 'var(--space-3)' }}>
                Section Access
              </div>
              {PERMISSION_LABELS.map(p => (
                <label key={p.key} className="team-permission-toggle">
                  <div className="team-permission-info">
                    <span className="team-permission-label">{p.label}</span>
                    <span className="team-permission-desc">{p.description}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={permissions[p.key]}
                    onChange={() => togglePermission(p.key)}
                  />
                </label>
              ))}
            </div>
          )}

          {role === 'admin' && (
            <div className="smtp-info-box" style={{ marginTop: 0 }}>
              <Info size={14} />
              <span>Admins have full access to all sections and can manage team members.</span>
            </div>
          )}
        </div>

        <div className="team-modal-footer">
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-brand" onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 size={16} className="spin" /> Saving…</> : <><Save size={16} /> Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Reset Password Modal
   ═══════════════════════════════════════════ */

function ResetPasswordModal({
  user,
  isSelf,
  onClose,
}: {
  user: AppUser;
  isSelf: boolean;
  onClose: () => void;
}) {
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
      if (isSelf) {
        // Change own password via client SDK
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
          showAlert({ title: 'Error', message: error.message, variant: 'danger' });
          return;
        }
      } else {
        // Admin resetting another user's password via edge function
        const result = await api.resetUserPassword(user.auth_user_id, newPassword);
        if (result.error) {
          showAlert({ title: 'Error', message: result.error, variant: 'danger' });
          return;
        }
      }
      showAlert({
        title: 'Password Updated',
        message: isSelf ? 'Your password has been changed.' : `${user.full_name}'s password has been changed.`,
        variant: 'success',
      });
      onClose();
    } catch (err: any) {
      showAlert({ title: 'Error', message: err?.message || 'Failed to update password', variant: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="team-modal-overlay" onClick={onClose}>
      <div className="team-modal" onClick={e => e.stopPropagation()}>
        <div className="team-modal-header">
          <h3>{isSelf ? 'Change My Password' : `Reset Password — ${user.full_name}`}</h3>
          <button className="row-action-btn" onClick={onClose}><X size={18} /></button>
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
            {saving ? <><Loader2 size={16} className="spin" /> Saving…</> : <><KeyRound size={16} /> Update Password</>}
          </button>
        </div>
      </div>
    </div>
  );
}
