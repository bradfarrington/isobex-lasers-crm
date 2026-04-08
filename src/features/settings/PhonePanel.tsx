import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAlert } from '@/components/ui/AlertDialog';
import type { PhoneNumber, PhoneCallLog, TwilioAvailableNumber } from '@/types/database';
import {
    Phone, PhoneCall, PhoneIncoming, PhoneOutgoing, PhoneMissed,
    Search, Plus, Trash2, Loader2, Save, Settings2,
    CheckCircle2, AlertTriangle, Clock, Mic, VoicemailIcon,
    RefreshCcw, ArrowRight, Shield, MapPin, FileCheck, X, ChevronRight, ChevronLeft, Upload
} from 'lucide-react';

/* ─── Helpers ─────────────────────────────────────────── */

function formatPhoneDisplay(e164: string): string {
    if (e164.startsWith('+44')) {
        const national = '0' + e164.slice(3);
        // Format as 0XXXX XXXXXX
        if (national.length === 11) {
            return `${national.slice(0, 5)} ${national.slice(5)}`;
        }
        return national;
    }
    return e164;
}

function formatDuration(seconds: number): string {
    if (!seconds) return '0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
    active: { label: 'Active', className: 'badge-success' },
    suspended: { label: 'Suspended', className: 'badge-warning' },
    porting: { label: 'Porting', className: 'badge-info' },
    released: { label: 'Released', className: 'badge-muted' },
};

const CALL_STATUS_LABELS: Record<string, string> = {
    completed: 'Completed',
    'no-answer': 'No Answer',
    busy: 'Busy',
    failed: 'Failed',
    canceled: 'Cancelled',
    initiated: 'Initiated',
    ringing: 'Ringing',
    'in-progress': 'In Progress',
};

/* ─── API Helpers ─────────────────────────────────────── */

async function phoneApi(action: string, payload: Record<string, any> = {}) {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/phone-numbers`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({ action, ...payload }),
        }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
}

/* ═══════════════════════════════════════════════════════
   PHONE PANEL
   ═══════════════════════════════════════════════════════ */

export function PhonePanel() {
    const { showAlert, showConfirm } = useAlert();
    const [loading, setLoading] = useState(true);
    const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
    const [callLogs, setCallLogs] = useState<PhoneCallLog[]>([]);
    const [_totalLogs, setTotalLogs] = useState(0);
    const [usageStats, setUsageStats] = useState<any>(null);

    // Sections
    const [activeSection, setActiveSection] = useState<'numbers' | 'buy' | 'usage' | 'compliance'>('numbers');

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<TwilioAvailableNumber[]>([]);
    const [monthlyCost, setMonthlyCost] = useState(300);

    // Purchase state
    const [purchasing, setPurchasing] = useState<string | null>(null);
    const [purchaseLabel, setPurchaseLabel] = useState('');
    const [purchaseForward, setPurchaseForward] = useState('');

    // Editing state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ forward_to: '', forward_enabled: false, friendly_name: '', voicemail_enabled: false, recording_enabled: false });
    const [savingEdit, setSavingEdit] = useState(false);

    // Release state
    const [releasing, setReleasing] = useState<string | null>(null);

    // Compliance state
    const [bundleStatus, setBundleStatus] = useState<string>('loading');
    const [complianceData, setComplianceData] = useState<any>(null);
    const [settingUpCompliance, setSettingUpCompliance] = useState(false);

    // Bundle wizard modal
    const [showBundleModal, setShowBundleModal] = useState(false);
    const [bundleStep, setBundleStep] = useState(1);
    const [bundleForm, setBundleForm] = useState({
        endUserType: 'individual' as 'business' | 'individual',
        numberType: 'local' as 'local' | 'mobile',
        businessName: '',
        firstName: '',
        lastName: '',
        contactEmail: '',
        phoneCountryCode: '+44',
        phoneNumber: '',
        // Address
        addressStreet: '',
        addressStreet2: '',
        addressCity: '',
        addressRegion: '',
        addressPostalCode: '',
        // Document types
        identityDocType: 'government_issued_id',
        addressDocType: 'utility_bill',
    });
    const [identityFile, setIdentityFile] = useState<File | null>(null);
    const [addressProofFile, setAddressProofFile] = useState<File | null>(null);

    const fetchNumbers = useCallback(async () => {
        try {
            const data = await phoneApi('getNumbers');
            setNumbers(data.numbers || []);
        } catch (err) {
            console.error('Failed to fetch numbers:', err);
        }
    }, []);

    const fetchCallLogs = useCallback(async () => {
        try {
            const data = await phoneApi('getCallLogs', { limit: 50 });
            setCallLogs(data.logs || []);
            setTotalLogs(data.total || 0);
        } catch (err) {
            console.error('Failed to fetch call logs:', err);
        }
    }, []);

    const fetchUsage = useCallback(async () => {
        try {
            const data = await phoneApi('getUsage', { months: 6 });
            setUsageStats(data.stats || null);
        } catch (err) {
            console.error('Failed to fetch usage:', err);
        }
    }, []);

    const [refreshingStatus, setRefreshingStatus] = useState(false);

    const fetchBundleStatus = useCallback(async () => {
        setRefreshingStatus(true);
        try {
            const data = await phoneApi('getBundleStatus');
            setBundleStatus(data.status || 'none');
            setComplianceData(data);
        } catch {
            setBundleStatus('unknown');
        } finally {
            setRefreshingStatus(false);
        }
    }, []);

    const handleRegisterAddress = async () => {
        setSettingUpCompliance(true);
        try {
            const result = await phoneApi('registerAddress');
            showAlert({ title: 'Address Registered', message: result.message || 'Your business address has been registered.', variant: 'success' });
            await fetchBundleStatus();
        } catch (err: any) {
            showAlert({ title: 'Registration Failed', message: err.message || 'Failed to register address', variant: 'danger' });
        } finally {
            setSettingUpCompliance(false);
        }
    };

    const handleCreateBundle = async () => {
        setSettingUpCompliance(true);
        try {
            // Format phone to E.164 using selected country code
            let phoneDigits = bundleForm.phoneNumber.trim().replace(/\D/g, '');
            if (phoneDigits.startsWith('0')) phoneDigits = phoneDigits.slice(1); // strip leading 0
            const phone = `${bundleForm.phoneCountryCode}${phoneDigits}`;

            // Convert files to base64
            const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve((reader.result as string).split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const payload: Record<string, any> = {
                endUserType: bundleForm.endUserType,
                numberType: bundleForm.numberType,
                businessName: bundleForm.businessName,
                firstName: bundleForm.firstName,
                lastName: bundleForm.lastName,
                contactEmail: bundleForm.contactEmail,
                phoneNumber: phone,
                addressStreet: bundleForm.addressStreet,
                addressStreet2: bundleForm.addressStreet2,
                addressCity: bundleForm.addressCity,
                addressRegion: bundleForm.addressRegion,
                addressPostalCode: bundleForm.addressPostalCode,
                identityDocType: bundleForm.identityDocType,
                addressDocType: bundleForm.addressDocType,
            };

            if (identityFile) {
                payload.identityFile = await toBase64(identityFile);
                payload.identityFileName = identityFile.name;
                payload.identityFileMime = identityFile.type;
            }
            if (addressProofFile) {
                payload.addressProofFile = await toBase64(addressProofFile);
                payload.addressProofFileName = addressProofFile.name;
                payload.addressProofFileMime = addressProofFile.type;
            }

            const result = await phoneApi('createBundle', payload);
            setShowBundleModal(false);
            setBundleStep(1);
            setIdentityFile(null);
            setAddressProofFile(null);
            if (result.pending) {
                showAlert({ title: 'Bundle Submitted', message: result.message, variant: 'warning' });
            } else {
                showAlert({ title: 'Bundle Ready', message: result.message || 'Your regulatory bundle is set up.', variant: 'success' });
            }
            await fetchBundleStatus();
        } catch (err: any) {
            showAlert({ title: 'Bundle Failed', message: err.message || 'Failed to create bundle', variant: 'danger' });
        } finally {
            setSettingUpCompliance(false);
        }
    };

    useEffect(() => {
        Promise.all([fetchNumbers(), fetchCallLogs(), fetchUsage(), fetchBundleStatus()])
            .finally(() => setLoading(false));
    }, [fetchNumbers, fetchCallLogs, fetchUsage, fetchBundleStatus]);

    /* ── Search ── */
    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            showAlert({ title: 'Search', message: 'Enter an area code or pattern to search (e.g. 0121 for Birmingham)', variant: 'warning' });
            return;
        }
        setSearching(true);
        setSearchResults([]);
        try {
            // For UK numbers, the AreaCode param doesn't work — use Contains instead
            const cleaned = searchQuery.replace(/[\s\-\(\)]/g, '');
            // Strip leading 0 or +44 prefix so we send just the area code digits
            let digits = cleaned;
            if (digits.startsWith('+44')) digits = digits.slice(3);
            else if (digits.startsWith('0')) digits = digits.slice(1);
            const payload: any = { contains: digits };
            const data = await phoneApi('searchNumbers', payload);
            setSearchResults(data.numbers || []);
            setMonthlyCost(data.monthlyCostPence || 300);
            if ((data.numbers || []).length === 0) {
                showAlert({ title: 'No Results', message: 'No available numbers found for that search. Try a different area code.', variant: 'info' });
            }
        } catch (err: any) {
            showAlert({ title: 'Search Error', message: err.message || 'Failed to search numbers', variant: 'danger' });
        } finally {
            setSearching(false);
        }
    };

    /* ── Purchase ── */
    const handlePurchase = async (phoneNumber: string) => {
        setPurchasing(phoneNumber);
        try {
            const result = await phoneApi('purchaseNumber', {
                phoneNumber,
                friendlyName: purchaseLabel || undefined,
                forwardTo: purchaseForward.trim() || undefined,
            });
            // Check for pending response (regulatory bundle under review)
            if (result.pending) {
                showAlert({ title: 'Purchase Pending', message: result.message || 'Your regulatory compliance bundle is under review. You will be able to purchase numbers once approved.', variant: 'warning' });
                return;
            }
            showAlert({ title: 'Number Purchased!', message: `${formatPhoneDisplay(phoneNumber)} has been provisioned and is now active.`, variant: 'success' });
            setSearchResults([]);
            setPurchaseLabel('');
            setPurchaseForward('');
            setActiveSection('numbers');
            await fetchNumbers();
        } catch (err: any) {
            showAlert({ title: 'Purchase Failed', message: err.message || 'Failed to purchase number', variant: 'danger' });
        } finally {
            setPurchasing(null);
        }
    };

    /* ── Update ── */
    const handleSaveEdit = async () => {
        if (!editingId) return;
        setSavingEdit(true);
        try {
            await phoneApi('updateNumber', {
                numberId: editingId,
                forwardTo: editForm.forward_to.trim() || null,
                forwardEnabled: editForm.forward_enabled,
                friendlyName: editForm.friendly_name,
                voicemailEnabled: editForm.voicemail_enabled,
                recordingEnabled: editForm.recording_enabled,
            });
            showAlert({ title: 'Updated', message: 'Phone number settings saved.', variant: 'success' });
            setEditingId(null);
            await fetchNumbers();
        } catch (err: any) {
            showAlert({ title: 'Error', message: err.message || 'Failed to update', variant: 'danger' });
        } finally {
            setSavingEdit(false);
        }
    };

    /* ── Release ── */
    const handleRelease = async (numberId: string, displayNumber: string) => {
        const ok = await showConfirm({
            title: 'Release Number?',
            message: `This will permanently release ${displayNumber}. The number will be returned to the pool and your monthly subscription will be cancelled. This cannot be undone.`,
            confirmLabel: 'Release Number',
        });
        if (!ok) return;
        setReleasing(numberId);
        try {
            await phoneApi('releaseNumber', { numberId });
            showAlert({ title: 'Released', message: `${displayNumber} has been released.`, variant: 'success' });
            await fetchNumbers();
        } catch (err: any) {
            showAlert({ title: 'Error', message: err.message || 'Failed to release number', variant: 'danger' });
        } finally {
            setReleasing(null);
        }
    };

    const startEdit = (n: PhoneNumber) => {
        setEditingId(n.id);
        setEditForm({
            forward_to: n.forward_to || '',
            forward_enabled: n.forward_enabled,
            friendly_name: n.friendly_name || '',
            voicemail_enabled: n.voicemail_enabled,
            recording_enabled: n.recording_enabled,
        });
    };

    /* ── Loading ── */
    if (loading) {
        return (
            <>
                <div className="settings-panel-head">
                    <h3>Phone Numbers</h3>
                    <p className="settings-panel-desc">Loading phone settings...</p>
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
                <h3>Phone Numbers</h3>
                <p className="settings-panel-desc">
                    Manage your business phone numbers, call forwarding, voicemail, and call recording.
                </p>
            </div>

            {/* Section Tabs */}
            <div className="phone-section-tabs">
                <button
                    className={`phone-section-tab ${activeSection === 'numbers' ? 'active' : ''}`}
                    onClick={() => setActiveSection('numbers')}
                >
                    <Phone size={16} /> Your Numbers {numbers.length > 0 && <span className="phone-tab-count">{numbers.length}</span>}
                </button>
                <button
                    className={`phone-section-tab ${activeSection === 'compliance' ? 'active' : ''}`}
                    onClick={() => setActiveSection('compliance')}
                >
                    <FileCheck size={16} /> Compliance
                    {bundleStatus === 'approved' && <CheckCircle2 size={12} style={{ color: '#10b981', marginLeft: 4 }} />}
                    {(bundleStatus === 'pending-review' || bundleStatus === 'draft') && <Clock size={12} style={{ color: '#f59e0b', marginLeft: 4 }} />}
                </button>
                <button
                    className={`phone-section-tab ${activeSection === 'buy' ? 'active' : ''}`}
                    onClick={() => setActiveSection('buy')}
                >
                    <Plus size={16} /> Buy a Number
                </button>
                <button
                    className={`phone-section-tab ${activeSection === 'usage' ? 'active' : ''}`}
                    onClick={() => setActiveSection('usage')}
                >
                    <PhoneCall size={16} /> Usage & Logs
                </button>
            </div>

            {/* ═══════ YOUR NUMBERS ═══════ */}
            {activeSection === 'numbers' && (
                <div className="phone-section">
                    {numbers.length === 0 ? (
                        <div className="phone-empty-state">
                            <Phone size={40} strokeWidth={1.5} />
                            <h4>No Phone Numbers Yet</h4>
                            <p>Purchase a local UK phone number to use as your business landline with call forwarding to your mobile.</p>
                            <button className="btn-brand" onClick={() => setActiveSection('buy')}>
                                <Plus size={16} /> Buy Your First Number
                            </button>
                        </div>
                    ) : (
                        <div className="phone-numbers-list">
                            {numbers.map(n => {
                                const isEditing = editingId === n.id;
                                const statusBadge = STATUS_BADGES[n.status] || STATUS_BADGES.active;

                                return (
                                    <div key={n.id} className={`phone-number-card ${n.status === 'suspended' ? 'suspended' : ''}`}>
                                        <div className="phone-number-card-header">
                                            <div className="phone-number-display">
                                                <Phone size={20} />
                                                <div>
                                                    <span className="phone-number-digits">{formatPhoneDisplay(n.phone_number)}</span>
                                                    {n.friendly_name && <span className="phone-number-label">{n.friendly_name}</span>}
                                                </div>
                                            </div>
                                            <div className="phone-number-badges">
                                                <span className={`badge ${statusBadge.className}`}>
                                                    {n.status === 'active' ? <CheckCircle2 size={12} /> : n.status === 'suspended' ? <AlertTriangle size={12} /> : null}
                                                    {statusBadge.label}
                                                </span>
                                                <span className="phone-cost-badge">£{(n.monthly_cost_pence / 100).toFixed(2)}/mo</span>
                                            </div>
                                        </div>

                                        {/* Feature indicators */}
                                        <div className="phone-number-features">
                                            <div className={`phone-feature-pill ${n.forward_enabled ? 'active' : ''}`}>
                                                <ArrowRight size={12} />
                                                {n.forward_enabled ? `Forwarding to ${formatPhoneDisplay(n.forward_to || '')}` : 'No Forwarding'}
                                            </div>
                                            <div className={`phone-feature-pill ${n.voicemail_enabled ? 'active' : ''}`}>
                                                <VoicemailIcon size={12} />
                                                {n.voicemail_enabled ? 'Voicemail On' : 'Voicemail Off'}
                                            </div>
                                            <div className={`phone-feature-pill ${n.recording_enabled ? 'active' : ''}`}>
                                                <Mic size={12} />
                                                {n.recording_enabled ? 'Recording On' : 'Recording Off'}
                                            </div>
                                        </div>

                                        {/* Edit Panel */}
                                        {isEditing ? (
                                            <div className="phone-edit-panel">
                                                <div className="smtp-field">
                                                    <label className="smtp-field-label">Friendly Name</label>
                                                    <input
                                                        className="smtp-field-input"
                                                        value={editForm.friendly_name}
                                                        onChange={e => setEditForm(f => ({ ...f, friendly_name: e.target.value }))}
                                                        placeholder="e.g. Office Landline"
                                                    />
                                                </div>

                                                <div className="smtp-field-row">
                                                    <div className="smtp-field">
                                                        <label className="smtp-field-label">Forward To</label>
                                                        <input
                                                            className="smtp-field-input"
                                                            value={editForm.forward_to}
                                                            onChange={e => setEditForm(f => ({ ...f, forward_to: e.target.value }))}
                                                            placeholder="+44 7700 900123"
                                                        />
                                                    </div>
                                                    <div className="smtp-field" style={{ justifyContent: 'flex-end' }}>
                                                        <label className="smtp-checkbox-label">
                                                            <input
                                                                type="checkbox"
                                                                checked={editForm.forward_enabled}
                                                                onChange={e => setEditForm(f => ({ ...f, forward_enabled: e.target.checked }))}
                                                            />
                                                            Enable Forwarding
                                                        </label>
                                                    </div>
                                                </div>

                                                <div className="phone-toggles-row">
                                                    <label className="smtp-checkbox-label">
                                                        <input
                                                            type="checkbox"
                                                            checked={editForm.voicemail_enabled}
                                                            onChange={e => setEditForm(f => ({ ...f, voicemail_enabled: e.target.checked }))}
                                                        />
                                                        <VoicemailIcon size={14} /> Voicemail
                                                    </label>
                                                    <label className="smtp-checkbox-label">
                                                        <input
                                                            type="checkbox"
                                                            checked={editForm.recording_enabled}
                                                            onChange={e => setEditForm(f => ({ ...f, recording_enabled: e.target.checked }))}
                                                        />
                                                        <Mic size={14} /> Call Recording
                                                    </label>
                                                </div>

                                                <div className="phone-edit-actions">
                                                    <button className="btn-brand" onClick={handleSaveEdit} disabled={savingEdit}>
                                                        {savingEdit ? <><Loader2 size={14} className="spin" /> Saving…</> : <><Save size={14} /> Save Changes</>}
                                                    </button>
                                                    <button className="btn-outline" onClick={() => setEditingId(null)}>Cancel</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="phone-card-actions">
                                                <button className="btn-outline" onClick={() => startEdit(n)}>
                                                    <Settings2 size={14} /> Configure
                                                </button>
                                                <button
                                                    className="btn-outline phone-release-btn"
                                                    onClick={() => handleRelease(n.id, formatPhoneDisplay(n.phone_number))}
                                                    disabled={releasing === n.id}
                                                >
                                                    {releasing === n.id ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />} Release
                                                </button>
                                            </div>
                                        )}

                                        {n.status === 'suspended' && (
                                            <div className="phone-suspended-banner">
                                                <AlertTriangle size={14} />
                                                <span>Payment failed — this number is suspended. Update your payment method to reactivate.</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                </div>
            )}

            {/* ═══════ COMPLIANCE ═══════ */}
            {activeSection === 'compliance' && (
                <div className="phone-section">
                    <div className="phone-search-card" style={{ marginBottom: 'var(--space-4)' }}>
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Shield size={18} /> Regulatory Compliance
                        </h4>
                        <p>UK phone numbers require a registered business address and regulatory bundle before you can purchase numbers.</p>
                    </div>

                    {/* Address Card */}
                    <div className="phone-search-card" style={{ marginBottom: 'var(--space-4)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                <MapPin size={16} /> Business Address
                            </h4>
                            {!complianceData?.address && (
                                <button
                                    className="btn-brand"
                                    onClick={handleRegisterAddress}
                                    disabled={settingUpCompliance}
                                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-sm)' }}
                                >
                                    {settingUpCompliance ? <Loader2 size={14} className="spin" /> : <Plus size={14} />}
                                    Register Address
                                </button>
                            )}
                        </div>
                        {complianceData?.address ? (
                            <div className="smtp-info-box" style={{ background: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                                <CheckCircle2 size={14} style={{ color: '#10b981', flexShrink: 0 }} />
                                <div>
                                    <strong>Registered</strong>
                                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: 4 }}>
                                        {complianceData.address.street}, {complianceData.address.city}, {complianceData.address.postalCode}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="smtp-info-box">
                                <AlertTriangle size={14} style={{ color: 'var(--warning, #f59e0b)', flexShrink: 0 }} />
                                <span>No address registered. Your business address from Settings → Business Profile will be used.</span>
                            </div>
                        )}
                    </div>

                    {/* Bundle Card */}
                    <div className="phone-search-card" style={{ marginBottom: 'var(--space-4)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                <FileCheck size={16} /> Regulatory Bundle
                            </h4>
                            {bundleStatus !== 'approved' && bundleStatus !== 'pending-review' && complianceData?.address && (
                                <button
                                    className="btn-brand"
                                    onClick={() => {
                                        setShowBundleModal(true);
                                        setBundleStep(1);
                                        setIdentityFile(null);
                                        setAddressProofFile(null);
                                        // Pre-fill address from registered address
                                        if (complianceData?.address) {
                                            setBundleForm(f => ({
                                                ...f,
                                                addressStreet: complianceData.address.street || '',
                                                addressCity: complianceData.address.city || '',
                                                addressRegion: complianceData.address.region || '',
                                                addressPostalCode: complianceData.address.postalCode || '',
                                            }));
                                        }
                                    }}
                                    disabled={settingUpCompliance}
                                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-sm)' }}
                                >
                                    <Plus size={14} /> Create Bundle
                                </button>
                            )}
                        </div>
                        {bundleStatus === 'approved' && (
                            <div className="smtp-info-box" style={{ background: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                                <CheckCircle2 size={14} style={{ color: '#10b981', flexShrink: 0 }} />
                                <div>
                                    <strong>Approved</strong>
                                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: 4 }}>
                                        Your regulatory bundle is approved. You can purchase UK local phone numbers.
                                    </div>
                                </div>
                            </div>
                        )}
                        {bundleStatus === 'pending-review' && (
                            <div className="smtp-info-box" style={{ background: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
                                <Clock size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />
                                <div>
                                    <strong>Under Review</strong>
                                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: 4 }}>
                                        Your bundle is under review. This typically takes 1-3 business days.
                                    </div>
                                </div>
                            </div>
                        )}
                        {bundleStatus === 'draft' && (
                            <div className="smtp-info-box" style={{ background: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
                                <AlertTriangle size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />
                                <div>
                                    <strong>Draft — Not Submitted</strong>
                                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: 4 }}>
                                        A previous bundle was saved as a draft but was never fully submitted. Click "Create Bundle" to start a fresh submission — the stale draft will be cleaned up automatically.
                                    </div>
                                </div>
                            </div>
                        )}

                        {(bundleStatus === 'none' || bundleStatus === 'loading') && (
                            <div className="smtp-info-box">
                                <AlertTriangle size={14} style={{ color: 'var(--warning, #f59e0b)', flexShrink: 0 }} />
                                <span>{complianceData?.address ? 'No bundle found. Click "Create Bundle" to set one up.' : 'Register a business address first, then create a bundle.'}</span>
                            </div>
                        )}
                    </div>

                    {/* Action Bar */}
                    <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                        <button className="btn-outline" onClick={fetchBundleStatus} disabled={refreshingStatus} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {refreshingStatus ? <><Loader2 size={14} className="spin" /> Refreshing…</> : <><RefreshCcw size={14} /> Refresh Status</>}
                        </button>
                        {bundleStatus === 'approved' && (
                            <button className="btn-primary" onClick={() => setActiveSection('buy')} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <ArrowRight size={16} /> Buy a Number
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ═══════ BUY A NUMBER ═══════ */}
            {activeSection === 'buy' && (
                <div className="phone-section">
                    {bundleStatus !== 'approved' && bundleStatus !== 'loading' && (
                        <div className="smtp-info-box" style={{
                            marginBottom: 'var(--space-4)',
                            background: 'rgba(245, 158, 11, 0.08)',
                            borderColor: 'rgba(245, 158, 11, 0.3)',
                        }}>
                            <AlertTriangle size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />
                            <span>You need an approved compliance bundle before purchasing numbers.</span>
                            <button className="btn-outline" onClick={() => setActiveSection('compliance')} style={{ flexShrink: 0, fontSize: 'var(--font-size-xs)' }}>
                                Go to Compliance
                            </button>
                        </div>
                    )}

                    <div className="phone-search-card">
                        <h4>Search UK Phone Numbers</h4>
                        <p>Enter an area code to find available local numbers. E.g. "020" for London, "0121" for Birmingham, "01827" for Tamworth.</p>

                        <div className="phone-search-row">
                            <div className="phone-search-input-wrap">
                                <Search size={16} className="phone-search-icon" />
                                <input
                                    className="phone-search-input"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                    placeholder="Area code (e.g. 01827) or pattern..."
                                />
                            </div>
                            <button className="btn-brand" onClick={handleSearch} disabled={searching}>
                                {searching ? <><Loader2 size={14} className="spin" /> Searching…</> : <><Search size={14} /> Search</>}
                            </button>
                        </div>

                        {/* Purchase options (show when about to buy) */}
                        {searchResults.length > 0 && (
                            <div className="phone-purchase-options">
                                <div className="smtp-field-row">
                                    <div className="smtp-field">
                                        <label className="smtp-field-label">Label (optional)</label>
                                        <input
                                            className="smtp-field-input"
                                            value={purchaseLabel}
                                            onChange={e => setPurchaseLabel(e.target.value)}
                                            placeholder="e.g. Office Landline"
                                        />
                                    </div>
                                    <div className="smtp-field">
                                        <label className="smtp-field-label">Forward To (optional)</label>
                                        <input
                                            className="smtp-field-input"
                                            value={purchaseForward}
                                            onChange={e => setPurchaseForward(e.target.value)}
                                            placeholder="+44 7700 900123"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Search Results */}
                    {searchResults.length > 0 && (
                        <div className="phone-results-list">
                            <div className="phone-results-header">
                                <span>{searchResults.length} number{searchResults.length !== 1 ? 's' : ''} available</span>
                                <span className="phone-monthly-label">£{(monthlyCost / 100).toFixed(2)}/month • calls included</span>
                            </div>
                            {searchResults.map(num => (
                                <div key={num.phoneNumber} className="phone-result-row">
                                    <div className="phone-result-info">
                                        <span className="phone-result-number">{formatPhoneDisplay(num.phoneNumber)}</span>
                                        <span className="phone-result-location">
                                            {[num.locality, num.region].filter(Boolean).join(', ') || num.isoCountry}
                                        </span>
                                    </div>
                                    <div className="phone-result-caps">
                                        {num.capabilities.voice && <span className="phone-cap-badge">Voice</span>}
                                        {num.capabilities.sms && <span className="phone-cap-badge">SMS</span>}
                                    </div>
                                    <button
                                        className="btn-brand phone-buy-btn"
                                        onClick={() => handlePurchase(num.phoneNumber)}
                                        disabled={!!purchasing}
                                    >
                                        {purchasing === num.phoneNumber
                                            ? <><Loader2 size={14} className="spin" /> Buying…</>
                                            : <><Plus size={14} /> Buy</>}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}


                </div>
            )}

            {/* ═══════ USAGE & CALL LOGS ═══════ */}
            {activeSection === 'usage' && (
                <div className="phone-section">
                    {/* Stats Cards */}
                    {usageStats && (
                        <div className="phone-stats-grid">
                            <div className="phone-stat-card">
                                <div className="phone-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                                    <PhoneCall size={20} />
                                </div>
                                <div className="phone-stat-data">
                                    <span className="phone-stat-value">{usageStats.totalCalls}</span>
                                    <span className="phone-stat-label">Total Calls</span>
                                </div>
                            </div>
                            <div className="phone-stat-card">
                                <div className="phone-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                                    <Clock size={20} />
                                </div>
                                <div className="phone-stat-data">
                                    <span className="phone-stat-value">{usageStats.totalMinutes}</span>
                                    <span className="phone-stat-label">Total Minutes</span>
                                </div>
                            </div>
                            <div className="phone-stat-card">
                                <div className="phone-stat-icon" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
                                    <PhoneIncoming size={20} />
                                </div>
                                <div className="phone-stat-data">
                                    <span className="phone-stat-value">{usageStats.inboundCalls}</span>
                                    <span className="phone-stat-label">Inbound</span>
                                </div>
                            </div>
                            <div className="phone-stat-card">
                                <div className="phone-stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                                    <PhoneMissed size={20} />
                                </div>
                                <div className="phone-stat-data">
                                    <span className="phone-stat-value">{usageStats.missedCalls}</span>
                                    <span className="phone-stat-label">Missed</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Call Logs Table */}
                    <div className="phone-logs-section">
                        <div className="phone-logs-header">
                            <h4><PhoneCall size={16} /> Recent Call Activity</h4>
                            <button className="btn-outline" onClick={() => { fetchCallLogs(); fetchUsage(); }}>
                                <RefreshCcw size={14} /> Refresh
                            </button>
                        </div>

                        {callLogs.length === 0 ? (
                            <div className="phone-empty-state" style={{ padding: 'var(--space-8)' }}>
                                <PhoneCall size={32} strokeWidth={1.5} />
                                <p>No call activity yet. Calls will appear here once your numbers are active and receiving calls.</p>
                            </div>
                        ) : (
                            <div className="data-table-wrapper" style={{ overflowX: 'auto', width: '100%' }}>
                                <table className="data-table" style={{ minWidth: '650px' }}>
                                    <thead>
                                        <tr>
                                            <th>Time</th>
                                            <th>Direction</th>
                                            <th>From</th>
                                            <th>To</th>
                                            <th>Duration</th>
                                            <th>Status</th>
                                            <th>Recording</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {callLogs.map(log => (
                                            <tr key={log.id}>
                                                <td>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                        <span style={{ fontSize: 'var(--font-size-sm)' }}>{formatDate(log.created_at)}</span>
                                                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{formatTime(log.created_at)}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`phone-direction-badge ${log.direction}`}>
                                                        {log.direction === 'inbound' ? <PhoneIncoming size={12} /> : <PhoneOutgoing size={12} />}
                                                        {log.direction === 'inbound' ? 'In' : 'Out'}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-mono, monospace)' }}>
                                                    {formatPhoneDisplay(log.from_number)}
                                                </td>
                                                <td style={{ fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-mono, monospace)' }}>
                                                    {formatPhoneDisplay(log.to_number)}
                                                </td>
                                                <td style={{ fontSize: 'var(--font-size-sm)' }}>
                                                    {formatDuration(log.duration_seconds)}
                                                </td>
                                                <td>
                                                    <span className={`phone-call-status ${log.status}`}>
                                                        {CALL_STATUS_LABELS[log.status] || log.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    {log.recording_url ? (
                                                        <a href={log.recording_url} target="_blank" rel="noopener noreferrer" className="phone-recording-link">
                                                            <Mic size={12} /> Play
                                                        </a>
                                                    ) : (
                                                        <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══════ BUNDLE WIZARD MODAL ═══════ */}
            {showBundleModal && (
                <div className="modal-overlay" onClick={() => setShowBundleModal(false)}>
                    <div className="modal-card" style={{ maxWidth: 560, width: '100%' }} onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>
                                    {bundleStep === 1 && 'Select your country and number type'}
                                    {bundleStep === 2 && 'Enter End User Information'}
                                    {bundleStep === 3 && 'Address'}
                                    {bundleStep === 4 && 'Supporting Documents'}
                                </h3>
                                <p style={{ margin: '4px 0 0', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                    {bundleStep === 1 && 'You need to complete a few easy steps to add a bundle'}
                                    {bundleStep === 2 && 'Please enter the contact details for the end user'}
                                    {bundleStep === 3 && 'Must be within United Kingdom. A PO Box is not acceptable.'}
                                    {bundleStep === 4 && 'Upload proof of identity and proof of address to verify end user information.'}
                                </p>
                            </div>
                            <button className="btn-ghost" onClick={() => setShowBundleModal(false)} style={{ padding: 4 }}>
                                <X size={18} />
                            </button>
                        </div>

                        {/* Step indicator */}
                        <div style={{ display: 'flex', gap: 6, marginBottom: 'var(--space-5)' }}>
                            {[1, 2, 3, 4].map(s => (
                                <div key={s} style={{
                                    flex: 1, height: 3, borderRadius: 2,
                                    background: s <= bundleStep ? 'var(--color-primary, #6366f1)' : 'var(--color-border, #e2e8f0)',
                                    transition: 'background 0.2s',
                                }} />
                            ))}
                        </div>

                        {/* Step 1: Country & Type */}
                        {bundleStep === 1 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                                <div>
                                    <label className="smtp-label">Select Country</label>
                                    <div className="phone-search-input-wrap" style={{ marginTop: 6 }}>
                                        <input className="phone-search-input" value="UK" disabled style={{ opacity: 0.7, cursor: 'not-allowed' }} />
                                    </div>
                                </div>
                                <div>
                                    <label className="smtp-label">Select End User Type</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                                        {(['business', 'individual'] as const).map(type => (
                                            <button
                                                key={type}
                                                onClick={() => setBundleForm(f => ({ ...f, endUserType: type }))}
                                                style={{
                                                    padding: '12px 16px',
                                                    border: bundleForm.endUserType === type ? '2px solid var(--brand, #6366f1)' : '1px solid var(--border, #e2e8f0)',
                                                    borderRadius: 'var(--radius-md)',
                                                    background: bundleForm.endUserType === type ? 'rgba(99, 102, 241, 0.04)' : 'var(--surface-1, #fff)',
                                                    color: bundleForm.endUserType === type ? 'var(--brand, #6366f1)' : 'var(--text-primary)',
                                                    fontWeight: bundleForm.endUserType === type ? 600 : 400,
                                                    cursor: 'pointer', textAlign: 'left', fontSize: 'var(--font-size-base)',
                                                }}
                                            >
                                                {type === 'business' ? 'Business' : 'Individual'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="smtp-label">Select Number Type</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                                        {(['local', 'mobile'] as const).map(type => (
                                            <button
                                                key={type}
                                                onClick={() => setBundleForm(f => ({ ...f, numberType: type }))}
                                                style={{
                                                    padding: '12px 16px',
                                                    border: bundleForm.numberType === type ? '2px solid var(--brand, #6366f1)' : '1px solid var(--border, #e2e8f0)',
                                                    borderRadius: 'var(--radius-md)',
                                                    background: bundleForm.numberType === type ? 'rgba(99, 102, 241, 0.04)' : 'var(--surface-1, #fff)',
                                                    color: bundleForm.numberType === type ? 'var(--brand, #6366f1)' : 'var(--text-primary)',
                                                    fontWeight: bundleForm.numberType === type ? 600 : 400,
                                                    cursor: 'pointer', textAlign: 'left', fontSize: 'var(--font-size-base)',
                                                }}
                                            >
                                                {type.charAt(0).toUpperCase() + type.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Individual Info */}
                        {bundleStep === 2 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                                {bundleForm.endUserType === 'business' && (
                                    <div>
                                        <label className="smtp-label">Business Name *</label>
                                        <input className="smtp-input" placeholder="Business Name" value={bundleForm.businessName}
                                            onChange={e => setBundleForm(f => ({ ...f, businessName: e.target.value }))} />
                                        <p style={{ margin: '4px 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                            The registered business name as it appears on official documents.
                                        </p>
                                    </div>
                                )}
                                <div>
                                    <label className="smtp-label">First Name</label>
                                    <input className="smtp-input" placeholder="First Name" value={bundleForm.firstName}
                                        onChange={e => setBundleForm(f => ({ ...f, firstName: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="smtp-label">Last Name</label>
                                    <input className="smtp-input" placeholder="Last Name" value={bundleForm.lastName}
                                        onChange={e => setBundleForm(f => ({ ...f, lastName: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="smtp-label">Contact Email</label>
                                    <input className="smtp-input" type="email" placeholder="Contact Email" value={bundleForm.contactEmail}
                                        onChange={e => setBundleForm(f => ({ ...f, contactEmail: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="smtp-label">Phone Number</label>
                                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                        <select
                                            className="smtp-input"
                                            value={bundleForm.phoneCountryCode}
                                            onChange={e => setBundleForm(f => ({ ...f, phoneCountryCode: e.target.value }))}
                                            style={{ width: 120, flexShrink: 0 }}
                                        >
                                            <option value="+44">+44 (UK)</option>
                                            <option value="+1">+1 (US/CA)</option>
                                            <option value="+353">+353 (IE)</option>
                                            <option value="+33">+33 (FR)</option>
                                            <option value="+49">+49 (DE)</option>
                                            <option value="+34">+34 (ES)</option>
                                            <option value="+39">+39 (IT)</option>
                                            <option value="+61">+61 (AU)</option>
                                        </select>
                                        <input className="smtp-input" placeholder="7973 786037" value={bundleForm.phoneNumber}
                                            onChange={e => setBundleForm(f => ({ ...f, phoneNumber: e.target.value }))}
                                            style={{ flex: 1 }} />
                                    </div>
                                    <p style={{ margin: '4px 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                        A valid phone number where the contact can be reached. The leading 0 will be removed automatically.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Address */}
                        {bundleStep === 3 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                                <div>
                                    <label className="smtp-label">Address Street Line 1</label>
                                    <input className="smtp-input" placeholder="Street address" value={bundleForm.addressStreet}
                                        onChange={e => setBundleForm(f => ({ ...f, addressStreet: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="smtp-label">Address Street Line 2 (optional)</label>
                                    <input className="smtp-input" placeholder="Suite, unit, floor, etc." value={bundleForm.addressStreet2}
                                        onChange={e => setBundleForm(f => ({ ...f, addressStreet2: e.target.value }))} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                                    <div>
                                        <label className="smtp-label">City</label>
                                        <input className="smtp-input" placeholder="City" value={bundleForm.addressCity}
                                            onChange={e => setBundleForm(f => ({ ...f, addressCity: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="smtp-label">Region / County</label>
                                        <input className="smtp-input" placeholder="e.g. Staffordshire" value={bundleForm.addressRegion}
                                            onChange={e => setBundleForm(f => ({ ...f, addressRegion: e.target.value }))} />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                                    <div>
                                        <label className="smtp-label">Postal Code</label>
                                        <input className="smtp-input" placeholder="e.g. B77 2RP" value={bundleForm.addressPostalCode}
                                            onChange={e => setBundleForm(f => ({ ...f, addressPostalCode: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="smtp-label">Country</label>
                                        <input className="smtp-input" value="United Kingdom" disabled style={{ opacity: 0.7 }} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Supporting Documents */}
                        {bundleStep === 4 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                                <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                    To comply with local regulations, we need supporting documentation to verify the end user's identity and address.
                                </p>

                                {/* Proof of Identity */}
                                <div style={{ padding: 'var(--space-4)', border: '1px solid var(--color-border, #e2e8f0)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-raised, #fafafa)' }}>
                                    <label className="smtp-label" style={{ marginBottom: 'var(--space-1)' }}>
                                        Proof of Identity
                                    </label>
                                    <p style={{ margin: '0 0 var(--space-3)', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                        Document must match the first and last name provided
                                    </p>
                                    <div style={{ marginBottom: 'var(--space-3)' }}>
                                        <label className="smtp-label" style={{ fontSize: 'var(--font-size-xs)' }}>Document Type</label>
                                        <select className="smtp-input" value={bundleForm.identityDocType}
                                            onChange={e => setBundleForm(f => ({ ...f, identityDocType: e.target.value }))}>
                                            <option value="government_issued_id">Government-issued ID</option>
                                            <option value="passport">Passport</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="smtp-label" style={{ fontSize: 'var(--font-size-xs)' }}>Upload File</label>
                                        <label style={{
                                            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                                            border: '1px dashed var(--color-border, #e2e8f0)', borderRadius: 'var(--radius-md)',
                                            cursor: 'pointer', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)',
                                            background: 'var(--color-bg-surface, #fff)', transition: 'border-color 0.15s',
                                        }}>
                                            <Upload size={16} />
                                            <span>{identityFile ? identityFile.name : 'Choose file...'}</span>
                                            <input type="file" accept="image/*,.pdf" style={{ display: 'none' }}
                                                onChange={e => setIdentityFile(e.target.files?.[0] || null)} />
                                        </label>
                                    </div>
                                </div>

                                {/* Proof of Address */}
                                <div style={{ padding: 'var(--space-4)', border: '1px solid var(--color-border, #e2e8f0)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-raised, #fafafa)' }}>
                                    <label className="smtp-label" style={{ marginBottom: 'var(--space-1)' }}>
                                        Proof of Address
                                    </label>
                                    <p style={{ margin: '0 0 var(--space-3)', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                        Must be within United Kingdom. Supporting document must be issued in the last year.
                                    </p>
                                    <div style={{ marginBottom: 'var(--space-3)' }}>
                                        <label className="smtp-label" style={{ fontSize: 'var(--font-size-xs)' }}>Document Type</label>
                                        <select className="smtp-input" value={bundleForm.addressDocType}
                                            onChange={e => setBundleForm(f => ({ ...f, addressDocType: e.target.value }))}>
                                            <option value="utility_bill">Utility Bill</option>
                                            <option value="government_issued_id">Government-issued ID</option>
                                            <option value="tax_notice">Tax Notice</option>
                                            <option value="rent_receipt">Rent Receipt</option>
                                            <option value="title_deed">Title Deed</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="smtp-label" style={{ fontSize: 'var(--font-size-xs)' }}>Upload File</label>
                                        <label style={{
                                            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                                            border: '1px dashed var(--color-border, #e2e8f0)', borderRadius: 'var(--radius-md)',
                                            cursor: 'pointer', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)',
                                            background: 'var(--color-bg-surface, #fff)', transition: 'border-color 0.15s',
                                        }}>
                                            <Upload size={16} />
                                            <span>{addressProofFile ? addressProofFile.name : 'Choose file...'}</span>
                                            <input type="file" accept="image/*,.pdf" style={{ display: 'none' }}
                                                onChange={e => setAddressProofFile(e.target.files?.[0] || null)} />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Footer */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-6)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border)' }}>
                            {bundleStep === 1 && (
                                <>
                                    <button className="btn-outline" onClick={() => setShowBundleModal(false)}>Cancel</button>
                                    <button className="btn-brand" onClick={() => setBundleStep(2)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        Next <ChevronRight size={14} />
                                    </button>
                                </>
                            )}
                            {bundleStep === 2 && (
                                <>
                                    <button className="btn-outline" onClick={() => setBundleStep(1)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <ChevronLeft size={14} /> Previous
                                    </button>
                                    <button className="btn-brand" onClick={() => setBundleStep(3)}
                                        disabled={!bundleForm.firstName || !bundleForm.lastName || !bundleForm.contactEmail}
                                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        Next <ChevronRight size={14} />
                                    </button>
                                </>
                            )}
                            {bundleStep === 3 && (
                                <>
                                    <button className="btn-outline" onClick={() => setBundleStep(2)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <ChevronLeft size={14} /> Previous
                                    </button>
                                    <button className="btn-brand" onClick={() => setBundleStep(4)}
                                        disabled={!bundleForm.addressStreet || !bundleForm.addressCity || !bundleForm.addressPostalCode}
                                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        Next <ChevronRight size={14} />
                                    </button>
                                </>
                            )}
                            {bundleStep === 4 && (
                                <>
                                    <button className="btn-outline" onClick={() => setBundleStep(3)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <ChevronLeft size={14} /> Previous
                                    </button>
                                    <button
                                        className="btn-brand"
                                        onClick={handleCreateBundle}
                                        disabled={settingUpCompliance || !identityFile || !addressProofFile}
                                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                    >
                                        {settingUpCompliance ? <><Loader2 size={14} className="spin" /> Submitting…</> : 'Submit'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
