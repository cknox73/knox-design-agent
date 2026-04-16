# Knox Design Agent

AI-powered design agent for Knox Holding Company.

## Mission

Extract, analyze, and learn from world-class design systems to power Knox Creative and all Knox subsidiaries.

## Architecture

```
src/
├── extractor/          # Playwright-based extraction
│   ├── website.ts     # Core extraction engine
│   └── batch-extract.ts  # Process all sites
├── analyzer/          # Claude-powered analysis
│   └── synthesize.ts  # Design pattern synthesis
└── exporter/          # Export to tokens/components
    └── generate-tokens.ts

config/
└── world-class-sites.json  # 25+ curated sites

library/
└── extracted/         # Extracted design systems
```

## Features

- **Extraction Pipeline**: Pull design tokens, components from top websites
- **Token Extraction**: Colors, typography, spacing, shadows
- **Component Detection**: Buttons, cards, inputs, navbars, heroes, footers
- **Claude Analysis**: AI synthesis of design patterns
- **Design Library**: Curated collection of world-class systems

## Quick Start

```bash
npm install
npm run extract    # Extract all sites
npm run analyze    # Analyze with Claude
npm run export     # Generate tokens
```

## World-Class Sites (25+)

**Design Systems:** Apple, Google Material, Microsoft Fluent, IBM Carbon, Shopify Polaris, Adobe Spectrum, GitHub Primer, Figma

**SaaS Landing Pages:** Linear, Notion, Vercel, Stripe, Slack, Raycast

**E-commerce:** Apple Store, Nike, Allbirds, Glossier

**Creative Portfolios:** Awwwards, SiteInspire, Minimal Gallery, Godly

## License

MIT
