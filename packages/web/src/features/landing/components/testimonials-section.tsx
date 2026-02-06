import { Star } from 'lucide-react';

interface Testimonial {
    name: string;
    role: string;
    text: string;
}

const testimonials: Testimonial[] = [
    { name: 'Andi Wijaya', role: 'Owner, Kopi Nusantara', text: 'Sejak pakai TILO, omset naik 40% karena proses lebih cepat. Support-nya juga responsif!' },
    { name: 'Sarah Putri', role: 'Manager, Resto Sederhana', text: 'Kitchen display membantu banget. Tidak ada lagi pesanan tertukar, dapur lebih efisien.' },
    { name: 'Budi Santoso', role: 'CEO, MartKu (15 Cabang)', text: 'Dengan multi-outlet, saya pantau 15 cabang dari 1 dashboard. Worth it!' },
];

export function TestimonialsSection() {
    return (
        <section id="testimoni" className="py-24 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--brand-surface)' }}>
            <div className="max-w-7xl mx-auto">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: 'var(--brand-heading)' }}>
                        Apa Kata Mereka?
                    </h2>
                    <p style={{ color: 'var(--brand-text)' }}>Testimoni dari pengguna TILO</p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    {testimonials.map((t, index) => (
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
    );
}
