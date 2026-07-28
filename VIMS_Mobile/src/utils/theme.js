export const themeColors = {
  primary: '#166534',
  primaryDark: '#0f4d28',
  primaryDeep: '#0b3d21',
  primaryLight: '#22c55e',
  primarySoft: '#dcfce7',
  primaryWash: '#f0fdf4',
  sidebar: '#166534',
  sidebarDark: '#0f4d28',
  success: '#16a34a',
  successSoft: '#dcfce7',
  warning: '#d97706',
  warningSoft: '#fef3c7',
  error: '#dc2626',
  errorSoft: '#fee2e2',
  info: '#0284c7',
  infoSoft: '#e0f2fe',
  background: '#f4f7f5',
  backgroundElevated: '#eef3f0',
  cardBackground: '#ffffff',
  surfaceMuted: '#f8faf9',
  textPrimary: '#0f172a',
  secondary: '#64748b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  border: '#e2e8e5',
  borderStrong: '#cbd5d1',
  muted: '#e5e7eb',
  white: '#ffffff',
  black: '#020617',
  overlay: 'rgba(2, 6, 23, 0.52)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radii = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  round: 999,
};

export const typography = {
  display: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900',
    letterSpacing: -0.8,
    color: themeColors.textPrimary,
  },
  h1: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: -0.5,
    color: themeColors.textPrimary,
  },
  h2: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: themeColors.textPrimary,
  },
  h3: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    color: themeColors.textPrimary,
  },
  h4: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  body1: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '400',
    color: themeColors.textPrimary,
  },
  body2: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    color: themeColors.textSecondary,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: themeColors.textPrimary,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: themeColors.textSecondary,
  },
  overline: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: themeColors.textSecondary,
  },
};

export const shadows = {
  small: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  medium: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.09,
    shadowRadius: 14,
    elevation: 5,
  },
  large: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 10,
  },
};

export const componentStyles = {
  screen: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  card: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: themeColors.border,
    ...shadows.small,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: themeColors.borderStrong,
    borderRadius: radii.md,
    backgroundColor: themeColors.cardBackground,
    paddingHorizontal: spacing.lg,
    color: themeColors.textPrimary,
    fontSize: 15,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: radii.md,
    backgroundColor: themeColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    ...shadows.small,
  },
};

export const pinterestTheme = {
  canvas: themeColors.background,
  cardRadius: radii.lg,
  cardShadow: shadows.medium,
};

export const statCardStyles = [
  { bg: '#1d4ed8', light: 'rgba(255,255,255,0.16)', accent: '#dbeafe' },
  { bg: '#15803d', light: 'rgba(255,255,255,0.16)', accent: '#dcfce7' },
  { bg: '#0369a1', light: 'rgba(255,255,255,0.14)', accent: '#e0f2fe' },
  { bg: '#b91c1c', light: 'rgba(255,255,255,0.14)', accent: '#fee2e2' },
];

export const navigationTheme = {
  dark: false,
  colors: {
    primary: themeColors.primary,
    background: themeColors.background,
    card: themeColors.cardBackground,
    text: themeColors.textPrimary,
    border: themeColors.border,
    notification: themeColors.error,
  },
};
