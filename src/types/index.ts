/**
 * Knox Design Agent - Type Definitions
 * Core types for design system extraction and analysis
 */

// ===== Site Configuration =====

export interface SiteConfig {
  name: string;
  url: string;
  why: string;
  category?: string;
}

export interface ExtractionConfig {
  maxSites: number;
  delayBetweenRequests: number;
  userAgent: string;
}

export interface WorldClassSitesConfig {
  categories: Record<string, SiteConfig[]>;
  extraction: ExtractionConfig;
}

// ===== Design Tokens =====

export interface ColorToken {
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
  count: number;
  frequency: number;
  context: string[];
  usage: 'primary' | 'secondary' | 'accent' | 'neutral' | 'semantic' | 'unknown';
}

export interface TypographyToken {
  fontFamily: string;
  fontSize: string;
  fontWeight: number;
  lineHeight: string;
  letterSpacing?: string;
  count: number;
  contexts: string[];
  type: 'heading' | 'body' | 'caption' | 'button' | 'label' | 'unknown';
}

export interface SpacingToken {
  value: number;
  unit: string;
  pixelValue: number;
  property: string;
  count: number;
  contexts: string[];
  scale: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'unknown';
}

export interface ShadowToken {
  value: string;
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
  count: number;
  contexts: string[];
  type: 'sm' | 'md' | 'lg' | 'xl' | 'inner' | 'none' | 'unknown';
}

export interface BorderRadiusToken {
  value: string;
  pixelValue: number;
  count: number;
  contexts: string[];
  type: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full' | 'unknown';
}

// ===== Components =====

export interface ComponentPattern {
  type: 'button' | 'card' | 'input' | 'navbar' | 'hero' | 'footer' | 'modal' | 'dropdown' | 'unknown';
  selector: string;
  count: number;
  styles: {
    colors?: string[];
    typography?: TypographyToken[];
    spacing?: SpacingToken[];
    shadows?: ShadowToken[];
    borderRadius?: string;
  };
  variants: string[];
  screenshots?: string[];
}

export interface ExtractedComponents {
  buttons: ComponentPattern[];
  cards: ComponentPattern[];
  inputs: ComponentPattern[];
  navbars: ComponentPattern[];
  heroes: ComponentPattern[];
  footers: ComponentPattern[];
  modals: ComponentPattern[];
  dropdowns: ComponentPattern[];
}

// ===== Screenshots =====

export interface ScreenshotSet {
  fullPage: string;
  hero?: string;
  components: Record<string, string[]>;
}

// ===== Extraction Results =====

export interface ExtractionResult {
  site: SiteConfig;
  timestamp: string;
  url: string;
  colors: ColorToken[];
  typography: TypographyToken[];
  spacing: SpacingToken[];
  shadows: ShadowToken[];
  borderRadius: BorderRadiusToken[];
  components: ExtractedComponents;
  screenshots: ScreenshotSet;
  metadata: {
    title: string;
    description?: string;
    viewport: { width: number; height: number };
    duration: number;
  };
}

// ===== Analysis =====

export interface DesignPattern {
  name: string;
  description: string;
  frequency: number;
  examples: string[];
  confidence: number;
}

export interface ColorAnalysis {
  primaryPalette: ColorToken[];
  semanticColors: {
    success?: ColorToken;
    warning?: ColorToken;
    error?: ColorToken;
    info?: ColorToken;
  };
  darkModeSupport: boolean;
  accessibilityScore: number;
}

export interface TypographyAnalysis {
  fontStack: string[];
  headingScale: TypographyToken[];
  bodyScale: TypographyToken[];
  monospaceFont?: string;
  readabilityScore: number;
}

export interface SpacingSystem {
  baseUnit: number;
  scale: number[];
  rhythm: '4px' | '8px' | '16px' | 'custom';
  consistencyScore: number;
}

export interface ComponentLibrary {
  patterns: DesignPattern[];
  coverage: Record<string, number>;
  reusabilityScore: number;
}

export interface SynthesisResult {
  site: SiteConfig;
  timestamp: string;
  colorAnalysis: ColorAnalysis;
  typographyAnalysis: TypographyAnalysis;
  spacingSystem: SpacingSystem;
  componentLibrary: ComponentLibrary;
  recommendations: string[];
  extractedAt: string;
  confidence: number;
}

// ===== Export =====

export interface TokenExport {
  css: string;
  json: Record<string, unknown>;
  tailwind: {
    theme: Record<string, unknown>;
    plugins?: string[];
  };
}

// ===== Batch Processing =====

export interface BatchConfig {
  sites: SiteConfig[];
  concurrency: number;
  delayBetweenSites: number;
  maxRetries: number;
  timeout: number;
}

export interface BatchResult {
  successful: ExtractionResult[];
  failed: { site: SiteConfig; error: string }[];
  duration: number;
  timestamp: string;
}

// ===== CLI =====

export interface CLICommand {
  name: 'extract' | 'analyze' | 'export' | 'pipeline' | 'batch';
  options: {
    url?: string;
    config?: string;
    output?: string;
    concurrency?: number;
    skipScreenshots?: boolean;
    categories?: string[];
  };
}
