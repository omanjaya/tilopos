import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PricingPlan {
    name: string;
    price: string;
    desc: string;
    features: string[];
    popular: boolean;
}

const plans: PricingPlan[] = [
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
];

export function PricingSection() {
    return (
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
                    {plans.map((plan, index) => (
                        <div
                            key={index}
                            className={`p-8 rounded-2xl border-2 transition-all hover:shadow-xl ${
                                plan.popular ? 'border-[var(--brand-primary)] scale-105' : 'border-gray-100'
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
                                className={`w-full h-12 font-semibold ${plan.popular ? 'text-white' : ''}`}
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
    );
}
