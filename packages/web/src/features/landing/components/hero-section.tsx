import { Link } from 'react-router-dom';
import { ArrowRight, Star, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardPreview } from './dashboard-preview';

export function HeroSection() {
    return (
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
                    <DashboardPreview />
                </div>
            </div>
        </section>
    );
}
