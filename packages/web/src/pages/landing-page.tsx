import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowRight,
    Check,
    BarChart3,
    ShoppingCart,
    Users,
    Package,
    ChevronDown,
    Star,
    Smartphone,
    CreditCard,
    ChefHat,
    Globe,
    Play,
    Menu,
    X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { themes, applyTheme, getSavedTheme, type BrandTheme } from '@/config/theme.config';

// FAQ Accordion
function FAQItem({ question, answer }: { question: string; answer: string }) {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-gray-200">
            <button
                className="w-full py-5 flex items-center justify-between text-left group"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="font-medium text-[var(--brand-heading)] group-hover:text-[var(--brand-primary)] transition-colors">
                    {question}
                </span>
                <ChevronDown className={`w-5 h-5 text-[var(--brand-muted)] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-40 pb-5' : 'max-h-0'}`}>
                <p className="text-[var(--brand-text)] text-sm leading-relaxed">{answer}</p>
            </div>
        </div>
    );
}

export function LandingPage() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [currentTheme, setCurrentTheme] = useState<BrandTheme>(getSavedTheme());
    const [showThemePicker, setShowThemePicker] = useState(false);

    useEffect(() => {
        applyTheme(currentTheme);
    }, [currentTheme]);

    const handleThemeChange = (themeName: string) => {
        const theme = themes[themeName];
        if (!theme) return;
        setCurrentTheme(theme);
        applyTheme(theme);
        localStorage.setItem('brand-theme', JSON.stringify(theme));
    };

    return (
        <div className="min-h-screen" style={{ backgroundColor: 'var(--brand-bg)' }}>
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--brand-bg)]/90 backdrop-blur-lg border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        {/* Logo */}
                        <div className="flex items-center gap-3">
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center"
                                style={{ background: `linear-gradient(135deg, var(--brand-gradient-from), var(--brand-gradient-to))` }}
                            >
                                <span className="text-white font-bold text-lg">T</span>
                            </div>
                            <span className="text-xl font-bold" style={{ color: 'var(--brand-heading)' }}>TILO</span>
                        </div>

                        {/* Desktop Nav */}
                        <div className="hidden md:flex items-center gap-8">
                            {['Fitur', 'Harga', 'Testimoni', 'FAQ'].map((item) => (
                                <a
                                    key={item}
                                    href={`#${item.toLowerCase()}`}
                                    className="text-sm font-medium transition-colors hover:text-[var(--brand-primary)]"
                                    style={{ color: 'var(--brand-text)' }}
                                >
                                    {item}
                                </a>
                            ))}
                        </div>

                        {/* CTA Buttons */}
                        <div className="hidden md:flex items-center gap-3">
                            {/* Theme Picker */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowThemePicker(!showThemePicker)}
                                    className="w-8 h-8 rounded-full border-2 border-white shadow-md"
                                    style={{ background: `linear-gradient(135deg, var(--brand-gradient-from), var(--brand-gradient-to))` }}
                                    title="Ganti Tema"
                                />
                                {showThemePicker && (
                                    <div className="absolute right-0 top-12 bg-white rounded-xl shadow-xl border border-gray-100 p-3 flex gap-2">
                                        {Object.keys(themes).map((name) => {
                                            const t = themes[name];
                                            if (!t) return null;
                                            return (
                                                <button
                                                    key={name}
                                                    onClick={() => { handleThemeChange(name); setShowThemePicker(false); }}
                                                    className="w-8 h-8 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
                                                    style={{ background: `linear-gradient(135deg, ${t.gradientFrom}, ${t.gradientTo})` }}
                                                    title={name}
                                                />
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            <Link to="/login">
                                <Button
                                    variant="ghost"
                                    className="font-medium"
                                    style={{ color: 'var(--brand-text)' }}
                                >
                                    Masuk
                                </Button>
                            </Link>
                            <Link to="/login">
                                <Button
                                    className="text-white font-medium px-6"
                                    style={{
                                        background: `linear-gradient(135deg, var(--brand-gradient-from), var(--brand-gradient-to))`,
                                        borderRadius: 'var(--brand-button-radius)'
                                    }}
                                >
                                    Coba Gratis
                                </Button>
                            </Link>
                        </div>

                        {/* Mobile Menu */}
                        <button
                            className="md:hidden p-2"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu Dropdown */}
                {isMenuOpen && (
                    <div className="md:hidden bg-white border-t border-gray-100 p-4">
                        {['Fitur', 'Harga', 'Testimoni', 'FAQ'].map((item) => (
                            <a
                                key={item}
                                href={`#${item.toLowerCase()}`}
                                className="block py-3 text-gray-600"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                {item}
                            </a>
                        ))}
                        <div className="flex gap-2 mt-4">
                            <Link to="/login" className="flex-1">
                                <Button variant="outline" className="w-full">Masuk</Button>
                            </Link>
                            <Link to="/login" className="flex-1">
                                <Button
                                    className="w-full text-white"
                                    style={{ background: `linear-gradient(135deg, var(--brand-gradient-from), var(--brand-gradient-to))` }}
                                >
                                    Coba Gratis
                                </Button>
                            </Link>
                        </div>
                    </div>
                )}
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        {/* Left - Content */}
                        <div className="space-y-8">
                            <div
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
                                style={{
                                    backgroundColor: 'var(--brand-surface)',
                                    color: 'var(--brand-primary)'
                                }}
                            >
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                #1 POS untuk UMKM Indonesia
                            </div>

                            <h1
                                className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight"
                                style={{ color: 'var(--brand-heading)' }}
                            >
                                Kelola Bisnis Jadi Lebih{' '}
                                <span
                                    className="bg-clip-text text-transparent"
                                    style={{ backgroundImage: `linear-gradient(135deg, var(--brand-gradient-from), var(--brand-gradient-to))` }}
                                >
                                    Mudah
                                </span>
                            </h1>

                            <p
                                className="text-lg sm:text-xl leading-relaxed max-w-xl"
                                style={{ color: 'var(--brand-text)' }}
                            >
                                Platform POS all-in-one untuk restoran, cafe, dan retail.
                                Transaksi cepat, laporan akurat, dan kelola stok real-time.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <Link to="/login">
                                    <Button
                                        size="lg"
                                        className="h-14 px-8 text-white font-semibold text-lg group"
                                        style={{
                                            background: `linear-gradient(135deg, var(--brand-gradient-from), var(--brand-gradient-to))`,
                                            borderRadius: 'var(--brand-button-radius)'
                                        }}
                                    >
                                        Mulai Gratis 14 Hari
                                        <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </Link>
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="h-14 px-8 font-semibold text-lg group"
                                    style={{
                                        borderColor: 'var(--brand-primary)',
                                        color: 'var(--brand-primary)',
                                        borderRadius: 'var(--brand-button-radius)'
                                    }}
                                >
                                    <Play className="mr-2 w-5 h-5" />
                                    Lihat Demo
                                </Button>
                            </div>

                            <div className="flex items-center gap-6 pt-4">
                                <div className="flex -space-x-3">
                                    {[...Array(4)].map((_, i) => (
                                        <div
                                            key={i}
                                            className="w-10 h-10 rounded-full border-2 border-white"
                                            style={{ backgroundColor: `hsl(${i * 40}, 70%, 60%)` }}
                                        />
                                    ))}
                                </div>
                                <div>
                                    <div className="flex items-center gap-1">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                        ))}
                                        <span className="ml-2 font-semibold" style={{ color: 'var(--brand-heading)' }}>4.9</span>
                                    </div>
                                    <p className="text-sm" style={{ color: 'var(--brand-muted)' }}>Dari 50,000+ pengguna</p>
                                </div>
                            </div>
                        </div>

                        {/* Right - Dashboard Preview */}
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
                                    {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
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
                                    {[
                                        { label: 'Transaksi', value: '234' },
                                        { label: 'Pelanggan', value: '156' },
                                        { label: 'Rata-rata', value: 'Rp 79k' },
                                    ].map((stat) => (
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

                            {/* Floating Cards */}
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
                    </div>
                </div>
            </section>

            {/* Trusted By */}
            <section className="py-12 border-y border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <p className="text-center text-sm mb-8" style={{ color: 'var(--brand-muted)' }}>
                        Dipercaya oleh brand-brand terkemuka
                    </p>
                    <div className="flex items-center justify-center gap-8 md:gap-16 flex-wrap opacity-50">
                        {['GoFood', 'GrabFood', 'Tokopedia', 'BCA', 'OVO', 'GoPay'].map((brand) => (
                            <span key={brand} className="text-xl font-bold" style={{ color: 'var(--brand-text)' }}>
                                {brand}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features */}
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
                        {[
                            { icon: ShoppingCart, title: 'Kasir POS', desc: 'Interface kasir yang cepat dan mudah. Dukung barcode, split bill, dan berbagai metode pembayaran.', color: 'blue' },
                            { icon: Package, title: 'Manajemen Stok', desc: 'Pantau inventori real-time di semua outlet. Alert otomatis saat stok menipis.', color: 'emerald' },
                            { icon: BarChart3, title: 'Laporan & Analitik', desc: 'Dashboard insight bisnis yang jelas. Export ke Excel dengan mudah.', color: 'purple' },
                            { icon: Users, title: 'CRM & Loyalty', desc: 'Kelola data pelanggan dan program loyalty untuk meningkatkan retensi.', color: 'pink' },
                            { icon: ChefHat, title: 'Kitchen Display', desc: 'Sistem KDS untuk efisiensi dapur. Tidak ada lagi pesanan tertukar.', color: 'orange' },
                            { icon: Smartphone, title: 'Self-Order QR', desc: 'Pelanggan order sendiri via QR code. Kurangi antrian, tingkatkan efisiensi.', color: 'cyan' },
                            { icon: Globe, title: 'Online Store', desc: 'Toko online terintegrasi dengan POS. Sync produk dan stok otomatis.', color: 'indigo' },
                            { icon: CreditCard, title: 'Multi Payment', desc: 'Terima QRIS, OVO, GoPay, Dana, kartu kredit/debit, dan tunai.', color: 'teal' },
                        ].map((feature, index) => {
                            const defaultColors = { bg: 'bg-blue-50', icon: 'text-blue-600', gradient: 'from-blue-500 to-cyan-400' };
                            const colorMap: Record<string, { bg: string; icon: string; gradient: string }> = {
                                blue: defaultColors,
                                emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', gradient: 'from-emerald-500 to-green-400' },
                                purple: { bg: 'bg-purple-50', icon: 'text-purple-600', gradient: 'from-purple-500 to-pink-400' },
                                pink: { bg: 'bg-pink-50', icon: 'text-pink-600', gradient: 'from-pink-500 to-rose-400' },
                                orange: { bg: 'bg-orange-50', icon: 'text-orange-600', gradient: 'from-orange-500 to-amber-400' },
                                cyan: { bg: 'bg-cyan-50', icon: 'text-cyan-600', gradient: 'from-cyan-500 to-blue-400' },
                                indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', gradient: 'from-indigo-500 to-purple-400' },
                                teal: { bg: 'bg-teal-50', icon: 'text-teal-600', gradient: 'from-teal-500 to-emerald-400' },
                            };
                            const colors = colorMap[feature.color] || defaultColors;
                            return (
                                <div
                                    key={index}
                                    className="p-6 rounded-2xl border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
                                    style={{ backgroundColor: 'var(--brand-card)' }}
                                >
                                    <div className={`relative w-14 h-14 rounded-2xl ${colors.bg} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform overflow-hidden`}>
                                        <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-0 group-hover:opacity-20 transition-opacity`} />
                                        <feature.icon className={`w-7 h-7 ${colors.icon}`} />
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

            {/* Pricing */}
            <section id="harga" className="py-24 px-4 sm:px-6 lg:px-8">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <h2
                            className="text-3xl sm:text-4xl font-bold mb-4"
                            style={{ color: 'var(--brand-heading)' }}
                        >
                            Harga Transparan, Tanpa Biaya Tersembunyi
                        </h2>
                        <p style={{ color: 'var(--brand-text)' }}>
                            Pilih paket yang sesuai dengan skala bisnis Anda
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                name: 'Starter',
                                price: '99.000',
                                desc: 'Untuk bisnis kecil',
                                features: ['1 Outlet', '2 Device', 'Kasir POS', 'Laporan Basic', 'Email Support'],
                                popular: false,
                            },
                            {
                                name: 'Professional',
                                price: '299.000',
                                desc: 'Untuk bisnis berkembang',
                                features: ['5 Outlet', '10 Device', 'Semua Fitur', 'Kitchen Display', 'CRM & Loyalty', 'Priority Support'],
                                popular: true,
                            },
                            {
                                name: 'Enterprise',
                                price: 'Custom',
                                desc: 'Untuk jaringan besar',
                                features: ['Unlimited Outlet', 'Unlimited Device', 'Dedicated Support', 'Custom Integration', 'SLA 99.9%'],
                                popular: false,
                            },
                        ].map((plan, index) => (
                            <div
                                key={index}
                                className={`p-8 rounded-2xl border-2 transition-all hover:shadow-xl ${plan.popular ? 'border-[var(--brand-primary)] scale-105' : 'border-gray-100'
                                    }`}
                                style={{ backgroundColor: 'var(--brand-card)' }}
                            >
                                {plan.popular && (
                                    <div
                                        className="inline-block px-3 py-1 rounded-full text-xs font-semibold text-white mb-4"
                                        style={{ background: `linear-gradient(135deg, var(--brand-gradient-from), var(--brand-gradient-to))` }}
                                    >
                                        Paling Populer
                                    </div>
                                )}
                                <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--brand-heading)' }}>{plan.name}</h3>
                                <p className="text-sm mb-4" style={{ color: 'var(--brand-muted)' }}>{plan.desc}</p>
                                <div className="flex items-baseline gap-1 mb-6">
                                    {plan.price !== 'Custom' && <span style={{ color: 'var(--brand-muted)' }}>Rp</span>}
                                    <span className="text-4xl font-bold" style={{ color: 'var(--brand-heading)' }}>{plan.price}</span>
                                    {plan.price !== 'Custom' && <span style={{ color: 'var(--brand-muted)' }}>/bln</span>}
                                </div>
                                <ul className="space-y-3 mb-8">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="flex items-center gap-3 text-sm">
                                            <Check className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
                                            <span style={{ color: 'var(--brand-text)' }}>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                                <Button
                                    className={`w-full h-12 font-semibold ${plan.popular ? 'text-white' : ''
                                        }`}
                                    style={{
                                        background: plan.popular
                                            ? `linear-gradient(135deg, var(--brand-gradient-from), var(--brand-gradient-to))`
                                            : 'transparent',
                                        border: plan.popular ? 'none' : '2px solid var(--brand-primary)',
                                        color: plan.popular ? 'white' : 'var(--brand-primary)',
                                        borderRadius: 'var(--brand-button-radius)'
                                    }}
                                >
                                    {plan.price === 'Custom' ? 'Hubungi Sales' : 'Mulai Sekarang'}
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Testimonials */}
            <section id="testimoni" className="py-24 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--brand-surface)' }}>
                <div className="max-w-7xl mx-auto">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: 'var(--brand-heading)' }}>
                            Apa Kata Mereka?
                        </h2>
                        <p style={{ color: 'var(--brand-text)' }}>Testimoni dari pengguna TILO</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            { name: 'Andi Wijaya', role: 'Owner, Kopi Nusantara', text: 'Sejak pakai TILO, omset naik 40% karena proses lebih cepat. Support-nya juga responsif!' },
                            { name: 'Sarah Putri', role: 'Manager, Resto Sederhana', text: 'Kitchen display membantu banget. Tidak ada lagi pesanan tertukar, dapur lebih efisien.' },
                            { name: 'Budi Santoso', role: 'CEO, MartKu (15 Cabang)', text: 'Dengan multi-outlet, saya pantau 15 cabang dari 1 dashboard. Worth it!' },
                        ].map((t, index) => (
                            <div
                                key={index}
                                className="p-6 rounded-2xl border border-gray-100"
                                style={{ backgroundColor: 'var(--brand-card)' }}
                            >
                                <div className="flex gap-1 mb-4">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                    ))}
                                </div>
                                <p className="mb-6 leading-relaxed" style={{ color: 'var(--brand-text)' }}>"{t.text}"</p>
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-10 h-10 rounded-full"
                                        style={{ background: `linear-gradient(135deg, var(--brand-gradient-from), var(--brand-gradient-to))` }}
                                    />
                                    <div>
                                        <p className="font-semibold text-sm" style={{ color: 'var(--brand-heading)' }}>{t.name}</p>
                                        <p className="text-xs" style={{ color: 'var(--brand-muted)' }}>{t.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8">
                <div className="max-w-2xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: 'var(--brand-heading)' }}>
                            Pertanyaan Umum
                        </h2>
                    </div>
                    <div>
                        <FAQItem question="Apakah ada biaya setup?" answer="Tidak ada. Langsung daftar dan gunakan tanpa biaya tambahan." />
                        <FAQItem question="Apakah data saya aman?" answer="Ya, kami menggunakan enkripsi SSL 256-bit dan backup harian otomatis." />
                        <FAQItem question="Bisa digunakan offline?" answer="Ya, POS tetap berjalan offline dan sync otomatis saat online." />
                        <FAQItem question="Bagaimana cara hubungi support?" answer="Via live chat, WhatsApp, telepon, atau email. Tim kami siap 24/7." />
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section
                className="py-24 px-4 sm:px-6 lg:px-8"
                style={{ background: `linear-gradient(135deg, var(--brand-gradient-from), var(--brand-gradient-to))` }}
            >
                <div className="max-w-3xl mx-auto text-center text-white">
                    <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                        Siap Tingkatkan Bisnis Anda?
                    </h2>
                    <p className="text-lg opacity-90 mb-8">
                        Mulai gratis 14 hari. Tanpa kartu kredit. Batal kapan saja.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link to="/login">
                            <Button
                                size="lg"
                                className="h-14 px-8 font-semibold text-lg"
                                style={{
                                    backgroundColor: 'white',
                                    color: 'var(--brand-primary)',
                                    borderRadius: 'var(--brand-button-radius)'
                                }}
                            >
                                Mulai Gratis Sekarang
                                <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-16 px-4 sm:px-6 lg:px-8 border-t border-gray-100">
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-4 gap-8 mb-12">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                                    style={{ background: `linear-gradient(135deg, var(--brand-gradient-from), var(--brand-gradient-to))` }}
                                >
                                    <span className="text-white font-bold text-sm">T</span>
                                </div>
                                <span className="font-bold" style={{ color: 'var(--brand-heading)' }}>TILO</span>
                            </div>
                            <p className="text-sm" style={{ color: 'var(--brand-muted)' }}>
                                Solusi POS all-in-one untuk bisnis modern Indonesia.
                            </p>
                        </div>
                        {[
                            { title: 'Produk', links: ['Fitur', 'Harga', 'Hardware'] },
                            { title: 'Perusahaan', links: ['Tentang', 'Karir', 'Blog'] },
                            { title: 'Support', links: ['Help Center', 'FAQ', 'Kontak'] },
                        ].map((col) => (
                            <div key={col.title}>
                                <h4 className="font-semibold mb-4" style={{ color: 'var(--brand-heading)' }}>{col.title}</h4>
                                <ul className="space-y-2 text-sm">
                                    {col.links.map((link) => (
                                        <li key={link}>
                                            <a href="#" className="transition-colors hover:text-[var(--brand-primary)]" style={{ color: 'var(--brand-muted)' }}>
                                                {link}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                    <div className="border-t border-gray-100 pt-8 text-sm text-center" style={{ color: 'var(--brand-muted)' }}>
                        © 2024 TILO. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
}
