// VIMS Mobile 2026 design system.
// Intentionally independent from the website: compact, flat, touch-first and calm.
export const themeColors = {
  primary: '#176B45',
  primaryDark: '#105437',
  primaryDeep: '#0A3F2B',
  primaryLight: '#39A66F',
  primarySoft: '#DDF1E6',
  primaryWash: '#F0F7F3',
  accent: '#D6F36A',
  accentSoft: '#F1F9CF',
  nav: '#0A3F2B',
  navActive: '#176B45',
  navMuted: '#789488',
  sidebar: '#176B45',
  sidebarDark: '#0A3F2B',
  success: '#16875A',
  successSoft: '#DDF5E9',
  warning: '#B86517',
  warningSoft: '#FFF0D8',
  error: '#BE3E46',
  errorSoft: '#FCE7E8',
  info: '#246B91',
  infoSoft: '#E1F0F7',
  background: '#F7F8F5',
  backgroundElevated: '#EFF2ED',
  cardBackground: '#FFFFFF',
  surfaceMuted: '#F2F4F0',
  surfaceTint: '#EAF3ED',
  textPrimary: '#17221C',
  secondary: '#5E6D64',
  textSecondary: '#5E6D64',
  textMuted: '#89958E',
  border: '#DEE4DE',
  borderStrong: '#C7D1C9',
  muted: '#E8ECE8',
  white: '#FFFFFF',
  black: '#0E1511',
  overlay: 'rgba(14, 21, 17, 0.58)',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };

export const radii = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  round: 999,
};

export const typography = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -1.1, color: themeColors.textPrimary },
  h1: { fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.7, color: themeColors.textPrimary },
  h2: { fontSize: 23, lineHeight: 29, fontWeight: '800', letterSpacing: -0.4, color: themeColors.textPrimary },
  h3: { fontSize: 19, lineHeight: 25, fontWeight: '700', color: themeColors.textPrimary },
  h4: { fontSize: 16, lineHeight: 22, fontWeight: '700', color: themeColors.textPrimary },
  body1: { fontSize: 16, lineHeight: 24, fontWeight: '400', color: themeColors.textPrimary },
  body2: { fontSize: 14, lineHeight: 21, fontWeight: '400', color: themeColors.textSecondary },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: themeColors.textPrimary },
  caption: { fontSize: 12, lineHeight: 17, fontWeight: '500', color: themeColors.textSecondary },
  overline: { fontSize: 10, lineHeight: 14, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase', color: themeColors.textSecondary },
};

// Shadows are deliberately subtle. Hierarchy comes from spacing and borders.
export const shadows = {
  small: { shadowColor: '#102219', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.035, shadowRadius: 2, elevation: 1 },
  medium: { shadowColor: '#102219', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.055, shadowRadius: 8, elevation: 2 },
  large: { shadowColor: '#102219', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
  floating: { shadowColor: '#102219', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 5 },
};

export const mobilePatterns = {
  appBar: { minHeight: 104, paddingTop: 50, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: themeColors.primaryDeep },
  eyebrow: { ...typography.overline, color: themeColors.accent },
  appBarTitle: { fontSize: 24, lineHeight: 30, fontWeight: '800', letterSpacing: -0.6, color: themeColors.white },
  elevatedCard: { backgroundColor: themeColors.cardBackground, borderRadius: radii.lg, borderWidth: 1, borderColor: themeColors.border, ...shadows.small },
  insetCard: { backgroundColor: themeColors.surfaceTint, borderRadius: radii.md, borderWidth: 1, borderColor: themeColors.border },
};

export const componentStyles = {
  screen: { flex: 1, backgroundColor: themeColors.background },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xxxl },
  card: { backgroundColor: themeColors.cardBackground, borderRadius: radii.lg, borderWidth: 1, borderColor: themeColors.border, ...shadows.small },
  input: { minHeight: 52, borderWidth: 1, borderColor: themeColors.borderStrong, borderRadius: radii.md, backgroundColor: themeColors.cardBackground, paddingHorizontal: spacing.lg, color: themeColors.textPrimary, fontSize: 15 },
  primaryButton: { minHeight: 52, borderRadius: radii.md, backgroundColor: themeColors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
};

export const pinterestTheme = { canvas: themeColors.background, cardRadius: radii.lg, cardShadow: shadows.small };

export const statCardStyles = [
  { bg: '#176B45', light: 'rgba(255,255,255,0.12)', accent: '#DDF5E9' },
  { bg: '#246B91', light: 'rgba(255,255,255,0.12)', accent: '#E1F0F7' },
  { bg: '#B86517', light: 'rgba(255,255,255,0.12)', accent: '#FFF0D8' },
  { bg: '#BE3E46', light: 'rgba(255,255,255,0.12)', accent: '#FCE7E8' },
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
