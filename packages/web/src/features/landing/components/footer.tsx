interface FooterColumn {
    title: string;
    links: string[];
}

const footerColumns: FooterColumn[] = [
    { title: 'Produk', links: ['Fitur', 'Harga', 'Hardware'] },
    { title: 'Perusahaan', links: ['Tentang', 'Karir', 'Blog'] },
    { title: 'Support', links: ['Help Center', 'FAQ', 'Kontak'] },
];

export function Footer() {
    return (
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
                    {footerColumns.map((col) => (
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
    );
}
