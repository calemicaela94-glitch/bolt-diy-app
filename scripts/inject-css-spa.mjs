/**
 * Script: inject-css-spa.mjs
 *
 * CRÍTICO para APK/Capacitor: O Remix SPA mode (ssr: false) não
 * inclui <link rel="stylesheet"> no index.html gerado. As folhas
 * de estilo são adicionadas dinamicamente pelo <Links/> APÓS a
 * hidratação React, o que não funciona no WebView Android (file://).
 *
 * Este script lê o index.html gerado e injeta <link> tags para
 * todos os ficheiros .css em build/client/assets/, garantindo
 * que o CSS carrega mesmo offline no APK.
 *
 * Usage: node scripts/inject-css-spa.mjs [build-dir]
 *   Default build-dir: build/client
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const clientDir = resolve(process.argv[2] || 'build/client');
const htmlPath = join(clientDir, 'index.html');

if (!existsSync(htmlPath)) {
  console.error(`ERROR: index.html not found at ${htmlPath}`);
  console.error('Make sure the Remix SPA build completed before running this script.');
  process.exit(1);
}

const assetsDir = join(clientDir, 'assets');

if (!existsSync(assetsDir)) {
  console.warn(`WARNING: assets dir not found at ${assetsDir}, skipping CSS injection`);
  process.exit(0);
}

// Get all CSS files, sorted by size (largest first = main styles first)
const cssFiles = readdirSync(assetsDir)
  .filter((f) => f.endsWith('.css'))
  .map((f) => ({
    name: f,
    size: statSync(join(assetsDir, f)).size,
  }))
  .sort((a, b) => b.size - a.size);

if (cssFiles.length === 0) {
  console.warn('WARNING: No CSS files found in assets/, skipping CSS injection');
  process.exit(0);
}

// Build <link> tags for each CSS file (relative paths for file:// protocol)
const linkTags = cssFiles
  .map((f) => `  <link rel="stylesheet" href="./assets/${f.name}">`)
  .join('\n');

let html = readFileSync(htmlPath, 'utf-8');

// Inject CSS before </head>
const headCloseIdx = html.indexOf('</head>');

if (headCloseIdx === -1) {
  console.error('ERROR: Could not find </head> in index.html');
  process.exit(1);
}

const injection = `\n  <!-- Injected CSS (critical for Capacitor/APK offline mode - file:// protocol) -->\n${linkTags}\n`;

html = html.slice(0, headCloseIdx) + injection + html.slice(headCloseIdx);

writeFileSync(htmlPath, html, 'utf-8');

console.log(`✓ Injected ${cssFiles.length} CSS files into index.html:`);
cssFiles.forEach((f) => console.log(`  - ./assets/${f.name} (${(f.size / 1024).toFixed(1)} KB)`));

// Verify no absolute paths remain
if (html.includes('href="/assets/')) {
  console.warn('WARNING: Absolute paths (href="/assets/...) found in index.html!');
  console.warn('These will NOT work with file:// protocol in Capacitor WebView.');
  console.warn('Check vite.config.spa.ts: ensure base: \'./\' is set.');
} else {
  console.log('✓ All asset paths are relative (safe for file:// protocol)');
}
