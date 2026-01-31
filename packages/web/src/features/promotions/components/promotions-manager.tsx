/**
 * Promotions Manager Component
 * Create and manage promotions/discounts with rules engine
 */

'use client';

import { useState } from 'react';

type PromotionType = 'percentage_discount' | 'fixed_discount' | 'bogo' | 'bundle' | 'happy_hour' | 'birthday';

interface Promotion {
    id: string;
    name: string;
    type: PromotionType;
    isActive: boolean;
    startDate: Date;
    endDate?: Date;
    discountValue?: number;
    usageCount: number;
    revenue: number;
}

interface Props {
    promotions: Promotion[];
    onCreatePromotion: (promo: Partial<Promotion>) => void;
    onToggleStatus: (id: string, isActive: boolean) => void;
    onDeletePromotion: (id: string) => void;
}

const PROMO_TYPES: { type: PromotionType; label: string; icon: string; description: string }[] = [
    { type: 'percentage_discount', label: 'Percentage Off', icon: '%', description: 'Discount by percentage' },
    { type: 'fixed_discount', label: 'Fixed Amount', icon: 'Rp', description: 'Discount fixed amount' },
    { type: 'bogo', label: 'Buy 1 Get 1', icon: '🎁', description: 'Buy X get Y free' },
    { type: 'bundle', label: 'Bundle Deal', icon: '📦', description: 'Special bundle pricing' },
    { type: 'happy_hour', label: 'Happy Hour', icon: '⏰', description: 'Time-based discount' },
    { type: 'birthday', label: 'Birthday', icon: '🎂', description: 'Birthday special' },
];

export function PromotionsManager({ promotions, onCreatePromotion, onToggleStatus, onDeletePromotion }: Props) {
    const [showCreate, setShowCreate] = useState(false);
    const [selectedType, setSelectedType] = useState<PromotionType>('percentage_discount');
    const [formData, setFormData] = useState({ name: '', discountValue: 10, startDate: '', endDate: '' });

    const activeCount = promotions.filter(p => p.isActive).length;
    const totalRevenue = promotions.reduce((sum, p) => sum + p.revenue, 0);

    const handleCreate = () => {
        onCreatePromotion({
            name: formData.name,
            type: selectedType,
            discountValue: formData.discountValue,
            startDate: new Date(formData.startDate),
            endDate: formData.endDate ? new Date(formData.endDate) : undefined,
            isActive: true,
        });
        setShowCreate(false);
        setFormData({ name: '', discountValue: 10, startDate: '', endDate: '' });
    };

    return (
        <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: 4 }}>🎁 Promotions</h1>
                    <p style={{ color: '#64748b' }}>Create and manage discounts & offers</p>
                </div>
                <button onClick={() => setShowCreate(true)} style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>
                    + New Promotion
                </button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
                <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: 8 }}>TOTAL PROMOTIONS</div>
                    <div style={{ fontSize: '2rem', fontWeight: 700 }}>{promotions.length}</div>
                </div>
                <div style={{ background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: 16, padding: 20, color: 'white' }}>
                    <div style={{ fontSize: '0.75rem', opacity: 0.9, marginBottom: 8 }}>ACTIVE NOW</div>
                    <div style={{ fontSize: '2rem', fontWeight: 700 }}>{activeCount}</div>
                </div>
                <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: 8 }}>PROMO REVENUE</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>Rp {totalRevenue.toLocaleString()}</div>
                </div>
            </div>

            {/* Create Modal */}
            {showCreate && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div style={{ background: 'white', borderRadius: 20, padding: 32, width: '90%', maxWidth: 600, maxHeight: '90vh', overflow: 'auto' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 24 }}>Create Promotion</h2>

                        {/* Type Selection */}
                        <div style={{ marginBottom: 24 }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 12 }}>Promotion Type</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                                {PROMO_TYPES.map(pt => (
                                    <button key={pt.type} onClick={() => setSelectedType(pt.type)} style={{ padding: 16, border: selectedType === pt.type ? '2px solid #6366f1' : '2px solid #e2e8f0', borderRadius: 12, background: selectedType === pt.type ? '#f0f0ff' : 'white', cursor: 'pointer', textAlign: 'left' }}>
                                        <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>{pt.icon}</div>
                                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{pt.label}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{pt.description}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Form */}
                        <div style={{ display: 'grid', gap: 16 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 8 }}>Promotion Name</label>
                                <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Weekend Special" style={{ width: '100%', padding: 12, border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.875rem' }} />
                            </div>

                            {(selectedType === 'percentage_discount' || selectedType === 'fixed_discount') && (
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 8 }}>
                                        {selectedType === 'percentage_discount' ? 'Discount (%)' : 'Discount Amount (Rp)'}
                                    </label>
                                    <input type="number" value={formData.discountValue} onChange={e => setFormData({ ...formData, discountValue: parseInt(e.target.value) })} style={{ width: '100%', padding: 12, border: '1px solid #e2e8f0', borderRadius: 8 }} />
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 8 }}>Start Date</label>
                                    <input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} style={{ width: '100%', padding: 12, border: '1px solid #e2e8f0', borderRadius: 8 }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 8 }}>End Date</label>
                                    <input type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} style={{ width: '100%', padding: 12, border: '1px solid #e2e8f0', borderRadius: 8 }} />
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
                            <button onClick={() => setShowCreate(false)} style={{ flex: 1, padding: 14, background: '#f1f5f9', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                            <button onClick={handleCreate} disabled={!formData.name} style={{ flex: 1, padding: 14, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', opacity: formData.name ? 1 : 0.5 }}>Create Promotion</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Promotions List */}
            <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 20 }}>All Promotions</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {promotions.map(promo => (
                        <div key={promo.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, border: '1px solid #e2e8f0', borderRadius: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <div style={{ width: 48, height: 48, borderRadius: 12, background: promo.isActive ? '#dcfce7' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                                    {PROMO_TYPES.find(t => t.type === promo.type)?.icon || '🎁'}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{promo.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                        {PROMO_TYPES.find(t => t.type === promo.type)?.label} • {promo.usageCount} uses
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 600, color: '#6366f1' }}>
                                        {promo.discountValue}{promo.type === 'percentage_discount' ? '%' : ' Rp'}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>discount</div>
                                </div>
                                <button onClick={() => onToggleStatus(promo.id, !promo.isActive)} style={{ padding: '6px 12px', background: promo.isActive ? '#dcfce7' : '#f1f5f9', color: promo.isActive ? '#10b981' : '#64748b', border: 'none', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                                    {promo.isActive ? 'Active' : 'Inactive'}
                                </button>
                                <button onClick={() => onDeletePromotion(promo.id)} style={{ padding: '6px 12px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', borderRadius: 6, fontSize: '0.75rem', cursor: 'pointer' }}>
                                    ✕
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default PromotionsManager;
