export const colors = {
  ivory:        '#FDFBF4',
  ivoryDark:    '#F0EDE0',
  ivoryMid:     '#E2DED0',
  yellow:       '#FFFFAD',
  yellowBorder: '#000000',
  yellowText:   '#3A3A00',
  ink:          '#14120C',
  muted:        '#7A7762',
} as const;

export type ColorKey = keyof typeof colors;
