import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CTASection() {
    return (
        <section
            className="py-20 px-4 sm:px-6 lg:px-8"
            style={{ background: `linear-gradient(135deg, var(--brand-gradient-from), var(--brand-gradient-to))` }}
        >
            <div className="max-w-2xl mx-auto text-center text-white">
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                    Siap Tingkatkan Bisnis Anda?
                </h2>
                <p className="text-lg opacity-90 mb-8">
                    Daftar gratis sekarang. Tanpa kartu kredit.
                </p>
                <Link to="/register">
                    <Button
                        size="lg"
                        className="h-13 px-8 font-semibold text-lg"
                        style={{
                            backgroundColor: 'white',
                            color: 'var(--brand-primary)',
                            borderRadius: 'var(--brand-button-radius)'
                        }}
                    >
                        Daftar Gratis
                        <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                </Link>
            </div>
        </section>
    );
}
