// src/theme/responsive.ts
// ─── Global Responsive Utility ───────────────────────────────────────────────
// Usage: import { rs, rf, rp, wp, hp, isSmall, isTablet } from '../theme/responsive';
//   rs(16)   → scaled spacing
//   rf(14)   → scaled font size
//   rp(12)   → scaled padding
//   wp(50)   → 50% of screen width
//   hp(10)   → 10% of screen height

import { Dimensions, Platform, PixelRatio, StatusBar } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Device classification ────────────────────────────────────────────────────
export const isTablet  = SCREEN_W >= 768;
export const isSmall   = SCREEN_W < 360;
export const isMedium  = SCREEN_W >= 360 && SCREEN_W < 414;
export const isLarge   = SCREEN_W >= 414;

// ─── Base design dimensions (iPhone X — 375×812) ─────────────────────────────
const BASE_WIDTH  = 375;
const BASE_HEIGHT = 812;

// ─── Scale functions ──────────────────────────────────────────────────────────

/** Scale relative to screen width */
export const ws = (size: number): number => {
  const scaled = size * (SCREEN_W / BASE_WIDTH);
  return Math.round(PixelRatio.roundToNearestPixel(scaled));
};

/** Scale relative to screen height */
export const hs = (size: number): number => {
  const scaled = size * (SCREEN_H / BASE_HEIGHT);
  return Math.round(PixelRatio.roundToNearestPixel(scaled));
};

/** Moderate scale — less aggressive, best for fonts & spacing */
export const rs = (size: number, factor: number = 0.5): number => {
  const scale   = SCREEN_W / BASE_WIDTH;
  const newSize = size + (size * scale - size) * factor;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

/** Responsive font — clamped between optional min/max */
export const rf = (size: number, min?: number, max?: number): number => {
  const scaled = rs(size, 0.4);
  if (min !== undefined && scaled < min) return min;
  if (max !== undefined && scaled > max) return max;
  return scaled;
};

/** Responsive padding/margin */
export const rp = (size: number): number => rs(size, 0.5);

/** Percentage of screen width */
export const wp = (percent: number): number =>
  Math.round((SCREEN_W * percent) / 100);

/** Percentage of screen height */
export const hp = (percent: number): number =>
  Math.round((SCREEN_H * percent) / 100);

// ─── Common spacing ───────────────────────────────────────────────────────────
export const spacing = {
  xs:   rs(4),
  sm:   rs(8),
  md:   rs(12),
  lg:   rs(16),
  xl:   rs(20),
  xxl:  rs(24),
  xxxl: rs(32),
};

// ─── Font sizes ───────────────────────────────────────────────────────────────
export const fontSize = {
  xs:   rf(10),
  sm:   rf(12),
  md:   rf(14),
  lg:   rf(16),
  xl:   rf(18),
  xxl:  rf(22),
  xxxl: rf(28),
  huge: rf(34),
};

// ─── Border radius ────────────────────────────────────────────────────────────
export const radius = {
  sm:   rs(6),
  md:   rs(10),
  lg:   rs(14),
  xl:   rs(20),
  full: 999,
};

// ─── Keyboard-friendly input/button heights ───────────────────────────────────
export const inputHeight  = isSmall ? 42 : isTablet ? 56 : 48;
export const buttonHeight = isSmall ? 44 : isTablet ? 58 : 50;

// ─── Screen info ──────────────────────────────────────────────────────────────
export const screenWidth  = SCREEN_W;
export const screenHeight = SCREEN_H;
export const statusBarHeight = Platform.OS === 'android'
  ? (StatusBar.currentHeight || 0)
  : 0;

// ─── Grid card widths ─────────────────────────────────────────────────────────
export const cardWidth = {
  full:  SCREEN_W - rs(32),
  half:  (SCREEN_W - rs(48)) / 2,
  third: (SCREEN_W - rs(64)) / 3,
};

// ─── Keyboard behavior ────────────────────────────────────────────────────────
export const keyboardBehavior = Platform.OS === 'ios' ? 'padding' : 'height' as const;
export const keyboardOffset   = Platform.OS === 'ios' ? hs(60) : 0;