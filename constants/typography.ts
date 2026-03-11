import { Colors } from './theme';

export const Typography = {
  fontFamily: 'Outfit',
  h1: { fontSize: 26, fontWeight: '800' as const, color: Colors.text },
  h2: { fontSize: 20, fontWeight: '700' as const, color: Colors.text },
  h3: { fontSize: 16, fontWeight: '700' as const, color: Colors.text },
  body: { fontSize: 14, fontWeight: '400' as const, color: Colors.text },
  small: { fontSize: 12, fontWeight: '400' as const, color: Colors.textMuted },
  label: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
};
