/**
 * Device Management Component
 * Monitor and manage POS devices
 */

'use client';

import { useState, useEffect } from 'react';

type DeviceType = 'tablet' | 'phone' | 'desktop' | 'kds_display';
type Platform = 'android' | 'ios' | 'windows' | 'web';

interface Device {
    id: string;
    name: string;
    deviceType: DeviceType;
    platform: Platform;
    outletName?: string;
    isOnline: boolean;
    isPaired: boolean;
    isBlocked: boolean;
    appVersion: string;
    lastActiveAt: Date;
    batteryLevel?: number;
}

interface Props {
    devices: Device[];
    onPairDevice: (id: string, outletId: string) => void;
    onUnpairDevice: (id: string) => void;
    onBlockDevice: (id: string) => void;
    onUnblockDevice: (id: string) => void;
    onRemoteWipe: (id: string) => void;
}

const DEVICE_ICONS: Record<DeviceType, string> = {
    tablet: '📱',
    phone: '📲',
    desktop: '🖥️',
    kds_display: '🖥️',
};

const timeSince = (date: Date, now: number): string => {
    const mins = Math.floor((now - new Date(date).getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
};

export function DeviceManagement({ devices, onPairDevice, onUnpairDevice, onBlockDevice, onUnblockDevice, onRemoteWipe }: Props) {
    const [filter, setFilter] = useState<'all' | 'online' | 'offline' | 'blocked'>('all');
    const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
    // Lazy initializer to avoid calling Date.now() during render
    const [now, setNow] = useState(() => Date.now());

    // Update time every minute
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 60000);
        return () => clearInterval(interval);
    }, []);

    const filtered = devices.filter(d => {
        if (filter === 'online') return d.isOnline;
        if (filter === 'offline') return !d.isOnline;
        if (filter === 'blocked') return d.isBlocked;
        return true;
    });

    const onlineCount = devices.filter(d => d.isOnline).length;
    const offlineCount = devices.filter(d => !d.isOnline).length;

    return (
        <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: 4 }}>📟 Device Management</h1>
                <p style={{ color: '#64748b' }}>Monitor and manage your POS devices</p>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: 8 }}>TOTAL DEVICES</div>
                    <div style={{ fontSize: '2rem', fontWeight: 700 }}>{devices.length}</div>
                </div>
                <div style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', borderRadius: 16, padding: 20 }}>
                    <div style={{ fontSize: '0.75rem', opacity: 0.9, marginBottom: 8 }}>ONLINE</div>
                    <div style={{ fontSize: '2rem', fontWeight: 700 }}>{onlineCount}</div>
                </div>
                <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: 8 }}>OFFLINE</div>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b' }}>{offlineCount}</div>
                </div>
                <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: 8 }}>PAIRED</div>
                    <div style={{ fontSize: '2rem', fontWeight: 700 }}>{devices.filter(d => d.isPaired).length}</div>
                </div>
            </div>

            {/* Filter */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {(['all', 'online', 'offline', 'blocked'] as const).map(f => (
                    <button key={f} onClick={() => setFilter(f)} style={{ padding: '8px 16px', border: 'none', borderRadius: 8, background: filter === f ? '#6366f1' : '#f1f5f9', color: filter === f ? 'white' : '#64748b', fontWeight: 500, cursor: 'pointer', textTransform: 'capitalize' }}>
                        {f}
                    </button>
                ))}
            </div>

            {/* Devices List */}
            <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                {filtered.map(device => (
                    <div key={device.id} onClick={() => setSelectedDevice(device)} style={{ display: 'flex', alignItems: 'center', padding: 20, borderBottom: '1px solid #e2e8f0', cursor: 'pointer' }}>
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: device.isOnline ? '#dcfce7' : '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginRight: 16 }}>
                            {DEVICE_ICONS[device.deviceType]}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <span style={{ fontWeight: 600 }}>{device.name}</span>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: device.isOnline ? '#10b981' : '#f59e0b' }} />
                                {device.isBlocked && <span style={{ background: '#fef2f2', color: '#ef4444', padding: '2px 8px', borderRadius: 4, fontSize: '0.625rem', fontWeight: 600 }}>BLOCKED</span>}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                {device.outletName || 'Unpaired'} • {device.platform} • v{device.appVersion}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{timeSince(device.lastActiveAt, now)}</div>
                            {device.batteryLevel !== undefined && (
                                <div style={{ fontSize: '0.75rem', color: device.batteryLevel < 20 ? '#ef4444' : '#64748b' }}>
                                    🔋 {device.batteryLevel}%
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Device Detail Modal */}
            {selectedDevice && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setSelectedDevice(null)}>
                    <div style={{ background: 'white', borderRadius: 20, padding: 32, width: '90%', maxWidth: 500 }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                            <div style={{ width: 64, height: 64, borderRadius: 16, background: selectedDevice.isOnline ? '#dcfce7' : '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                                {DEVICE_ICONS[selectedDevice.deviceType]}
                            </div>
                            <div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 4 }}>{selectedDevice.name}</h2>
                                <p style={{ fontSize: '0.875rem', color: '#64748b' }}>{selectedDevice.platform} • v{selectedDevice.appVersion}</p>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: 8 }}>
                                <span style={{ color: '#64748b' }}>Status</span>
                                <span style={{ fontWeight: 600, color: selectedDevice.isOnline ? '#10b981' : '#f59e0b' }}>{selectedDevice.isOnline ? 'Online' : 'Offline'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: 8 }}>
                                <span style={{ color: '#64748b' }}>Outlet</span>
                                <span style={{ fontWeight: 500 }}>{selectedDevice.outletName || 'Not paired'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: 8 }}>
                                <span style={{ color: '#64748b' }}>Last Active</span>
                                <span style={{ fontWeight: 500 }}>{timeSince(selectedDevice.lastActiveAt, now)}</span>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gap: 12 }}>
                            {selectedDevice.isPaired ? (
                                <button onClick={() => { onUnpairDevice(selectedDevice.id); setSelectedDevice(null); }} style={{ padding: 14, background: '#f1f5f9', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>Unpair Device</button>
                            ) : (
                                <button onClick={() => { onPairDevice(selectedDevice.id, 'outlet1'); setSelectedDevice(null); }} style={{ padding: 14, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>Pair to Outlet</button>
                            )}
                            {selectedDevice.isBlocked ? (
                                <button onClick={() => { onUnblockDevice(selectedDevice.id); setSelectedDevice(null); }} style={{ padding: 14, background: '#dcfce7', color: '#10b981', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>Unblock Device</button>
                            ) : (
                                <button onClick={() => { onBlockDevice(selectedDevice.id); setSelectedDevice(null); }} style={{ padding: 14, background: '#fef3c7', color: '#f59e0b', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>Block Device</button>
                            )}
                            <button onClick={() => { if (confirm('Remote wipe will delete all data. Continue?')) { onRemoteWipe(selectedDevice.id); setSelectedDevice(null); } }} style={{ padding: 14, background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>
                                🗑️ Remote Wipe
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DeviceManagement;
