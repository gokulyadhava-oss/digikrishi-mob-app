import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

const primaryGreen = '#15803d';
const primaryGreenDark = '#22c55e';

/** Premium dark palette for cards (Basic details, Address, Bank details). */
const cardPremiumDark = {
  background: '#14181c',
  border: '#2d333b',
  surface: '#14181c',
  surfaceVariant: '#1c2128',
  outline: '#373e47',
  onSurface: '#e6edf3',
  onSurfaceVariant: '#8b949e',
};

export const paperLightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: primaryGreen,
    primaryContainer: '#dcfce7',
    surface: '#f0fdf4',
    surfaceVariant: '#f0fdf4',
    outline: '#bbf7d0',
  },
};

export const paperDarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: primaryGreenDark,
    primaryContainer: '#14532d',
    surface: cardPremiumDark.surface,
    surfaceVariant: cardPremiumDark.surfaceVariant,
    outline: cardPremiumDark.outline,
    surfaceDisabled: cardPremiumDark.surfaceVariant,
    onSurface: cardPremiumDark.onSurface,
    onSurfaceVariant: cardPremiumDark.onSurfaceVariant,
    outlineVariant: cardPremiumDark.border,
  },
};
