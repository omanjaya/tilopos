import { Check } from 'lucide-react';

export function DashboardPreview() {
    const stats = [
        { label: 'Transaksi', value: '234' },
        { label: 'Pelanggan', value: '156' },
        { label: 'Rata-rata', value: 'Rp 79k' },
    ];

    const chartHeights = [40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88];

    return (
        <div className="relative">
            <div
                className="rounded-2xl p-6 shadow-2xl border border-gray-100"
                style={{ backgroundColor: 'var(--brand-card)' }}
            >
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <p className="text-sm" style={{ color: 'var(--brand-muted)' }}>Penjualan Hari Ini</p>
                        <p className="text-3xl font-bold" style={{ color: 'var(--brand-heading)' }}>Rp 18.450.000</p>
                    </div>
                    <div
                        className="px-3 py-1.5 rounded-full text-sm font-medium"
                        style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}
                    >
                        +32% ↑
                    </div>
                </div>

                {/* Chart Bars */}
                <div className="h-40 flex items-end gap-2 mb-6">
                    {chartHeights.map((h, i) => (
                        <div
                            key={i}
                            className="flex-1 rounded-t-md transition-all hover:opacity-80"
                            style={{
                                height: `${h}%`,
                                background: i === 11
                                    ? `linear-gradient(180deg, var(--brand-gradient-from), var(--brand-gradient-to))`
                                    : 'var(--brand-surface)'
                            }}
                        />
                    ))}
                </div>

                <div className="grid grid-cols-3 gap-4">
                    {stats.map((stat) => (
                        <div
                            key={stat.label}
                            className="p-4 rounded-xl text-center"
                            style={{ backgroundColor: 'var(--brand-surface)' }}
                        >
                            <p className="text-xl font-bold" style={{ color: 'var(--brand-heading)' }}>{stat.value}</p>
                            <p className="text-sm" style={{ color: 'var(--brand-muted)' }}>{stat.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Floating Card */}
            <div
                className="absolute -left-8 top-1/3 p-4 rounded-xl shadow-lg border border-gray-100 animate-bounce"
                style={{ backgroundColor: 'var(--brand-card)', animationDuration: '3s' }}
            >
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}
                    >
                        <Check className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--brand-heading)' }}>Pembayaran Berhasil</p>
                        <p className="text-lg font-bold" style={{ color: 'var(--brand-primary)' }}>Rp 485.000</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
