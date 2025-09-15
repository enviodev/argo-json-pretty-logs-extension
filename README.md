## Argo CD JSON Pretty Logs (Chrome Extension)

Colorizes and prettifies JSON-formatted log lines in the Argo CD UI. It finds log `<code>` blocks, parses JSON, and renders a readable, color-coded `<pre>` with a MutationObserver to handle new lines as they appear.

### Features

- Highlights keys, strings, numbers, booleans, null, and punctuation
- Formats large numbers with thousands separators (e.g., `42137200` → `42,137,200`)
- Auto-detects JSON in common Argo logs containers (e.g., `div.noscroll code`)
- Continues enhancing as new logs stream in

### Folder layout

- `public/manifest.json` — MV3 manifest
- `src/content.ts` — content script (TypeScript)
- `public/styles/content.css` — token colors and base styling
- `public/dist/content.js` — built bundle (generated)

### Build

```
npm install
npm run build
```

This produces `public/dist/content.js` that the manifest references.

### Load in Chrome (Developer mode)

1. Open Chrome → `chrome://extensions`
2. Enable Developer mode
3. Click "Load unpacked" and select:
   `/Users/denham/Documents/projects/envio/code/argo-json-pretty-logs-extension/public`

If you change code later, re-run `npm run build` and hit the "Reload" button on the extension card.

### Enable/Disable

- Right-click the extension icon in the Chrome toolbar to open its context menu.
- Choose "Enable Pretty JSON" or "Disable Pretty JSON". The badge shows `ON`/`OFF`.
- The setting persists via `chrome.storage.local` and content pages update live without refresh.

### Usage

Navigate to your Argo CD application logs page. The extension will:

- Detect single-line JSON log entries inside `<code>` elements
- Hide the original `<code>` and insert a pretty, colored `<pre>` right after it

To verify it’s active, open DevTools Console and run:

```
document.querySelectorAll('.argo-json-container').length
```

### Tweaks

- Update colors in `public/styles/content.css`
- Adjust selectors in `src/content.ts` (`findLogCodeBlocks`) to match your exact Argo UI
- Narrow URL matches in `public/manifest.json` if desired

### Notes

- The script conservatively tries to parse only text that looks like JSON. If a log line isn’t valid JSON, it is left untouched.

### License

MIT © Denham Preen
