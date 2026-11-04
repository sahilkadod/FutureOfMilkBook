// src/theme/theme.ts

export function getContrastColor(backgroundColor: string): string {
  if (!backgroundColor || !backgroundColor.startsWith('#') || backgroundColor.length < 7) {
    return '#000000';
  }
  const c = backgroundColor.substring(1);
  const r = parseInt(c.substr(0, 2), 16);
  const g = parseInt(c.substr(2, 2), 16);
  const b = parseInt(c.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155 ? '#000000' : '#ffffff';
}

// ─── Light Theme ──────────────────────────────────────────────────────────────
export const lightTheme = {
  primaryColor: '#ffffff',
  backgroundColor: '#f5f5f5',
  cardBackground: '#ffffff',

  textColor: '#000000',
  userNameColor: '#000000',
  borderlineColor: '#dddddd',

  summaryCardBackground: '#ffffff',
  summaryCardText: '#000000',

  secondaryColor: '#2E86DE',
  secondaryText: '#555555',
  errorColor: '#e74c3c',
  successColor: '#2ecc71',
};

// ─── Dark Theme ───────────────────────────────────────────────────────────────
export const darkTheme = {
  primaryColor: '#121212',
  backgroundColor: '#1e1e1e',
  cardBackground: '#2a2a2a',   // slightly lighter so cards are visible

  textColor: '#ffffff',
  userNameColor: '#ffffff',
  borderlineColor: '#444444',

  summaryCardBackground: '#2a2a2a',
  summaryCardText: '#ffffff',

  secondaryColor: '#2E86DE',
  secondaryText: '#cccccc',
  errorColor: '#e74c3c',
  successColor: '#2ecc71',
};