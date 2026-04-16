/**
 * Ollama Cloud-Powered Design Analyzer
 * Synthesizes extracted data into design patterns
 */

import * as fs from 'fs/promises';
import * as path from 'path';

interface ExtractionData {
  metadata: { url: string; name: string; extractedAt: string };
  tokens: {
    colors: { hex: string; frequency: number }[];
    typography: { fontFamily: string; fontSize: string; element: string }[];
    spacing: { value: string; frequency: number }[];
  };
  components: { type: string; styles: Record<string, string> }[];
}

const OLLAMA_URL = 'https://api.ollama.com/v1/chat/completions';
const MODEL = 'kimi-k2.5:cloud';

async function callOllama(prompt: string): Promise<string> {
  const response = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: 'You are a design system expert. Analyze design extractions and provide structured insights.' },
        { role: 'user', content: prompt }
      ],
      stream: false
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

export async function analyzeDesign(extractionPath: string): Promise<string> {
  const data: ExtractionData = JSON.parse(await fs.readFile(extractionPath, 'utf-8'));
  
  const prompt = `Analyze this design extraction and provide a comprehensive design system summary:

SITE: ${data.metadata.name}
URL: ${data.metadata.url}

COLORS (${data.tokens.colors.length}):
${data.tokens.colors.slice(0, 20).map(c => `${c.hex} (${c.frequency} uses)`).join('\n')}

TYPOGRAPHY (${data.tokens.typography.length}):
${data.tokens.typography.slice(0, 15).map(t => `${t.element}: ${t.fontFamily} ${t.fontSize}`).join('\n')}

SPACING:
${data.tokens.spacing.slice(0, 10).map(s => s.value).join(', ')}

COMPONENTS:
${data.components.map(c => `- ${c.type}`).join('\n')}

Provide:
1. Design philosophy summary (2-3 sentences)
2. Primary color palette (5-7 core colors)
3. Typography system (font families, scale)
4. Spacing system (base unit, common values)
5. Key UI patterns observed
6. Design tokens as CSS variables
7. Recommendations for similar designs`;

  const analysis = await callOllama(prompt);
  
  // Save analysis
  const outputDir = path.dirname(extractionPath);
  await fs.writeFile(path.join(outputDir, 'analysis.md'), analysis);
  
  return analysis;
}

// Batch analyze all extractions
async function batchAnalyze() {
  const extractedDir = 'library/extracted';
  const categories = await fs.readdir(extractedDir);
  
  for (const category of categories) {
    const sites = await fs.readdir(path.join(extractedDir, category));
    for (const site of sites) {
      const extractionPath = path.join(extractedDir, category, site, 'extraction.json');
      try {
        await fs.access(extractionPath);
        console.log(`Analyzing ${category}/${site}...`);
        await analyzeDesign(extractionPath);
      } catch {
        // Skip if not extracted yet
      }
    }
  }
}

if (require.main === module) {
  batchAnalyze().catch(console.error);
}
