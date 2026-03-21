import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function HeroSection() {
    return (
        <section className="pt-28 pb-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
                <h1
                    className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6"
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
                    className="text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto mb-10"
                    style={{ color: 'var(--brand-text)' }}
                >
                    Platform POS all-in-one untuk restoran, cafe, dan retail.
                    Transaksi cepat, laporan akurat, dan kelola stok real-time.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link to="/register">
                        <Button
                            size="lg"
                            className="h-13 px-8 text-white font-semibold text-lg group"
                            style={{
                                background: `linear-gradient(135deg, var(--brand-gradient-from), var(--brand-gradient-to))`,
                                borderRadius: 'var(--brand-button-radius)'
                            }}
                        >
                            Daftar Gratis
                            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </Link>
                    <Link to="/login">
                        <Button
                            size="lg"
                            variant="outline"
                            className="h-13 px-8 font-semibold text-lg"
                            style={{
                                borderColor: 'var(--brand-primary)',
                                color: 'var(--brand-primary)',
                                borderRadius: 'var(--brand-button-radius)'
                            }}
                        >
                            Masuk
                        </Button>
                    </Link>
                </div>
            </div>
        </section>
    );
}
