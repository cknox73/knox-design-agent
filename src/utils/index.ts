/**
 * Knox Design Agent - Utility Functions
 * Helper functions for extraction and analysis
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { ColorToken, TypographyToken, SpacingToken, ShadowToken } from '../types/index.js';

// ===== Color Utilities =====

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.replace('#', '');
  if (!/^[0-9A-Fa-f]{6}$/.test(cleaned)) return null;
  
  return {
    r: parseInt(cleaned.substring(0, 2), 16),
    g: parseInt(cleaned.substring(2, 4), 16),
    b: parseInt(cleaned.substring(4, 6), 16)
  };
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  
  if (max === min) {
    return { h: 0, s: 0, l: Math.round(l * 100) };
  }
  
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  
  let h = 0;
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
    case g: h = ((b - r) / d + 2) / 6; break;
    case b: h = ((r - g) / d + 4) / 6; break;
  }
  
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function parseColor(color: string): { hex: string; rgb: { r: number; g: number; b: number } } | null {
  // Clean and normalize
  const cleaned = color.trim().toLowerCase();
  
  // Hex
  if (cleaned.startsWith('#')) {
    const rgb = hexToRgb(cleaned);
    if (rgb) return { hex: cleaned.toUpperCase(), rgb };
  }
  
  // RGB/RGBA
  const rgbMatch = cleaned.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]);
    const g = parseInt(rgbMatch[2]);
    const b = parseInt(rgbMatch[3]);
    return { hex: rgbToHex(r, g, b), rgb: { r, g, b } };
  }
  
  // HSL
  const hslMatch = cleaned.match(/hsla?\((\d+),\s*(\d+)%,?\s*(\d+)%/);
  if (hslMatch) {
    const h = parseInt(hslMatch[1]) / 360;
    const s = parseInt(hslMatch[2]) / 100;
    const l = parseInt(hslMatch[3]) / 100;
    // Convert HSL to RGB
    let r: number, g: number, b: number;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    const rgb = { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
    return { hex: rgbToHex(rgb.r, rgb.g, rgb.b), rgb };
  }
  
  return null;
}

export function classifyColor(token: ColorToken): ColorToken['usage'] {
  const { h, s, l } = token.hsl;
  
  // Grayscale
  if (s < 10) {
    if (l > 95) return 'neutral'; // Almost white
    if (l < 15) return 'neutral'; // Almost black
    return 'neutral';
  }
  
  // Semantic colors
  if (s > 40) {
    if (h >= 0 && h <= 30) return 'semantic'; // Red/orange - error/warning
    if (h >= 90 && h <= 150) return 'semantic'; // Green - success
    if (h >= 180 && h <= 240) return 'semantic'; // Blue - info
  }
  
  // Primary colors (saturated, medium lightness)
  if (s > 50 && l > 30 && l < 70) {
    return 'primary';
  }
  
  // Secondary colors
  if (s > 30 && s <= 50) {
    return 'secondary';
  }
  
  // Accents
  if (s > 60 && (l < 30 || l > 70)) {
    return 'accent';
  }
  
  return 'unknown';
}

export function getContrastRatio(color1: { r: number; g: number; b: number }, color2: { r: number; g: number; b: number }): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

function getLuminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

// ===== Typography Utilities =====

export function classifyTypography(token: TypographyToken): TypographyToken['type'] {
  const size = parseFloat(token.fontSize);
  const weight = token.fontWeight;
  
  // Headings
  if (size >= 24 || weight >= 700) {
    return 'heading';
  }
  
  // Body text
  if (size >= 14 && size < 24) {
    return 'body';
  }
  
  // Captions/labels
  if (size < 14) {
    return 'caption';
  }
  
  // Check context
  if (token.contexts.some(c => c.includes('button') || c.includes('btn'))) {
    return 'button';
  }
  
  if (token.contexts.some(c => c.includes('label') || c.includes('tag'))) {
    return 'label';
  }
  
  return 'unknown';
}

// ===== Spacing Utilities =====

export function classifySpacing(token: SpacingToken): SpacingToken['scale'] {
  const px = token.pixelValue;
  
  if (px === 0) return 'unknown';
  if (px <= 4) return 'xs';
  if (px <= 8) return 'sm';
  if (px <= 16) return 'md';
  if (px <= 24) return 'lg';
  if (px <= 32) return 'xl';
  if (px <= 48) return '2xl';
  if (px <= 64) return '3xl';
  
  return 'unknown';
}

export function parseSpacing(value: string): { value: number; unit: string; pixelValue: number } | null {
  const match = value.match(/^(\d+(?:\.\d+)?)(px|rem|em|%|vh|vw)$/);
  if (!match) return null;
  
  const num = parseFloat(match[1]);
  const unit = match[2];
  
  let pixelValue = num;
  if (unit === 'rem' || unit === 'em') {
    pixelValue = num * 16; // Assuming base 16px
  }
  
  return { value: num, unit, pixelValue };
}

// ===== Shadow Utilities =====

export function parseShadow(shadow: string): { x: number; y: number; blur: number; spread: number; color: string } | null {
  // Match box-shadow pattern: offset-x offset-y blur-radius spread-radius color
  const match = shadow.match(/(-?\d+(?:\.\d+)?)(?:px)?\s+(-?\d+(?:\.\d+)?)(?:px)?\s+(-?\d+(?:\.\d+)?)(?:px)?(?:\s+(-?\d+(?:\.\d+)?)(?:px)?)?\s+(.+)/);
  if (!match) return null;
  
  return {
    x: parseFloat(match[1]),
    y: parseFloat(match[2]),
    blur: parseFloat(match[3]),
    spread: match[4] ? parseFloat(match[4]) : 0,
    color: match[5].trim()
  };
}

export function classifyShadow(token: ShadowToken): ShadowToken['type'] {
  const { blur, y } = token;
  
  if (blur === 0 && y === 0) return 'none';
  if (blur <= 2) return 'sm';
  if (blur <= 8) return 'md';
  if (blur <= 16) return 'lg';
  if (blur <= 32) return 'xl';
  if (y < 0 || token.value.includes('inset')) return 'inner';
  
  return 'unknown';
}

// ===== File Utilities =====

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function writeJson(filePath: string, data: unknown): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

export function sanitizeFilename(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function formatTimestamp(): string {
  return new Date().toISOString();
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== Statistics Utilities =====

export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function calculateMode<T>(values: T[]): T | null {
  if (values.length === 0) return null;
  const counts = new Map<T, number>();
  for (const v of values) {
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  let maxCount = 0;
  let mode: T | null = null;
  for (const [value, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      mode = value;
    }
  }
  return mode;
}

export function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = calculateMean(values);
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(calculateMean(squaredDiffs));
}

// ===== Validation Utilities =====

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function normalizeUrl(url: string): string {
  if (!url.startsWith('http')) {
    return `https://${url}`;
  }
  return url;
}

export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}
