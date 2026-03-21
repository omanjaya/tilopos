import {
    ShoppingCart,
    Package,
    BarChart3,
    ChefHat,
    type LucideIcon,
} from 'lucide-react';

interface Feature {
    icon: LucideIcon;
    title: string;
    desc: string;
    color: string;
    iconColor: string;
}

const features: Feature[] = [
    { icon: ShoppingCart, title: 'Kasir POS', desc: 'Interface kasir cepat dengan dukungan barcode, split bill, dan berbagai metode pembayaran.', color: 'bg-blue-50', iconColor: 'text-blue-600' },
    { icon: Package, title: 'Manajemen Stok', desc: 'Pantau inventori real-time di semua outlet. Alert otomatis saat stok menipis.', color: 'bg-emerald-50', iconColor: 'text-emerald-600' },
    { icon: BarChart3, title: 'Laporan & Analitik', desc: 'Dashboard insight bisnis yang jelas. Export laporan ke Excel dengan mudah.', color: 'bg-purple-50', iconColor: 'text-purple-600' },
    { icon: ChefHat, title: 'Kitchen Display', desc: 'Sistem KDS untuk efisiensi dapur. Pesanan langsung tampil di layar dapur.', color: 'bg-orange-50', iconColor: 'text-orange-600' },
];

export function FeaturesSection() {
    return (
        <section id="fitur" className="py-20 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--brand-surface)' }}>
            <div className="max-w-5xl mx-auto">
                <div className="text-center max-w-2xl mx-auto mb-14">
                    <h2
                        className="text-3xl sm:text-4xl font-bold mb-3"
                        style={{ color: 'var(--brand-heading)' }}
                    >
                        Semua yang Bisnis Anda Butuhkan
                    </h2>
                    <p style={{ color: 'var(--brand-text)' }}>
                        Fitur lengkap untuk mengelola bisnis dengan lebih efisien
                    </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                    {features.map((feature, index) => {
                        const Icon = feature.icon;
                        return (
                            <div
                                key={index}
                                className="p-6 rounded-2xl border border-gray-100 hover:shadow-lg transition-shadow"
                                style={{ backgroundColor: 'var(--brand-card)' }}
                            >
                                <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4`}>
                                    <Icon className={`w-6 h-6 ${feature.iconColor}`} />
                                </div>
                                <h3
                                    className="text-lg font-semibold mb-2"
                                    style={{ color: 'var(--brand-heading)' }}
                                >
                                    {feature.title}
                                </h3>
                                <p className="text-sm leading-relaxed" style={{ color: 'var(--brand-text)' }}>
                                    {feature.desc}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
