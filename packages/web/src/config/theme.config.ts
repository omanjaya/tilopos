// Theme configuration for landing page and branding
// Users can customize these in business settings

export interface BrandTheme {
    // Primary brand color
    primaryColor: string;
    primaryColorLight: string;
    primaryColorDark: string;

    // Secondary accent color
    accentColor: string;

    // Text colors
    headingColor: string;
    textColor: string;
    mutedColor: string;

    // Background colors
    backgroundColor: string;
    surfaceColor: string;
    cardColor: string;

    // Gradient
    gradientFrom: string;
    gradientTo: string;

    // Button styles
    buttonRadius: string;
}

// Preset themes
export const themes: Record<string, BrandTheme> = {
    blue: {
        primaryColor: '#2563EB',
        primaryColorLight: '#3B82F6',
        primaryColorDark: '#1D4ED8',
        accentColor: '#06B6D4',
        headingColor: '#0F172A',
        textColor: '#334155',
        mutedColor: '#64748B',
        backgroundColor: '#FFFFFF',
        surfaceColor: '#F8FAFC',
        cardColor: '#FFFFFF',
        gradientFrom: '#2563EB',
        gradientTo: '#06B6D4',
        buttonRadius: '12px',
    },
    purple: {
        primaryColor: '#7C3AED',
        primaryColorLight: '#8B5CF6',
        primaryColorDark: '#6D28D9',
        accentColor: '#EC4899',
        headingColor: '#1E1B4B',
        textColor: '#3730A3',
        mutedColor: '#6366F1',
        backgroundColor: '#FFFFFF',
        surfaceColor: '#F5F3FF',
        cardColor: '#FFFFFF',
        gradientFrom: '#7C3AED',
        gradientTo: '#EC4899',
        buttonRadius: '12px',
    },
    green: {
        primaryColor: '#059669',
        primaryColorLight: '#10B981',
        primaryColorDark: '#047857',
        accentColor: '#84CC16',
        headingColor: '#14532D',
        textColor: '#166534',
        mutedColor: '#4ADE80',
        backgroundColor: '#FFFFFF',
        surfaceColor: '#F0FDF4',
        cardColor: '#FFFFFF',
        gradientFrom: '#059669',
        gradientTo: '#84CC16',
        buttonRadius: '12px',
    },
    orange: {
        primaryColor: '#EA580C',
        primaryColorLight: '#F97316',
        primaryColorDark: '#C2410C',
        accentColor: '#FBBF24',
        headingColor: '#7C2D12',
        textColor: '#9A3412',
        mutedColor: '#FB923C',
        backgroundColor: '#FFFFFF',
        surfaceColor: '#FFF7ED',
        cardColor: '#FFFFFF',
        gradientFrom: '#EA580C',
        gradientTo: '#FBBF24',
        buttonRadius: '12px',
    },
    dark: {
        primaryColor: '#3B82F6',
        primaryColorLight: '#60A5FA',
        primaryColorDark: '#2563EB',
        accentColor: '#22D3EE',
        headingColor: '#F8FAFC',
        textColor: '#CBD5E1',
        mutedColor: '#64748B',
        backgroundColor: '#0F172A',
        surfaceColor: '#1E293B',
        cardColor: '#1E293B',
        gradientFrom: '#3B82F6',
        gradientTo: '#22D3EE',
        buttonRadius: '12px',
    },
    rose: {
        primaryColor: '#E11D48',
        primaryColorLight: '#F43F5E',
        primaryColorDark: '#BE123C',
        accentColor: '#FB7185',
        headingColor: '#881337',
        textColor: '#9F1239',
        mutedColor: '#FDA4AF',
        backgroundColor: '#FFFFFF',
        surfaceColor: '#FFF1F2',
        cardColor: '#FFFFFF',
        gradientFrom: '#E11D48',
        gradientTo: '#FB7185',
        buttonRadius: '12px',
    },
};

// Default theme
export const defaultTheme: BrandTheme = themes.blue!;

// Helper to apply theme as CSS variables
export function applyTheme(theme: BrandTheme) {
    const root = document.documentElement;
    root.style.setProperty('--brand-primary', theme.primaryColor);
    root.style.setProperty('--brand-primary-light', theme.primaryColorLight);
    root.style.setProperty('--brand-primary-dark', theme.primaryColorDark);
    root.style.setProperty('--brand-accent', theme.accentColor);
    root.style.setProperty('--brand-heading', theme.headingColor);
    root.style.setProperty('--brand-text', theme.textColor);
    root.style.setProperty('--brand-muted', theme.mutedColor);
    root.style.setProperty('--brand-bg', theme.backgroundColor);
    root.style.setProperty('--brand-surface', theme.surfaceColor);
    root.style.setProperty('--brand-card', theme.cardColor);
    root.style.setProperty('--brand-gradient-from', theme.gradientFrom);
    root.style.setProperty('--brand-gradient-to', theme.gradientTo);
    root.style.setProperty('--brand-button-radius', theme.buttonRadius);
}

// Get theme from local storage or default
export function getSavedTheme(): BrandTheme {
    try {
        const saved = localStorage.getItem('brand-theme');
        if (saved) {
            return JSON.parse(saved);
        }
    } catch {
        // Ignore parse errors
    }
    return defaultTheme;
}

// Save theme to local storage
export function saveTheme(theme: BrandTheme) {
    localStorage.setItem('brand-theme', JSON.stringify(theme));
    applyTheme(theme);
}
