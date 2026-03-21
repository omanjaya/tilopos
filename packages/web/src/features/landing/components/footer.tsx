export function Footer() {
    return (
        <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-gray-100">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: `linear-gradient(135deg, var(--brand-gradient-from), var(--brand-gradient-to))` }}
                    >
                        <span className="text-white font-bold text-xs">T</span>
                    </div>
                    <span className="font-semibold text-sm" style={{ color: 'var(--brand-heading)' }}>TiloPOS</span>
                </div>
                <p className="text-xs" style={{ color: 'var(--brand-muted)' }}>
                    &copy; {new Date().getFullYear()} TiloPOS. All rights reserved.
                </p>
            </div>
        </footer>
    );
}
