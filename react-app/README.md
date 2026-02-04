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

## Build

```bash
npm run build
```

Build output goes to `react-app/dist/`.

## How It Works

The React app loads `public/headless-detector.js` which contains the detection logic. This file is a copy of `scripts/headless-detector.js` from the root project.

### Keeping Detection Logic in Sync

When updating the detection logic, ensure both files stay synchronized:

1. Make changes to `scripts/headless-detector.js` (source of truth)
2. Copy the updated file to `react-app/public/headless-detector.js`

```bash
cp scripts/headless-detector.js react-app/public/headless-detector.js
```

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
│   └── headless-detector.js  # Detection script (copy from scripts/)
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
