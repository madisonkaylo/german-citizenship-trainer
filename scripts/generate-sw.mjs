import { readdir, writeFile } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'

const root = new URL('../dist/', import.meta.url).pathname
const base = `/${(process.env.VITE_BASE_PATH || '').replace(/^\/+|\/+$/g, '')}${process.env.VITE_BASE_PATH ? '/' : ''}`

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries.map(entry => entry.isDirectory() ? walk(join(directory, entry.name)) : join(directory, entry.name)))
  return files.flat()
}

const assets = (await walk(root))
  .filter(file => !file.endsWith('/sw.js'))
  .map(file => `${base}${relative(root, file).split(sep).join('/')}`)
  .sort()

const source = `const CACHE = 'einfach-deutschland-v1';
const ASSETS = ${JSON.stringify(assets)};
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if (response.ok && new URL(event.request.url).origin === self.location.origin) caches.open(CACHE).then(cache => cache.put(event.request, response.clone()));
    return response;
  }).catch(() => event.request.mode === 'navigate' ? caches.match('${base}index.html') : Response.error())));
});
`

await writeFile(join(root, 'sw.js'), source)
console.log(`service worker precaches ${assets.length} release assets`)
