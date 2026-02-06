import { useState, useEffect } from 'react';
import { applyTheme, getSavedTheme, themes, type BrandTheme } from '@/config/theme.config';
import {
    Navigation,
    HeroSection,
    TrustedBySection,
    FeaturesSection,
    PricingSection,
    TestimonialsSection,
    FAQSection,
    CTASection,
    Footer
} from '@/features/landing/components';

export function LandingPage() {
    const [currentTheme, setCurrentTheme] = useState<BrandTheme>(getSavedTheme());

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
            <Navigation currentTheme={currentTheme} onThemeChange={handleThemeChange} />
            <HeroSection />
            <TrustedBySection />
            <FeaturesSection />
            <PricingSection />
            <TestimonialsSection />
            <FAQSection />
            <CTASection />
            <Footer />
        </div>
    );
}
