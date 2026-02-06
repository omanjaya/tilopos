import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { themes, type BrandTheme } from '@/config/theme.config';

interface NavigationProps {
    currentTheme: BrandTheme;
    onThemeChange: (themeName: string) => void;
}

export function Navigation({ currentTheme: _currentTheme, onThemeChange }: NavigationProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showThemePicker, setShowThemePicker] = useState(false);

    const navItems = ['Fitur', 'Harga', 'Testimoni', 'FAQ'];

    return (
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
                        {navItems.map((item) => (
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
                                                onClick={() => { onThemeChange(name); setShowThemePicker(false); }}
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
                    {navItems.map((item) => (
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
    );
}
