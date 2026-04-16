/**
 * Website Extraction Engine
 * Extracts design tokens, components, and screenshots from websites
 */

import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ExtractedDesign {
  metadata: {
    url: string;
    extractedAt: string;
    name: string;
    viewport: { width: number; height: number };
  };
  tokens: {
    colors: ColorToken[];
    typography: TypographyToken[];
    spacing: SpacingToken[];
    shadows: ShadowToken[];
  };
  components: ComponentPattern[];
  screenshots: {
    fullPage: string;
    hero: string;
  };
}

interface ColorToken { hex: string; rgb: string; usage: string; frequency: number; }
interface TypographyToken { fontFamily: string; fontSize: string; fontWeight: string; lineHeight: string; element: string; }
interface SpacingToken { value: string; pixels: number; frequency: number; }
interface ShadowToken { value: string; frequency: number; }
interface ComponentPattern { type: string; selector: string; html: string; styles: Record<string, string>; }

export class WebsiteExtractor {
  private browser: Browser | null = null;

  async init() {
    this.browser = await chromium.launch({ headless: true });
  }

  async extract(config: { url: string; name: string; outputDir: string }): Promise<ExtractedDesign> {
    if (!this.browser) await this.init();
    
    const page = await this.browser!.newPage({ viewport: { width: 1440, height: 900 } });
    
    try {
      await page.goto(config.url, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(3000);

      const colors = await this.extractColors(page);
      const typography = await this.extractTypography(page);
      const spacing = await this.extractSpacing(page);
      const shadows = await this.extractShadows(page);
      const components = await this.extractComponents(page);

      const screenshots = await this.captureScreenshots(page, config);

      const result: ExtractedDesign = {
        metadata: { url: config.url, extractedAt: new Date().toISOString(), name: config.name, viewport: { width: 1440, height: 900 } },
        tokens: { colors, typography, spacing, shadows },
        components,
        screenshots
      };

      await this.saveExtraction(result, config);
      return result;
    } finally {
      await page.close();
    }
  }

  private async extractColors(page: Page): Promise<ColorToken[]> {
    return page.evaluate(() => {
      const colors = new Map<string, { usage: string; count: number }>();
      document.querySelectorAll('*').forEach((el) => {
        const computed = window.getComputedStyle(el);
        [computed.backgroundColor, computed.color, computed.borderColor].forEach((color) => {
          if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
            const existing = colors.get(color);
            if (existing) existing.count++;
            else colors.set(color, { usage: el.tagName.toLowerCase(), count: 1 });
          }
        });
      });

      const rgbToHex = (rgb: string): string => {
        const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (!match) return rgb;
        const [r, g, b] = [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      };

      return Array.from(colors.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 50)
        .map(([color, data]) => ({ hex: color.includes('rgb') ? rgbToHex(color) : color, rgb: color, usage: data.usage, frequency: data.count }));
    });
  }

  private async extractTypography(page: Page): Promise<TypographyToken[]> {
    return page.evaluate(() => {
      const fonts = new Map<string, TypographyToken>();
      document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, a, button, label').forEach((el) => {
        const computed = window.getComputedStyle(el);
        const key = `${computed.fontFamily}-${computed.fontSize}-${computed.fontWeight}`;
        if (!fonts.has(key)) {
          fonts.set(key, {
            fontFamily: computed.fontFamily.replace(/["']/g, '').split(',')[0],
            fontSize: computed.fontSize,
            fontWeight: computed.fontWeight,
            lineHeight: computed.lineHeight,
            element: el.tagName.toLowerCase()
          });
        }
      });
      return Array.from(fonts.values()).slice(0, 30);
    });
  }

  private async extractSpacing(page: Page): Promise<SpacingToken[]> {
    return page.evaluate(() => {
      const spacing = new Map<number, number>();
      document.querySelectorAll('*').forEach((el) => {
        const computed = window.getComputedStyle(el);
        [parseInt(computed.marginTop), parseInt(computed.paddingTop)].forEach((val) => {
          if (val > 0 && val < 200) spacing.set(val, (spacing.get(val) || 0) + 1);
        });
      });
      return Array.from(spacing.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([pixels, count]) => ({ value: `${pixels}px`, pixels, frequency: count }));
    });
  }

  private async extractShadows(page: Page): Promise<ShadowToken[]> {
    return page.evaluate(() => {
      const shadows = new Map<string, number>();
      document.querySelectorAll('*').forEach((el) => {
        const shadow = window.getComputedStyle(el).boxShadow;
        if (shadow && shadow !== 'none') shadows.set(shadow, (shadows.get(shadow) || 0) + 1);
      });
      return Array.from(shadows.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([value, count]) => ({ value, frequency: count }));
    });
  }

  private async extractComponents(page: Page): Promise<ComponentPattern[]> {
    const selectors = [
      { type: 'button', selector: 'button, .btn, [role="button"]' },
      { type: 'card', selector: '.card, [class*="card"]' },
      { type: 'input', selector: 'input, textarea, select' },
      { type: 'navbar', selector: 'nav, header' },
      { type: 'hero', selector: 'section:first-of-type' },
      { type: 'footer', selector: 'footer' }
    ];

    const components: ComponentPattern[] = [];
    for (const { type, selector } of selectors) {
      const elements = await page.$$(selector);
      for (let i = 0; i < Math.min(elements.length, 3); i++) {
        const el = elements[i];
        try {
          const html = await el.evaluate((e) => e.outerHTML);
          const styles = await el.evaluate((e) => {
            const computed = window.getComputedStyle(e);
            return {
              backgroundColor: computed.backgroundColor,
              color: computed.color,
              fontFamily: computed.fontFamily,
              padding: computed.padding,
              borderRadius: computed.borderRadius,
              boxShadow: computed.boxShadow
            };
          });
          components.push({ type, selector: `${selector}:nth-of-type(${i + 1})`, html: html.slice(0, 500), styles });
        } catch (e) {}
      }
    }
    return components;
  }

  private async captureScreenshots(page: Page, config: { outputDir: string }): Promise<{ fullPage: string; hero: string }> {
    await fs.mkdir(path.join(config.outputDir, 'screenshots'), { recursive: true });
    const fullPage = path.join(config.outputDir, 'screenshots', 'fullpage.png');
    const hero = path.join(config.outputDir, 'screenshots', 'hero.png');
    
    await page.screenshot({ path: fullPage, fullPage: true });
    await page.screenshot({ path: hero, clip: { x: 0, y: 0, width: 1440, height: 900 } });
    
    return { fullPage, hero };
  }

  private async saveExtraction(result: ExtractedDesign, config: { outputDir: string; name: string }): Promise<void> {
    await fs.mkdir(config.outputDir, { recursive: true });
    await fs.writeFile(path.join(config.outputDir, 'extraction.json'), JSON.stringify(result, null, 2));
    
    const summary = `# ${config.name} — Design Extraction

**URL:** ${result.metadata.url}  
**Extracted:** ${result.metadata.extractedAt}

## Color Palette (${result.tokens.colors.length} colors)

${result.tokens.colors.slice(0, 15).map(c => `- **${c.hex}** — ${c.usage} (${c.frequency} uses)`).join('\n')}

## Typography (${result.tokens.typography.length} styles)

${result.tokens.typography.slice(0, 10).map(t => `- **${t.element}**: ${t.fontFamily} ${t.fontSize} / ${t.fontWeight}`).join('\n')}

## Spacing Scale (${result.tokens.spacing.length} values)

${result.tokens.spacing.slice(0, 10).map(s => `- **${s.value}** — ${s.frequency} uses`).join('\n')}

## Components (${result.components.length})

${result.components.map(c => `- **${c.type}** — ${c.selector}`).join('\n')}
`;
    await fs.writeFile(path.join(config.outputDir, 'README.md'), summary);
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
