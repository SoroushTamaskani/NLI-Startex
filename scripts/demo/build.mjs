/**
 * Builds the clickable demo of NLI as one self-contained HTML file.
 *
 * The demo is the real app with one swap: src/lib/api.ts is replaced by
 * scripts/demo/api.ts, which never calls the server and answers the example
 * questions with clearly labelled sample results. No Gemini key is needed.
 *
 *   npm run build:demo
 *
 * Output (in dist-demo/):
 *   nli-demo.html          page body for a Claude Artifact (the viewer adds <html>/<head>)
 *   nli-demo-standalone.html  full page you can open directly in a browser
 */
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const outDir = path.join(root, 'dist-demo');
const bundleDir = path.join(outDir, 'bundle');
const realApi = path.join(root, 'src/lib/api');
const demoApi = path.join(here, 'api.ts');

const swapApi = {
  name: 'nli-demo-api',
  enforce: 'pre',
  resolveId(source, importer) {
    if (!importer || !/\/lib\/api$/.test(source)) return null;
    return path.resolve(path.dirname(importer), source) === realApi ? demoApi : null;
  },
};

await build({
  root,
  configFile: false,
  logLevel: 'warn',
  plugins: [swapApi, react(), tailwindcss()],
  build: {
    outDir: bundleDir,
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    modulePreload: false,
    chunkSizeWarningLimit: 5000,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});

const assets = path.join(bundleDir, 'assets');
const read = ext => fs.readFileSync(path.join(assets, fs.readdirSync(assets).find(f => f.endsWith(ext))), 'utf8');
const js = read('.js')
  .replaceAll('</script', '<\\/script')
  // Artifact publishing rejects the raw U+FFFD character; the escape means the same in JS strings.
  .replaceAll('�', '\\uFFFD');
const css = read('.css');

const body = `<title>NLI · No Lie AI</title>
<meta name="description" content="Demo of NLI (No Lie AI), a kid-friendly fact-checker that shows its sources.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Quicksand:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap">
<style>
${css}
/* Demo build: NLI keeps one bright look in both themes, by design. */
:root { color-scheme: light; }
.nli-demo-pill {
  position: fixed; z-index: 90; left: 50%; transform: translateX(-50%);
  top: calc(env(safe-area-inset-top, 0px) + 22px);
  padding: 4px 12px; border-radius: 999px; pointer-events: none;
  background: var(--color-kids-purple); color: var(--color-ink);
  font: 700 11px/1.4 var(--font-sans); letter-spacing: 0.08em; text-transform: uppercase;
}
@media (max-width: 760px) { .nli-demo-pill { display: none; } }
</style>
<div id="root"></div>
<div class="nli-demo-pill" aria-hidden="true">Demo · sample answers</div>
<script type="module">
${js}
</script>
`;

fs.writeFileSync(path.join(outDir, 'nli-demo.html'), body);
fs.writeFileSync(
  path.join(outDir, 'nli-demo-standalone.html'),
  `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n${body}</body>\n</html>\n`,
);
fs.rmSync(bundleDir, { recursive: true, force: true });
console.log(`Demo written to ${path.relative(root, outDir)}/ (nli-demo.html, nli-demo-standalone.html)`);
