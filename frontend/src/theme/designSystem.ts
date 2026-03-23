import brandLogo from '../assets/dravix_brand.svg';

export const primaryGradient = 'linear-gradient(90deg, #FFDC6A 0%, #FF8D7C 100%)';
export const accentGradient = 'linear-gradient(135deg, #232422 0%, #24262E 100%)';

export const backgroundColors = {
  app: '#F5F1EC',
  surface: '#FEFEFE',
  surfaceWarm: '#D0C7B5',
  panel: '#F5F1EC',
  text: '#232422',
  textMuted: 'rgba(35, 36, 34, 0.6)',
  border: 'rgba(35, 36, 34, 0.12)',
  accentYellow: '#FFDC6A',
  accentCoral: '#FF8D7C',
  dark: '#232422',
  darkSecondary: '#24262E',
};

export const fontFamilies = {
  sans: '"Avenir Next", "Segoe UI", "Helvetica Neue", sans-serif',
  mono: '"SFMono-Regular", "SF Mono", "Menlo", "Consolas", monospace',
};

export const spacingSystem = {
  sectionRadius: '2rem',
  cardRadius: '1.5rem',
  panelRadius: '1.75rem',
  shellRadius: '2.25rem',
  sectionPadding: '2rem',
};

export const iconSet = {
  chemistryGlyphSource:
    'design_ingestion/bolt_ui/BOLT_UI_STYLING_GUIDE_RAW/src/assets/chemistry-svgrepo-com.svg',
  brandLogo,
  semantics: ['chemistry', 'materials', 'fire-screening', 'workflow'],
};

export const designSystem = {
  primaryGradient,
  accentGradient,
  backgroundColors,
  fontFamilies,
  spacingSystem,
  iconSet,
};

export function applyDesignSystemToDocument(): void {
  const root = document.documentElement;
  root.style.setProperty('--dravix-gradient-primary', primaryGradient);
  root.style.setProperty('--dravix-gradient-accent', accentGradient);
  root.style.setProperty('--dravix-bg-app', backgroundColors.app);
  root.style.setProperty('--dravix-bg-surface', backgroundColors.surface);
  root.style.setProperty('--dravix-bg-panel', backgroundColors.panel);
  root.style.setProperty('--dravix-bg-surface-warm', backgroundColors.surfaceWarm);
  root.style.setProperty('--dravix-text', backgroundColors.text);
  root.style.setProperty('--dravix-text-muted', backgroundColors.textMuted);
  root.style.setProperty('--dravix-border', backgroundColors.border);
  root.style.setProperty('--dravix-accent-yellow', backgroundColors.accentYellow);
  root.style.setProperty('--dravix-accent-coral', backgroundColors.accentCoral);
  root.style.setProperty('--dravix-dark', backgroundColors.dark);
  root.style.setProperty('--dravix-dark-secondary', backgroundColors.darkSecondary);
  root.style.setProperty('--dravix-font-sans', fontFamilies.sans);
  root.style.setProperty('--dravix-font-mono', fontFamilies.mono);
}
