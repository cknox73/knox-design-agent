/**
 * Batch Extraction Runner
 * Processes multiple sites from config
 */

import { WebsiteExtractor } from './website';
import * as fs from 'fs/promises';
import * as path from 'path';

interface Site {
  name: string;
  url: string;
  why: string;
}

interface Config {
  categories: Record<string, Site[]>;
}

async function loadConfig(): Promise<Config> {
  const configPath = path.join(process.cwd(), 'config', 'world-class-sites.json');
  const content = await fs.readFile(configPath, 'utf-8');
  return JSON.parse(content);
}

async function extractSite(extractor: WebsiteExtractor, site: Site, category: string): Promise<void> {
  console.log(`\n→ Extracting ${site.name} (${category})`);
  console.log(`  URL: ${site.url}`);
  
  try {
    const outputDir = path.join('library', 'extracted', category, site.name.toLowerCase().replace(/\s+/g, '-'));
    await extractor.extract({
      url: site.url,
      name: site.name,
      outputDir
    });
    console.log(`  ✓ Saved to ${outputDir}`);
  } catch (err) {
    console.error(`  ✗ Failed: ${err}`);
  }
}

async function main() {
  const config = await loadConfig();
  const extractor = new WebsiteExtractor();
  
  console.log('═══════════════════════════════════════════');
  console.log('  KNOX DESIGN AGENT — Batch Extraction');
  console.log('═══════════════════════════════════════════');
  
  const allSites: { site: Site; category: string }[] = [];
  for (const [category, sites] of Object.entries(config.categories)) {
    sites.forEach(site => allSites.push({ site, category }));
  }
  
  console.log(`\nTotal sites: ${allSites.length}`);
  console.log('Starting extraction...\n');
  
  await extractor.init();
  
  for (const { site, category } of allSites) {
    await extractSite(extractor, site, category);
    await new Promise(r => setTimeout(r, 2000)); // Rate limiting
  }
  
  await extractor.close();
  
  console.log('\n═══════════════════════════════════════════');
  console.log('  Extraction Complete');
  console.log('═══════════════════════════════════════════');
}

main().catch(console.error);
