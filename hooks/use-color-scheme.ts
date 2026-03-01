import { useColorScheme as useRNColorScheme } from 'react-native';

/** Returns system color scheme, defaulting to 'dark' when unset. */
export function useColorScheme() {
  const scheme = useRNColorScheme();
  return scheme ?? 'dark';
}
