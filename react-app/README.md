# Headless Browser Detector - React UI

A React-based user interface for the headless browser detection library. This app displays real-time detection results for automation frameworks and headless browsers.

## Setup

```bash
cd react-app
npm install
```

## Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

**Note:** The `dev` script automatically syncs the detection script from `scripts/headless-detector.js` before starting the development server.

## Build

```bash
npm run build
```

Build output goes to `react-app/dist/`.

**Note:** The `build` script automatically syncs the detection script before building.

## How It Works

The React app loads `public/headless-detector.js` which contains the detection logic. This file is automatically synced from `scripts/headless-detector.js` via npm scripts.

### Automated Sync

The detection logic is kept in sync automatically:

- **`npm run sync`** - Manually sync the detection script
- **`npm run dev`** - Automatically syncs before starting dev server
- **`npm run build`** - Automatically syncs before building

This ensures `public/headless-detector.js` always matches the source of truth in `scripts/headless-detector.js`.

### Accessing Detection Results

The detection results are exposed globally for automation testing:

- `window.__headlessDetection` - Full detection results object
- `window.__headlessDetectionScore` - Numeric score (0.0 - 1.0)
- `document.documentElement.getAttribute('data-headless-score')` - DOM attribute
- `window.HeadlessDetector.checks.*` - Individual check functions

## Project Structure

```
react-app/
├── public/
│   └── headless-detector.js  # Detection script (auto-synced from scripts/)
├── src/
│   ├── components/           # React components
│   │   ├── DetectionCards.jsx
│   │   ├── Header.jsx
│   │   ├── Metadata.jsx
│   │   └── ScoreCard.jsx
│   ├── hooks/
│   │   └── useHeadlessDetection.js  # Detection hook (UI logic)
│   ├── App.jsx               # Main app component
│   ├── App.css               # App-specific styles
│   └── main.jsx              # Entry point
└── package.json
```
