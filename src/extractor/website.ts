/**
 * Website Extraction Engine
 */

import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ExtractedDesign {
  metadata: { url: string; extractedAt: string; name: string };
  tokens: {
    colors: { hex: string; usage: string; frequency: number }[];
    typography: { fontFamily: string; fontSize: string; element: string }[];
    spacing: { value: string; frequency: number }[];
  };
  components: { type: string; styles: Record<string, string> }[];
}

// Inline scripts to avoid TypeScript compilation issues
const EXTRACT_COLORS = `
  (() => {
    const colorMap = new Map();
    const rgbToHex = (rgb) => {
      const match = rgb.match(/rgb\\((\\d+),\\s*(\\d+),\\s*(\\d+)\\)/);
      if (!match) return rgb;
      const r = parseInt(match[1]), g = parseInt(match[2]), b = parseInt(match[3]);
      return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    };
    document.querySelectorAll('*').forEach((el) => {
      const computed = window.getComputedStyle(el);
      [computed.backgroundColor, computed.color, computed.borderColor].forEach((color) => {
        if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
          const hex = rgbToHex(color);
          const existing = colorMap.get(hex);
          if (existing) existing.count++;
          else colorMap.set(hex, { usage: el.tagName.toLowerCase(), count: 1 });
        }
      });
    });
    return Array.from(colorMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 50)
      .map(([hex, data]) => ({ hex, usage: data.usage, frequency: data.count }));
  })()
`;

const EXTRACT_TYPOGRAPHY = `
  (() => {
    const fontMap = new Map();
    document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, a, button').forEach((el) => {
      const computed = window.getComputedStyle(el);
      const key = computed.fontFamily + computed.fontSize;
      if (!fontMap.has(key)) {
        fontMap.set(key, {
          fontFamily: computed.fontFamily.replace(/["']/g, '').split(',')[0],
          fontSize: computed.fontSize,
          element: el.tagName.toLowerCase()
        });
      }
    });
    return Array.from(fontMap.values()).slice(0, 30);
  })()
`;

const EXTRACT_SPACING = `
  (() => {
    const spaceMap = new Map();
    document.querySelectorAll('*').forEach((el) => {
      const computed = window.getComputedStyle(el);
      [parseInt(computed.marginTop), parseInt(computed.paddingTop)].forEach((val) => {
        if (val > 0 && val < 200) spaceMap.set(val, (spaceMap.get(val) || 0) + 1);
      });
    });
    return Array.from(spaceMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([pixels, count]) => ({ value: pixels + 'px', frequency: count }));
  })()
`;

export class WebsiteExtractor {
  private browser: Browser | null = null;

  async init() {
    this.browser = await chromium.launch({ headless: true });
  }

  async extract(config: { url: string; name: string; outputDir: string }): Promise<ExtractedDesign> {
    if (!this.browser) await this.init();
    
    const page = await this.browser!.newPage({ viewport: { width: 1440, height: 900 } });
    
    try {
      console.log(`  Loading ${config.url}...`);
      await page.goto(config.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(3000);

      console.log(`  Extracting colors...`);
      const colors = await page.evaluate(EXTRACT_COLORS);

      console.log(`  Extracting typography...`);
      const typography = await page.evaluate(EXTRACT_TYPOGRAPHY);

      console.log(`  Extracting spacing...`);
      const spacing = await page.evaluate(EXTRACT_SPACING);

      console.log(`  Detecting components...`);
      const components = await this.extractComponents(page);

      await fs.mkdir(path.join(config.outputDir, 'screenshots'), { recursive: true });
      console.log(`  Taking screenshots...`);
      await page.screenshot({ path: path.join(config.outputDir, 'screenshots', 'fullpage.png'), fullPage: true });
      await page.screenshot({ path: path.join(config.outputDir, 'screenshots', 'hero.png'), clip: { x: 0, y: 0, width: 1440, height: 900 } });

      const result: ExtractedDesign = {
        metadata: { url: config.url, extractedAt: new Date().toISOString(), name: config.name },
        tokens: { colors, typography, spacing },
        components
      };

      await fs.mkdir(config.outputDir, { recursive: true });
      await fs.writeFile(path.join(config.outputDir, 'extraction.json'), JSON.stringify(result, null, 2));
      
      const summary = `# ${config.name}\n\nURL: ${config.url}\nExtracted: ${result.metadata.extractedAt}\n\n## Colors (${colors.length})\n${colors.slice(0, 10).map((c: any) => `- ${c.hex} (${c.frequency} uses)`).join('\n')}\n\n## Typography (${typography.length})\n${typography.slice(0, 10).map((t: any) => `- ${t.element}: ${t.fontFamily} ${t.fontSize}`).join('\n')}\n\n## Spacing (${spacing.length})\n${spacing.slice(0, 10).map((s: any) => `- ${s.value} (${s.frequency} uses)`).join('\n')}\n\n## Components (${components.length})\n${components.map((c: any) => `- ${c.type}`).join('\n')}`;
      
      await fs.writeFile(path.join(config.outputDir, 'README.md'), summary);
      console.log(`✓ Saved to ${config.outputDir}`);
      
      return result;
    } finally {
      await page.close();
    }
  }

  private async extractComponents(page: Page): Promise<ExtractedDesign['components']> {
    const components: ExtractedDesign['components'] = [];
    const selectors = [
      { type: 'button', selector: 'button, [role="button"]' },
      { type: 'card', selector: '[class*="card"]' },
      { type: 'input', selector: 'input' },
      { type: 'navbar', selector: 'nav, header' },
      { type: 'hero', selector: 'section:first-of-type' }
    ];

    for (const { type, selector } of selectors) {
      const elements = await page.$$(selector);
      for (let i = 0; i < Math.min(elements.length, 2); i++) {
        try {
          const styles = await elements[i].evaluate((e) => {
            const computed = window.getComputedStyle(e as Element);
            return {
              backgroundColor: computed.backgroundColor,
              color: computed.color,
              padding: computed.padding,
              borderRadius: computed.borderRadius
            };
          });
          components.push({ type, styles });
        } catch {}
      }
    }

    return components;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
