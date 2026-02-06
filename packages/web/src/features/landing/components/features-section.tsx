import {
    BarChart3,
    ShoppingCart,
    Users,
    Package,
    Smartphone,
    CreditCard,
    ChefHat,
    Globe,
    type LucideIcon
} from 'lucide-react';

interface Feature {
    icon: LucideIcon;
    title: string;
    desc: string;
    color: string;
}

const features: Feature[] = [
    { icon: ShoppingCart, title: 'Kasir POS', desc: 'Interface kasir yang cepat dan mudah. Dukung barcode, split bill, dan berbagai metode pembayaran.', color: 'blue' },
    { icon: Package, title: 'Manajemen Stok', desc: 'Pantau inventori real-time di semua outlet. Alert otomatis saat stok menipis.', color: 'emerald' },
    { icon: BarChart3, title: 'Laporan & Analitik', desc: 'Dashboard insight bisnis yang jelas. Export ke Excel dengan mudah.', color: 'purple' },
    { icon: Users, title: 'CRM & Loyalty', desc: 'Kelola data pelanggan dan program loyalty untuk meningkatkan retensi.', color: 'pink' },
    { icon: ChefHat, title: 'Kitchen Display', desc: 'Sistem KDS untuk efisiensi dapur. Tidak ada lagi pesanan tertukar.', color: 'orange' },
    { icon: Smartphone, title: 'Self-Order QR', desc: 'Pelanggan order sendiri via QR code. Kurangi antrian, tingkatkan efisiensi.', color: 'cyan' },
    { icon: Globe, title: 'Online Store', desc: 'Toko online terintegrasi dengan POS. Sync produk dan stok otomatis.', color: 'indigo' },
    { icon: CreditCard, title: 'Multi Payment', desc: 'Terima QRIS, OVO, GoPay, Dana, kartu kredit/debit, dan tunai.', color: 'teal' },
];

type ColorConfig = {
    bg: string;
    icon: string;
    gradient: string;
};

const colorMap: Record<string, ColorConfig> = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600', gradient: 'from-blue-500 to-cyan-400' },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', gradient: 'from-emerald-500 to-green-400' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600', gradient: 'from-purple-500 to-pink-400' },
    pink: { bg: 'bg-pink-50', icon: 'text-pink-600', gradient: 'from-pink-500 to-rose-400' },
    orange: { bg: 'bg-orange-50', icon: 'text-orange-600', gradient: 'from-orange-500 to-amber-400' },
    cyan: { bg: 'bg-cyan-50', icon: 'text-cyan-600', gradient: 'from-cyan-500 to-blue-400' },
    indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', gradient: 'from-indigo-500 to-purple-400' },
    teal: { bg: 'bg-teal-50', icon: 'text-teal-600', gradient: 'from-teal-500 to-emerald-400' },
};

export function FeaturesSection() {
    return (
        <section id="fitur" className="py-24 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--brand-surface)' }}>
            <div className="max-w-7xl mx-auto">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <h2
                        className="text-3xl sm:text-4xl font-bold mb-4"
                        style={{ color: 'var(--brand-heading)' }}
                    >
                        Semua yang Bisnis Anda Butuhkan
                    </h2>
                    <p style={{ color: 'var(--brand-text)' }}>
                        Fitur lengkap untuk mengelola bisnis dengan lebih efisien
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feature, index) => {
                        const defaultColors: ColorConfig = { bg: 'bg-blue-50', icon: 'text-blue-600', gradient: 'from-blue-500 to-cyan-400' };
                        const colors = colorMap[feature.color] || defaultColors;
                        const Icon = feature.icon;

                        return (
                            <div
                                key={index}
                                className="p-6 rounded-2xl border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
                                style={{ backgroundColor: 'var(--brand-card)' }}
                            >
                                <div className={`relative w-14 h-14 rounded-2xl ${colors.bg} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform overflow-hidden`}>
                                    <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-0 group-hover:opacity-20 transition-opacity`} />
                                    <Icon className={`w-7 h-7 ${colors.icon}`} />
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
