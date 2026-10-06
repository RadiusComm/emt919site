const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const urls = new Set();
for (const filename of fs.readdirSync(root).filter(name => name.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(root, filename), 'utf8');
  if (/<meta\s+name="robots"[^>]+noindex/i.test(html)) continue;
  const canonical = html.match(/<link\s+rel="canonical"\s+href="(https:\/\/emt919\.com[^"<>]*)"/i)?.[1];
  if (canonical) urls.add(canonical);
}
const escape = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;');
fs.writeFileSync(path.join(root, 'site-sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + [...urls].sort().map(url => '<url><loc>' + escape(url) + '</loc></url>').join('\n') + '\n</urlset>\n');
console.log('Static sitemap updated: ' + urls.size + ' existing pages.');
