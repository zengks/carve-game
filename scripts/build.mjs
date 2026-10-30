import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';

// Publish only game assets; repository documents and test code stay private to GitHub.
await mkdir(new URL('../dist/', import.meta.url), { recursive: true });
const source = await readFile(new URL('../src/carve.html', import.meta.url), 'utf8');
const telemetry = `
    <!-- Vercel-hosted scripts update independently of the self-contained game. -->
    <script>
      window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
      window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };
    </script>
    <script defer src="/_vercel/insights/script.js"></script>
    <script defer src="/_vercel/speed-insights/script.js"></script>
`;
await writeFile(new URL('../dist/index.html', import.meta.url), source.replace('</head>', `${telemetry}</head>`));
for (const file of ['robots.txt', 'sitemap.xml', 'googlefd0692e33131ffd2.html', 'site.webmanifest']) {
  await copyFile(new URL(`../${file}`, import.meta.url), new URL(`../dist/${file}`, import.meta.url));
}
await mkdir(new URL('../dist/assets/branding/', import.meta.url), { recursive: true });
for (const file of ['carve-logo.webp', 'favicon-96.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'social-card.png']) {
  await copyFile(new URL(`../assets/branding/${file}`, import.meta.url), new URL(`../dist/assets/branding/${file}`, import.meta.url));
}
await copyFile(new URL('../assets/branding/favicon.ico', import.meta.url), new URL('../dist/favicon.ico', import.meta.url));
console.log('Built static game in dist/');
