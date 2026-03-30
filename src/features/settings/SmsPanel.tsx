import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAlert } from '@/components/ui/AlertDialog';
import { MessageSquare, CheckCircle2, XCircle, AlertTriangle, Loader2, Save, Send, Edit2 } from 'lucide-react';

const CREDIT_PACKAGES = [
    { credits: 50, pricePence: 500, label: '50 credits', price: '£5.00' },
    { credits: 100, pricePence: 1000, label: '100 credits', price: '£10.00' },
    { credits: 250, pricePence: 2500, label: '250 credits', price: '£25.00' },
    { credits: 500, pricePence: 5000, label: '500 credits', price: '£50.00' },
];

export function SmsPanel() {
    const { showAlert } = useAlert();
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [loading, setLoading] = useState(true);
    
    // Form and Balance Data
    const [profileId, setProfileId] = useState<string | null>(null);
    const [balance, setBalance] = useState(0);
    const [form, setForm] = useState({
        sms_enabled: false,
        sms_sender_name: '',
        sms_from_number: '',
    });
    
    // Purchases and Test
    const [purchases, setPurchases] = useState<any[]>([]);
    const [loadingPurchases, setLoadingPurchases] = useState(true);
    const [testPhone, setTestPhone] = useState('');
    const [sendingTest, setSendingTest] = useState(false);
    const [buyingCredits, setBuyingCredits] = useState(false);

    // Templates
    const [templates, setTemplates] = useState<any[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(true);
    const [savingTemplate, setSavingTemplate] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            const { data } = await supabase
                .from('business_profile')
                .select('id, sms_enabled, sms_sender_name, sms_from_number, sms_credits_balance')
                .limit(1)
                .single();
                
            if (data) {
                setProfileId(data.id);
                setBalance(data.sms_credits_balance || 0);
                setForm({
                    sms_enabled: !!data.sms_enabled,
                    sms_sender_name: data.sms_sender_name || '',
                    sms_from_number: data.sms_from_number || '',
                });
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchPurchases = async () => {
        setLoadingPurchases(true);
        try {
            const { data } = await supabase
                .from('sms_credit_purchases')
                .select('*')
                .eq('status', 'completed')
                .order('created_at', { ascending: false })
                .limit(20);
            setPurchases(data || []);
        } catch (err) {
            console.error('Error fetching purchases:', err);
        } finally {
            setLoadingPurchases(false);
        }
    };

    const fetchTemplates = async () => {
        setLoadingTemplates(true);
        try {
            const { data } = await supabase
                .from('sms_templates')
                .select('*')
                .order('created_at', { ascending: true });
            setTemplates(data || []);
        } catch (err) {
            console.error('Error fetching templates:', err);
        } finally {
            setLoadingTemplates(false);
        }
    };

    const handleSaveTemplate = async (template: any) => {
        setSavingTemplate(template.id);
        try {
            const { error } = await supabase
                .from('sms_templates')
                .update({ body: template.body, active: template.active, updated_at: new Date().toISOString() })
                .eq('id', template.id);
            if (error) throw error;
            showAlert({ title: 'Saved', message: `Template "${template.name}" updated`, variant: 'success' });
        } catch (err: any) {
            showAlert({ title: 'Error', message: err.message || 'Failed to save template', variant: 'danger' });
        } finally {
            setSavingTemplate(null);
        }
    };

    const updateTemplate = (id: string, field: string, value: any) => {
        setTemplates(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
    };

    useEffect(() => {
        fetchData();
        fetchPurchases();
        fetchTemplates();

        // Check if returning from Stripe purchase
        const params = new URLSearchParams(window.location.search);
        if (params.get('purchase') === 'success') {
            showAlert({ title: 'Success', message: 'SMS credits purchased successfully!', variant: 'success' });
            // Clean up URL
            window.history.replaceState({}, '', window.location.pathname);
            fetchData();
        }
    }, [showAlert]);

    const updateField = (field: string, value: any) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setDirty(true);
    };

    const handleSave = async () => {
        const name = form.sms_sender_name.trim();
        if (name && (name.length > 11 || !/^[a-zA-Z0-9 ]+$/.test(name))) {
            showAlert({ title: 'Invalid Name', message: 'Sender name must be 1-11 alphanumeric characters.', variant: 'warning' });
            return;
        }

        setSaving(true);
        try {
            const payload = {
                sms_enabled: form.sms_enabled,
                sms_sender_name: name,
                sms_from_number: form.sms_from_number.trim(),
            };

            if (profileId) {
                const { error } = await supabase.from('business_profile').update(payload).eq('id', profileId);
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from('business_profile').insert(payload).select().single();
                if (error) throw error;
                if (data) setProfileId(data.id);
            }
            
            showAlert({ title: 'Saved', message: 'SMS settings saved', variant: 'success' });
            setDirty(false);
            await fetchData();
        } catch (err: any) {
            showAlert({ title: 'Error', message: err.message || 'Failed to save settings', variant: 'danger' });
        } finally {
            setSaving(false);
        }
    };

    const handleBuyCredits = async (credits: number) => {
        setBuyingCredits(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sms-credits`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token}`,
                    },
                    body: JSON.stringify({
                        action: 'createCheckout',
                        credits,
                        successUrl: `${window.location.origin}/settings?tab=sms&purchase=success`,
                        cancelUrl: `${window.location.origin}/settings?tab=sms&purchase=cancelled`,
                    }),
                }
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create checkout');
            window.location.href = data.checkoutUrl;
        } catch (err: any) {
            showAlert({ title: 'Error', message: err.message || 'Failed to start purchase', variant: 'danger' });
            setBuyingCredits(false);
        }
    };

    const handleSendTest = async () => {
        if (!testPhone.trim()) {
            showAlert({ title: 'Missing Field', message: 'Enter a phone number to send a test SMS', variant: 'warning' });
            return;
        }
        setSendingTest(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sms`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token}`,
                    },
                    body: JSON.stringify({ action: 'test', phone: testPhone.trim() }),
                }
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to send test SMS');
            showAlert({ title: 'Sent!', message: `Test SMS sent! Credits remaining: ${data.creditsRemaining}`, variant: 'success' });
            await fetchData();
        } catch (err: any) {
            showAlert({ title: 'Error', message: err.message || 'Failed to send test SMS', variant: 'danger' });
        } finally {
            setSendingTest(false);
        }
    };

    if (loading) {
        return (
            <>
                <div className="settings-panel-head">
                    <h3>SMS Notifications</h3>
                    <p className="settings-panel-desc">Loading SMS settings...</p>
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
                <h3>SMS Notifications</h3>
                <p className="settings-panel-desc">
                    Manage your SMS settings, send test messages, and purchase credits.
                </p>
            </div>

            {/* Status Integration Card */}
            <div className={`settings-integration-card ${form.sms_enabled ? 'connected' : ''}`}>
                <div className="settings-integration-icon">
                    <MessageSquare size={24} />
                </div>
                <div className="settings-integration-info">
                    <h4>{balance} Credits Remaining</h4>
                    <p>{form.sms_enabled ? 'SMS active for order notifications' : 'SMS notifications are paused'}</p>
                </div>
                <div className="settings-integration-action">
                    {form.sms_enabled 
                        ? <span className="badge badge-confirmed"><CheckCircle2 size={12} /> Enabled</span>
                        : <span className="badge badge-warning"><XCircle size={12} /> Disabled</span>}
                </div>
            </div>

            {/* Low credit warning banner */}
            {balance <= 10 && balance > 0 && (
                <div className="smtp-info-box" style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)', borderColor: 'rgba(234, 179, 8, 0.3)', color: '#a16207' }}>
                    <AlertTriangle size={16} />
                    <span><strong>Low credits!</strong> You have {balance} SMS credit{balance !== 1 ? 's' : ''} remaining. Top up to avoid missing notifications.</span>
                </div>
            )}
            {balance === 0 && form.sms_enabled && (
                <div className="smtp-info-box" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#b91c1c' }}>
                    <XCircle size={16} />
                    <span><strong>No credits remaining.</strong> SMS notifications are paused. Purchase credits to resume.</span>
                </div>
            )}

            {/* Config Section */}
            <div className="settings-section">
                <div className="settings-section-title">Configuration</div>
                <div className="smtp-field">
                    <label className="smtp-checkbox-label" style={{ fontWeight: 600 }}>
                        <input
                            type="checkbox"
                            checked={form.sms_enabled}
                            onChange={(e) => updateField('sms_enabled', e.target.checked)}
                        />
                        Enable SMS Notifications
                    </label>
                    <p style={{ margin: '4px 0 16px 24px', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                        When enabled, SMS will be automatically sent for order confirmations and refunds.
                    </p>
                </div>

                <div className="smtp-field-row">
                    <div className="smtp-field">
                        <label className="smtp-field-label">Sender Name / ID</label>
                        <input
                            className="smtp-field-input"
                            value={form.sms_sender_name}
                            onChange={e => updateField('sms_sender_name', e.target.value)}
                            placeholder="Isobex CRM"
                            maxLength={11}
                        />
                        <p style={{ marginTop: 4, fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                            {(form.sms_sender_name || '').length}/11 characters — letters and numbers only.
                        </p>
                    </div>
                </div>

                <div className="settings-form-actions">
                    <button
                        className="btn-brand"
                        onClick={handleSave}
                        disabled={saving || !dirty}
                    >
                        {saving ? <><Loader2 size={16} className="spin" /> Saving…</> : <><Save size={16} /> Save Changes</>}
                    </button>
                </div>
            </div>

            <hr className="divider" style={{ margin: 'var(--space-8) 0', borderTop: '1px solid var(--border-color)' }} />

            {/* Buy Credits Section */}
            <div className="settings-section">
                <div className="settings-section-title">Buy SMS Credits</div>
                
                <div className="sms-credit-packages">
                    {CREDIT_PACKAGES.map(pkg => {
                        const isPopular = pkg.credits === 250;
                        return (
                            <div key={pkg.credits} className={`sms-package-card ${isPopular ? 'popular' : ''}`}>
                                {isPopular && <span className="sms-package-badge">Best Value</span>}
                                <div className="sms-package-credits">{pkg.credits}</div>
                                <div className="sms-package-label">credits</div>
                                <div className="sms-package-price">{pkg.price}</div>
                                <button
                                    className={`btn sms-package-button ${isPopular ? 'btn-brand' : 'btn-outline'}`}
                                    onClick={() => handleBuyCredits(pkg.credits)}
                                    disabled={buyingCredits}
                                >
                                    {buyingCredits ? <Loader2 size={14} className="spin" /> : 'Buy'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            <hr className="divider" style={{ margin: 'var(--space-8) 0', borderTop: '1px solid var(--border-color)' }} />

            {/* Message Templates */}
            <div className="settings-section">
                <div className="settings-section-title">
                    <Edit2 size={16} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
                    Message Templates
                </div>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
                    Customise the SMS messages sent for each event. Use merge tags: <code style={{ background: 'var(--bg-muted)', padding: '1px 5px', borderRadius: 4, fontSize: '0.75rem' }}>{'{{customer_name}}'}</code> <code style={{ background: 'var(--bg-muted)', padding: '1px 5px', borderRadius: 4, fontSize: '0.75rem' }}>{'{{order_number}}'}</code> <code style={{ background: 'var(--bg-muted)', padding: '1px 5px', borderRadius: 4, fontSize: '0.75rem' }}>{'{{business_name}}'}</code>
                </p>

                {loadingTemplates ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-4)' }}>
                        <Loader2 className="loading-spinner" size={20} />
                    </div>
                ) : templates.length === 0 ? (
                    <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)' }}>
                        <p>No templates found. Check your database migration.</p>
                    </div>
                ) : (
                    <div className="sms-template-container">
                        {templates.map(tpl => {
                            const previewText = tpl.body
                                .replace(/{{customer_name}}/gi, 'Sarah Smith')
                                .replace(/{{order_number}}/gi, '#10492')
                                .replace(/{{business_name}}/gi, form.sms_sender_name || 'Isobex');
                            
                            const len = previewText.length;
                            const segments = len === 0 ? 0 : (len <= 160 ? 1 : Math.ceil(len / 153));
                            const creditText = segments === 1 ? '1 credit' : `${segments} credits`;

                            return (
                                <div key={tpl.id} className="sms-template-row">
                                    <div className="sms-template-editor">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                                            <div>
                                                <strong style={{ fontSize: 'var(--font-size-md)' }}>{tpl.name}</strong>
                                                {tpl.system_key && (
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 12, background: 'var(--bg-raised)', padding: '2px 8px', borderRadius: 12, fontWeight: 600, border: '1px solid var(--border-color)' }}>
                                                        {tpl.system_key}
                                                    </span>
                                                )}
                                            </div>
                                            <label className="smtp-checkbox-label" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>
                                                <input
                                                    type="checkbox"
                                                    checked={tpl.active}
                                                    onChange={(e) => updateTemplate(tpl.id, 'active', e.target.checked)}
                                                />
                                                Active
                                            </label>
                                        </div>
                                        <textarea
                                            className="smtp-field-input"
                                            value={tpl.body}
                                            onChange={(e) => updateTemplate(tpl.id, 'body', e.target.value)}
                                            rows={5}
                                            style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit', fontSize: 'var(--font-size-md)' }}
                                            placeholder="Write your SMS message..."
                                        />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-4)' }}>
                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                                                {previewText.length} characters • <strong style={{color: 'var(--color-primary)'}}>Est. {segments} segment{segments !== 1 ? 's' : ''} ({creditText})</strong>
                                            </div>
                                            <button
                                                className="btn-brand"
                                                onClick={() => handleSaveTemplate(tpl)}
                                                disabled={savingTemplate === tpl.id}
                                            >
                                                {savingTemplate === tpl.id
                                                    ? <><Loader2 size={14} className="spin" /> Saving…</>
                                                    : <><Save size={14} /> Save Template</>}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Simulated Phone Mockup */}
                                    <div className="sms-phone-mockup">
                                        <div className="sms-phone-header">
                                            <div className="sms-phone-notch"></div>
                                        </div>
                                        <div className="sms-phone-body">
                                            <div className="sms-bubble">
                                                {previewText}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Send Test SMS */}
            <div className="settings-section">
                <div className="settings-section-title">Send Test SMS</div>
                <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                    <div className="smtp-field" style={{ flex: 1, margin: 0 }}>
                        <input
                            className="smtp-field-input"
                            value={testPhone}
                            onChange={e => setTestPhone(e.target.value)}
                            placeholder="Phone Number (e.g. +44 7700 900123)"
                        />
                    </div>
                    <button
                        className="btn-outline"
                        onClick={handleSendTest}
                        disabled={sendingTest || !testPhone.trim() || balance < 1}
                    >
                        {sendingTest
                            ? <><Loader2 size={14} className="spin" /> Sending…</>
                            : <><Send size={14} /> Send Test SMS</>}
                    </button>
                </div>
                {balance < 1 && (
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>You need credits to send a test SMS.</p>
                )}
            </div>

            {/* Purchase History */}
            <div className="settings-section">
                <div className="settings-section-title">Purchase History</div>
                {loadingPurchases ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-4)' }}>
                        <Loader2 className="loading-spinner" size={20} />
                    </div>
                ) : purchases.length === 0 ? (
                    <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)' }}>
                        <MessageSquare size={24} style={{ opacity: 0.5, margin: '0 auto var(--space-2)' }} />
                        <p>No purchases yet. Buy credits above to get started.</p>
                    </div>
                ) : (
                    <div className="data-table-wrapper" style={{ overflowX: 'auto', width: '100%' }}>
                        <table className="data-table" style={{ minWidth: '500px' }}>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Credits</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {purchases.map(p => (
                                    <tr key={p.id}>
                                        <td>{new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                                        <td><strong>{p.credits_purchased}</strong></td>
                                        <td>£{(p.amount_paid_pence / 100).toFixed(2)}</td>
                                        <td><span className="badge badge-success">{p.status}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}
