import { mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join, extname, basename } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
export const assetName = (name, data) => `${basename(name, extname(name))}.${createHash('sha256').update(data).digest('hex').slice(0, 16)}${extname(name)}`;

export async function build(outputDir = join(root, 'dist'), { production = false } = {}) {
  // Start clean so removed assets and repository files cannot leak into a release.
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(join(outputDir, 'assets/cache'), { recursive: true });
  await mkdir(join(outputDir, 'assets/branding'), { recursive: true });
  const hashedAsset = async (name, data) => {
    const path = `/assets/cache/${assetName(name, data)}`;
    await writeFile(join(outputDir, path), data);
    return path;
  };
  const entries = [['src/expedition.html', 'index.html', 'expedition']];
  const branding = new Map();
  let manifest = await readFile(join(root, 'site.webmanifest'), 'utf8');
  for (const name of ['carve-logo.webp', 'favicon-96.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'social-card.png', 'favicon.ico']) {
    const data = await readFile(join(root, 'assets/branding', name));
    const stablePath = name === 'favicon.ico' ? '/favicon.ico' : `/assets/branding/${name}`;
    await writeFile(join(outputDir, stablePath), data);
    // Social-card URLs remain stable for crawlers and existing shared links.
    if (name === 'social-card.png') continue;
    const path = await hashedAsset(name, data);
    branding.set(name, {stablePath, path});
    manifest = manifest.replaceAll(stablePath, path);
  }
  const telemetry = `
    <!-- Included Vercel page views and performance metrics; no paid custom events. -->
    <script>
      window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
      window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };
    </script>
    <script defer src="/_vercel/insights/script.js"></script>
    <script defer src="/_vercel/speed-insights/script.js"></script>
`;
  for (const [entry, destination, assetPrefix] of entries) {
    let source = await readFile(join(root, entry), 'utf8');
    if (production) {
      // Preview pages stay unindexed; only the explicit production build is public.
      source = source.replace('Endless Expedition preview</title>', 'Endless Expedition</title>')
        .replace('content="noindex,nofollow"', 'content="index,follow"')
        .replace(/experimental · endless expedition/gi, 'endless expedition');
    }
    for (const [name, {stablePath, path}] of branding) source = source.replaceAll(`../assets/branding/${name}`, path).replaceAll(`"${stablePath}"`, `"${path}"`);
    const css = source.match(/<style>([\s\S]*?)<\/style>/);
    const script = source.match(/<script>([\s\S]*?)<\/script>/);
    if (!css || !script) throw new Error('Expected self-contained styles and game script in ' + entry);
    const cssPath = await hashedAsset(assetPrefix + '.css', css[1]);
    const scriptPath = await hashedAsset(assetPrefix + '.js', script[1]);
    source = source.replace(css[0], `<link rel="stylesheet" href="${cssPath}" />`).replace(script[0], `<script defer src="${scriptPath}"></script>`);
    await mkdir(join(outputDir, destination, '..'), {recursive:true});
    await writeFile(join(outputDir, destination), source.replace('</head>', `${telemetry}</head>`));
  }
  await writeFile(join(outputDir, 'site.webmanifest'), manifest);
  for (const file of ['robots.txt', 'sitemap.xml', 'googlefd0692e33131ffd2.html']) {
    await copyFile(join(root, file), join(outputDir, file));
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await build(undefined, {production:process.env.VERCEL_ENV === 'production'});
  console.log('Built static game with content-addressed assets in dist/');
}
