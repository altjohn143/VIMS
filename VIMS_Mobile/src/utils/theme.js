export const themeColors = {
  primary: '#2224be',
  primaryLight: '#2224be',
  primaryDark: '#1a1c8c',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  background: '#f8fafc',
  cardBackground: '#ffffff',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  border: 'rgba(34, 36, 190, 0.1)',
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