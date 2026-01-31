/**
 * Loyalty Dashboard Component
 * Customer loyalty program management UI
 */

'use client';

import { useState } from 'react';

interface LoyaltyTier {
    id: string;
    name: string;
    minPoints: number;
    multiplier: number;
    benefits: string[];
    customerCount: number;
    color: string;
}

interface LoyaltyProgram {
    pointsPerCurrency: number;
    pointValue: number;
    minRedemption: number;
    pointsExpireDays: number;
    enableTiers: boolean;
}

interface LoyaltyStats {
    totalMembers: number;
    activeMembers: number;
    totalPointsIssued: number;
    totalPointsRedeemed: number;
    redemptionRate: number;
}

interface Props {
    program: LoyaltyProgram;
    tiers: LoyaltyTier[];
    stats: LoyaltyStats;
    onUpdateProgram: (program: LoyaltyProgram) => void;
    onAddTier: (tier: Omit<LoyaltyTier, 'id' | 'customerCount'>) => void;
    onDeleteTier: (id: string) => void;
}

export function LoyaltyDashboard({ program, tiers, stats, onUpdateProgram, onAddTier, onDeleteTier }: Props) {
    const [activeTab, setActiveTab] = useState<'overview' | 'tiers' | 'settings'>('overview');
    const [showAddTier, setShowAddTier] = useState(false);
    const [newTier, setNewTier] = useState({ name: '', minPoints: 0, multiplier: 1, benefits: [] as string[], color: '#6366f1' });

    const handleAddTier = () => {
        onAddTier(newTier);
        setNewTier({ name: '', minPoints: 0, multiplier: 1, benefits: [], color: '#6366f1' });
        setShowAddTier(false);
    };

    return (
        <div className="loyalty-dashboard" style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>⭐ Loyalty Program</h1>
                <div style={{ display: 'flex', gap: 8, padding: 4, background: '#f1f5f9', borderRadius: 10 }}>
                    {(['overview', 'tiers', 'settings'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                padding: '10px 20px',
                                border: 'none',
                                background: activeTab === tab ? 'white' : 'transparent',
                                borderRadius: 8,
                                fontWeight: 500,
                                color: activeTab === tab ? '#6366f1' : '#64748b',
                                cursor: 'pointer',
                                boxShadow: activeTab === tab ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                            }}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
                <div style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 16, padding: 20, color: 'white' }}>
                    <div style={{ fontSize: '0.75rem', opacity: 0.9, marginBottom: 8 }}>TOTAL MEMBERS</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{stats.totalMembers.toLocaleString()}</div>
                </div>
                <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 8 }}>ACTIVE MEMBERS</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{stats.activeMembers.toLocaleString()}</div>
                </div>
                <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 8 }}>POINTS ISSUED</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{stats.totalPointsIssued.toLocaleString()}</div>
                </div>
                <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 8 }}>REDEMPTION RATE</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{stats.redemptionRate.toFixed(1)}%</div>
                </div>
            </div>

            {/* Tiers Tab */}
            {activeTab === 'tiers' && (
                <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                        <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Manage Tiers</h2>
                        <button onClick={() => setShowAddTier(true)} style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 500, cursor: 'pointer' }}>
                            + Add Tier
                        </button>
                    </div>

                    {showAddTier && (
                        <div style={{ background: '#f8fafc', borderRadius: 12, padding: 20, marginBottom: 20 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <input placeholder="Tier Name" value={newTier.name} onChange={e => setNewTier({ ...newTier, name: e.target.value })} style={{ padding: 12, border: '1px solid #e2e8f0', borderRadius: 8 }} />
                                <input type="number" placeholder="Min Points" value={newTier.minPoints} onChange={e => setNewTier({ ...newTier, minPoints: parseInt(e.target.value) })} style={{ padding: 12, border: '1px solid #e2e8f0', borderRadius: 8 }} />
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                                <button onClick={handleAddTier} style={{ padding: '8px 16px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 8 }}>Add</button>
                                <button onClick={() => setShowAddTier(false)} style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: 8 }}>Cancel</button>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                        {tiers.map(tier => (
                            <div key={tier.id} style={{ border: '2px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 10, background: `${tier.color}20`, color: tier.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                                        {tier.name.charAt(0)}
                                    </div>
                                    <span style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: 'white', padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 }}>
                                        {tier.multiplier}x
                                    </span>
                                </div>
                                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 4 }}>{tier.name}</h3>
                                <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: 12 }}>Min. {tier.minPoints.toLocaleString()} pts</p>
                                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>👥 {tier.customerCount} customers</div>
                                <button onClick={() => onDeleteTier(tier.id)} style={{ marginTop: 12, padding: '6px 12px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', borderRadius: 6, fontSize: '0.75rem', cursor: 'pointer' }}>
                                    Delete
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
                <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 20 }}>Program Settings</h2>
                    <div style={{ display: 'grid', gap: 20, maxWidth: 500 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 8 }}>Points per Rp 10,000</label>
                            <input type="number" value={program.pointsPerCurrency} onChange={e => onUpdateProgram({ ...program, pointsPerCurrency: parseInt(e.target.value) })} style={{ width: '100%', padding: 12, border: '1px solid #e2e8f0', borderRadius: 8 }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 8 }}>Point Value (Rp)</label>
                            <input type="number" value={program.pointValue} onChange={e => onUpdateProgram({ ...program, pointValue: parseInt(e.target.value) })} style={{ width: '100%', padding: 12, border: '1px solid #e2e8f0', borderRadius: 8 }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 8 }}>Min Redemption</label>
                            <input type="number" value={program.minRedemption} onChange={e => onUpdateProgram({ ...program, minRedemption: parseInt(e.target.value) })} style={{ width: '100%', padding: 12, border: '1px solid #e2e8f0', borderRadius: 8 }} />
                        </div>
                        <button style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
                            Save Settings
                        </button>
                    </div>
                </div>
            )}

            {/* Overview Tab - Tier Cards */}
            {activeTab === 'overview' && (
                <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 20 }}>Tier Distribution</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                        {tiers.map(tier => (
                            <div key={tier.id} style={{ border: '2px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                                    <div style={{ width: 48, height: 48, borderRadius: 12, background: `${tier.color}20`, color: tier.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                                        {tier.name.charAt(0)}
                                    </div>
                                    <span style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: 'white', padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, height: 'fit-content' }}>
                                        {tier.multiplier}x Points
                                    </span>
                                </div>
                                <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>{tier.name}</h3>
                                <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Min. {tier.minPoints.toLocaleString()} points</p>
                                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e2e8f0', fontSize: '0.875rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span>👥</span>
                                    <span>{tier.customerCount.toLocaleString()} customers</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default LoyaltyDashboard;
