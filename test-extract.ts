/**
 * Test extraction on a single site
 */

import { WebsiteExtractor } from './src/extractor/website';

async function test() {
  const extractor = new WebsiteExtractor();
  
  console.log('Testing extraction on Linear.app...');
  
  try {
    await extractor.init();
    
    const result = await extractor.extract({
      url: 'https://linear.app',
      name: 'Linear',
      outputDir: 'library/test/linear'
    });
    
    console.log('\n✓ Extraction complete!');
    console.log(`Colors found: ${result.tokens.colors.length}`);
    console.log(`Typography styles: ${result.tokens.typography.length}`);
    console.log(`Spacing values: ${result.tokens.spacing.length}`);
    console.log(`Components: ${result.components.length}`);
    console.log(`\nTop colors:`);
    result.tokens.colors.slice(0, 5).forEach(c => {
      console.log(`  ${c.hex} — ${c.frequency} uses`);
    });
    
  } catch (err) {
    console.error('Extraction failed:', err);
  } finally {
    await extractor.close();
  }
}

test();
