export function TrustedBySection() {
    const brands = ['GoFood', 'GrabFood', 'Tokopedia', 'BCA', 'OVO', 'GoPay'];

    return (
        <section className="py-12 border-y border-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <p className="text-center text-sm mb-8" style={{ color: 'var(--brand-muted)' }}>
                    Dipercaya oleh brand-brand terkemuka
                </p>
                <div className="flex items-center justify-center gap-8 md:gap-16 flex-wrap opacity-50">
                    {brands.map((brand) => (
                        <span key={brand} className="text-xl font-bold" style={{ color: 'var(--brand-text)' }}>
                            {brand}
                        </span>
                    ))}
                </div>
            </div>
        </section>
    );
}
