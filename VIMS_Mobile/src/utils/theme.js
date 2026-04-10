export const themeColors = {
  primary: '#166534',
  primaryDark: '#14532d',
  primaryLight: '#22c55e',
  primarySoft: '#dcfce7',
  sidebar: '#146c34',
  sidebarDark: '#0f5a2a',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#0ea5e9',
  background: '#f3f5f7',
  cardBackground: '#ffffff',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  border: 'rgba(15, 23, 42, 0.08)',
  muted: '#e5e7eb'
};

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '800',
    color: themeColors.textPrimary,
  },
  h2: {
    fontSize: 28,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  h3: {
    fontSize: 24,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  h4: {
    fontSize: 20,
    fontWeight: '600',
    color: themeColors.textPrimary,
  },
  body1: {
    fontSize: 16,
    color: themeColors.textPrimary,
  },
  body2: {
    fontSize: 14,
    color: themeColors.textSecondary,
  },
  caption: {
    fontSize: 12,
    color: themeColors.textSecondary,
  },
};

/**
 * Optional Pinterest-inspired accents (soft gray canvas, floaty cards).
 * Use only where you want that look — does not change global themeColors.
 */
export const pinterestTheme = {
  canvas: '#f0f0f0',
  cardRadius: 18,
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
};

export const statCardStyles = [
  {
    bg: 'linear-gradient(135deg, #2349d8 0%, #243fb8 100%)',
    light: 'rgba(255,255,255,0.16)',
    accent: '#dbeafe'
  },
  {
    bg: 'linear-gradient(135deg, #18a34a 0%, #17803d 100%)',
    light: 'rgba(255,255,255,0.16)',
    accent: '#dcfce7'
  },
  {
    bg: 'linear-gradient(135deg, #0986c8 0%, #0d6997 100%)',
    light: 'rgba(255,255,255,0.14)',
    accent: '#dbeafe'
  },
  {
    bg: 'linear-gradient(135deg, #e02424 0%, #b91c1c 100%)',
    light: 'rgba(255,255,255,0.14)',
    accent: '#fee2e2'
  }
];

export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
};