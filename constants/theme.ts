/**
 * Theme aligned with khetibuddy-fe (same CSS / design tokens).
 * Primary green, muted backgrounds, and matching light/dark.
 */

import { Platform } from 'react-native';

const tintColorLight = '#15803d';
const tintColorDark = '#4ade80';

export const Colors = {
  /** Premium dark green gradient for card headers – readable light text. */
  cardHeaderGreen: {
    gradientStart: '#0d2818',
    gradientEnd: '#051009',
    text: '#f0fdf4',
    icon: '#a7f3d0',
  },
  light: {
    text: '#1a1a1a',
    background: '#f8faf8',
    tint: tintColorLight,
    icon: '#525252',
    tabIconDefault: '#737373',
    tabIconSelected: tintColorLight,
    border: '#e5e5e5',
    muted: '#a3a3a3',
    mutedForeground: '#737373',
    card: '#f0fdf4',
    cardBorder: '#bbf7d0',
    primary: '#15803d',
    primaryForeground: '#fafafa',
    destructive: '#dc2626',
  },
  dark: {
    text: '#fafafa',
    background: '#0c1510',
    tint: tintColorDark,
    icon: '#a3a3a3',
    tabIconDefault: '#737373',
    tabIconSelected: tintColorDark,
    border: '#404040',
    muted: '#3f3f46',
    mutedForeground: '#a1a1aa',
    card: '#14532d',
    cardBorder: '#166534',
    primary: '#22c55e',
    primaryForeground: '#fafafa',
    destructive: '#ef4444',
  },
  /** Premium dark palette for Card blocks (Basic details, Address, Bank details). */
  cardPremiumDark: {
    background: '#14181c',
    border: '#2d333b',
    surfaceVariant: '#1c2128',
    outline: '#373e47',
    onSurface: '#e6edf3',
    onSurfaceVariant: '#8b949e',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
