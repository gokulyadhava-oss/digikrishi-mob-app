import { Platform } from 'react-native';

/**
 * Fresh Growth AgriTech design tokens.
 * Use these instead of hardcoded colors everywhere.
 */

const tokens = {
  primary: '#3D7A4F',
  primaryLight: '#5FA870',
  primaryDark: '#245533',
  secondary: '#82C341',
  secondaryLight: '#A5DA6B',
  secondaryDark: '#5A8E28',
  bg: '#F9FBF7',
  surface: '#FFFFFF',
  text: '#1B2A1E',
  textMuted: '#607060',
  border: '#D0DDD4',
  danger: '#E05252',
  warning: '#F4A623',
  healthyBg: '#82C34122',
  healthyText: '#5A8E28',
  warningBg: '#F4A62322',
  warningText: '#9B6200',
  criticalBg: '#E0525222',
  criticalText: '#B03030',
  surfaceVariant: '#EDF3EF',
  onPrimary: '#FFFFFF',
  onSecondary: '#FFFFFF',
  /** Modal overlay */
  overlay: 'rgba(0,0,0,0.45)',
  overlayDark: 'rgba(0,0,0,0.85)',
  /** Shadow for cards/elevation */
  shadow: '#000000',
  /** Card header gradient (e.g. greeting, profile block) */
  cardHeaderGreen: {
    gradientStart: '#245533',
    gradientEnd: '#3D7A4F',
    text: '#FFFFFF',
    icon: '#E4EDE6',
    subtitle: 'rgba(240,253,244,0.85)',
    pillBg: 'rgba(255,255,255,0.18)',
  },
};

const schemeLight = {
  text: tokens.text,
  background: tokens.bg,
  tint: tokens.primary,
  icon: tokens.textMuted,
  tabIconDefault: tokens.textMuted,
  tabIconSelected: tokens.primary,
  border: tokens.border,
  muted: tokens.textMuted,
  mutedForeground: tokens.textMuted,
  card: tokens.surface,
  cardBorder: tokens.border,
  emeraldBorder: tokens.secondary,
  primary: tokens.primary,
  primaryForeground: tokens.onPrimary,
  destructive: tokens.danger,
};

/** Design tokens + .light / .dark for useColorScheme(). */
export const Colors = {
  ...tokens,
  light: schemeLight,
  dark: schemeLight,
};

/** Platform font families; use Typography.fontFamily (Outfit) for design system. */
export const Fonts = Platform.select({
  ios: { sans: 'System', serif: 'Georgia', rounded: 'System', mono: 'Menlo' },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace' },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: 'normal',
    mono: "'SF Mono', Consolas, monospace",
  },
});
