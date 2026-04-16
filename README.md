# Knox Design Agent

AI-powered design agent for Knox Holding Company.

## Mission

Extract, analyze, and learn from world-class design systems to power Knox Creative and all Knox subsidiaries.

## Features

- **Extraction Pipeline**: Pull design tokens, components, and patterns from top websites
- **Design Library**: Curated collection of world-class design systems
- **AI Analysis**: Claude-powered synthesis of design patterns
- **Export**: Design tokens, components, and guidelines for Knox projects

## Architecture

```
knox-design-agent/
├── extractor/          # Playwright-based extraction
├── analyzer/          # Claude-powered analysis
├── library/           # Curated design collection
├── exporter/          # Export to tokens/components
└── api/              # REST API for Knox services
```

## Quick Start

```bash
npm install
npm run dev
```

## License

MIT
