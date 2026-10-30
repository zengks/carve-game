import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export function createGameServer() {
  return createServer(async (req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
    if (['/classic', '/classic/', '/classic/index.html', '/src/carve.html'].includes(path)) { res.writeHead(308, {Location:'/'}).end(); return; }
    const files = {
      '/': ['src/expedition.html', 'text/html; charset=utf-8'],
      '/expedition/': ['src/expedition.html', 'text/html; charset=utf-8'],
      '/robots.txt': ['robots.txt', 'text/plain; charset=utf-8'],
      '/sitemap.xml': ['sitemap.xml', 'application/xml; charset=utf-8'],
      '/site.webmanifest': ['site.webmanifest', 'application/manifest+json'],
      '/favicon.ico': ['assets/branding/favicon.ico', 'image/x-icon'],
    };
    for (const name of ['carve-logo.webp', 'favicon-96.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'social-card.png']) {
      files[`/assets/branding/${name}`] = [`assets/branding/${name}`, name.endsWith('.webp') ? 'image/webp' : 'image/png'];
    }
    const file = files[path];
    if (!file) { res.writeHead(404).end('Not found'); return; }
    try {
      const data = await readFile(new URL(`../${file[0]}`, import.meta.url));
      res.writeHead(200, { 'Content-Type': file[1], 'Cache-Control': 'no-store' });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch { res.writeHead(500).end('Unable to read game'); }
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 5173);
  createGameServer().listen(port, '127.0.0.1', () => console.log(`CARVE: http://127.0.0.1:${port}`));
}
