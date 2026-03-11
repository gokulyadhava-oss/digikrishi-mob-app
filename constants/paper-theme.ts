import { MD3LightTheme } from 'react-native-paper';
import { Colors } from './theme';

export const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: Colors.primary,
    secondary: Colors.secondary,
    background: Colors.bg,
    surface: Colors.surface,
    onPrimary: Colors.onPrimary,
    onSecondary: Colors.onSecondary,
    onBackground: Colors.text,
    onSurface: Colors.text,
    outline: Colors.border,
    error: Colors.danger,
    surfaceVariant: Colors.surfaceVariant,
    onSurfaceVariant: Colors.textMuted,
  },
};

/** @deprecated Use paperTheme. Kept for compatibility. */
export const paperLightTheme = paperTheme;

/** @deprecated Use paperTheme. Kept for compatibility. */
export const paperDarkTheme = paperTheme;
