import { colors } from './colors';
import { fonts } from './typography';
import { spacing } from './spacing';

export const theme = {
  colors,
  fonts,
  spacing,
  borderRadius: 2,
} as const;

export type Theme = typeof theme;
export { colors, fonts, spacing };
