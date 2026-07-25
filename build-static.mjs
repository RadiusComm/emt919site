import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, cp, readdir, unlink } from "node:fs/promises";
import { join } from "node:path";

const root = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const publicDir = join(root, "public");
const staticDirs = [join(root, "dist", "static"), join(root, "netlify-dist")];
const sourceFiles = (await readdir(publicDir)).filter((name) => name.endsWith(".html"));
const css = await readFile(join(root, "app", "globals.css"), "utf8");
const cssHash = createHash("sha256").update(css).digest("hex").slice(0, 10);
const cssFile = `styles.${cssHash}.css`;

const primaryLinks = `
  <a href="/how-it-works">How it works</a>
  <a href="/solutions">Solutions</a>
  <a href="/security">Trust center</a>
  <a href="/resources">Resources</a>
  <a href="/news">News</a>
  <a href="/company">Company</a>`;

const siteHeader = `
<header class="site-header no-print">
  <a class="brand" href="/" aria-label="EMT919 home"><span class="brand-shield" aria-hidden="true">919</span><span>EMT<span class="brand-accent">919</span></span></a>
  <nav class="desktop-nav" aria-label="Primary navigation">${primaryLinks}
  </nav>
  <a class="button button-small header-cta" href="/demo">Request a briefing</a>
  <details class="mobile-menu">
    <summary aria-label="Open navigation"><span>Menu</span><b aria-hidden="true">☰</b></summary>
    <nav aria-label="Mobile navigation">${primaryLinks}
      <a class="mobile-cta" href="/demo">Request a briefing</a>
    </nav>
  </details>
</header>`;

const siteFooter = `
<footer class="site-footer no-print">
  <div class="footer-brand"><div class="brand"><span class="brand-shield" aria-hidden="true">919</span><span>EMT<span class="brand-accent">919</span></span></div><p>Emergency MultiTranslator.<br>A service of Fast Dial, Inc. d/b/a City919.</p></div>
  <div><strong>CONTACT</strong><a href="mailto:contact@emt919.com">contact@emt919.com</a><a href="mailto:security@city919.com">security@city919.com</a><a href="mailto:privacy@city919.com">privacy@city919.com</a><a href="/support">Agency support</a><a href="/company">Company</a></div>
  <div><strong>RESOURCES</strong><a href="/privacy">Privacy</a><a href="/security">Security</a><a href="/government-data">Government data</a><a href="/vulnerability-disclosure">Vulnerability disclosure</a><a href="/accessibility">Accessibility</a><a href="/procurement">Procurement</a><a href="/terms">Website terms</a></div>
  <p class="copyright">© 2026 EMT919. All rights reserved.</p>
</footer>`;

const descriptions = {
  "animal-code.html": "EMT919 language access for animal control and code enforcement teams during field contacts.",
  "demo.html": "Request an EMT919 agency briefing covering call flow, security, deployment, and procurement.",
  "schools-campus.html": "EMT919 language access for school safety and campus public-safety teams.",
  "thanks.html": "Your EMT919 agency briefing request has been received."
};

function routeFor(name) {
  return name === "index.html" ? "/" : `/${name.replace(/\.html$/, "")}`;
}

function cleanLinks(html) {
  return html
    .replace(/href="\/index\.html(?=[#"])/g, 'href="/')
    .replace(/href="\/pricing(?:\.html)?(?=[#"])/g, 'href="/service-options')
    .replace(/href="\/([a-z0-9-]+)\.html(#[^"]*)?"/gi, 'href="/$1$2"')
    .replace(/action="\/thanks\.html"/g, 'action="/thanks"');
}

function normalizePage(name, source) {
  const route = name === "pricing.html" ? "/service-options" : routeFor(name);
  const canonical = `https://emt.city919.com${route}`;
  let html = source.replace(/\r\n/g, "\n");

  html = html.replace(/<link[^>]+href="\/styles(?:\.[a-f0-9]+)?\.css"[^>]*>/i, `<link rel="stylesheet" href="/${cssFile}">`);
  if (!new RegExp(`href="/${cssFile.replace(".", "\\.")}"`).test(html)) {
    html = html.replace("</head>", `  <link rel="stylesheet" href="/${cssFile}">\n</head>`);
  }

  html = html.replace(/<link rel="canonical"[^>]*>\s*/i, "");
  html = html.replace("</head>", `  <link rel="canonical" href="${canonical}">\n</head>`);

  if (!/<meta\s+name="description"/i.test(html)) {
    const description = descriptions[name] || "EMT919 provides agency-configured phone-based language access for public-safety field communication.";
    html = html.replace("</title>", `</title>\n  <meta name="description" content="${description}">`);
  }

  html = html.replace(/<header class="site-header">[\s\S]*?<\/header>/i, siteHeader);
  if (!/<header[^>]*class="[^"]*\bsite-header\b[^"]*"/i.test(html)) {
    html = html.replace(/(<body[^>]*>\s*)/i, `$1${siteHeader}\n`);
  }

  html = html.replace(/<footer(?![^>]*class="sheet-footer")[^>]*>[\s\S]*?<\/footer>/gi, "");
  html = html.replace("</body>", `${siteFooter}\n</body>`);

  const mainId = /<main[^>]*\sid="([^"]+)"/i.exec(html)?.[1];
  const existingTarget = /\sid="(main-content|content)"/i.exec(html)?.[1];
  if (!mainId && !existingTarget && /<main/i.test(html)) {
    html = html.replace(/<main(?![^>]*\sid=)/i, '<main id="main-content"');
  }
  const targetId = mainId || existingTarget || "main-content";
  if (/<a class="skip-link"/i.test(html)) {
    html = html.replace(/<a class="skip-link"[^>]*>[\s\S]*?<\/a>/i, `<a class="skip-link" href="#${targetId}">Skip to content</a>`);
  } else {
    html = html.replace(siteHeader, `<a class="skip-link" href="#${targetId}">Skip to content</a>\n${siteHeader}`);
  }

  if (name === "index.html" && !/application\/ld\+json/i.test(html)) {
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "EMT919",
      legalName: "Fast Dial, Inc.",
      url: "https://emt.city919.com/",
      email: "contact@emt919.com",
      description: "Phone-based language access for public-safety field communication."
    };
    html = html.replace("</head>", `  <script type="application/ld+json">${JSON.stringify(structuredData)}</script>\n</head>`);
  }

  return cleanLinks(html);
}

const normalizedFiles = {};
for (const name of sourceFiles) {
  normalizedFiles[name] = normalizePage(name, await readFile(join(publicDir, name), "utf8"));
}
normalizedFiles["service-options.html"] = normalizedFiles["pricing.html"];

for (const destination of staticDirs) {
  await mkdir(destination, { recursive: true });
  for (const name of await readdir(destination)) {
    if (/^styles\.[a-f0-9]{10}\.css$/.test(name) && name !== cssFile) {
      await unlink(join(destination, name));
    }
  }
  await cp(publicDir, destination, { recursive: true, force: true });
  for (const [name, html] of Object.entries(normalizedFiles)) {
    await writeFile(join(destination, name), html);
  }
  await writeFile(join(destination, "styles.css"), css);
  await writeFile(join(destination, cssFile), css);
}

const pages = {};
for (const [name, html] of Object.entries(normalizedFiles)) {
  const route = name === "index.html" ? "/" : `/${name}`;
  const cleanRoute = name === "index.html" ? "/" : `/${name.replace(/\.html$/, "")}`;
  pages[route] = html;
  pages[cleanRoute] = html;
}

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 72"><path fill="#0b5cff" d="M2 2h60v48L32 70 2 50z"/><text x="32" y="39" text-anchor="middle" fill="white" font-family="Arial" font-size="20" font-weight="800">919</text></svg>`;
const worker = `const pages=${JSON.stringify(pages)};const css=${JSON.stringify(css)};const cssFile=${JSON.stringify(`/${cssFile}`)};const favicon=${JSON.stringify(favicon)};export default{async fetch(request){const url=new URL(request.url);if(url.pathname==="/styles.css"||url.pathname===cssFile)return new Response(css,{headers:{"content-type":"text/css; charset=utf-8","cache-control":"public, max-age=31536000, immutable"}});if(url.pathname==="/favicon.svg")return new Response(favicon,{headers:{"content-type":"image/svg+xml","cache-control":"public, max-age=86400"}});const page=pages[url.pathname]||pages[url.pathname.replace(/\\/$/,"")]||pages["/"];return new Response(page,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-cache"}})}};`;

await mkdir(join(root, "dist", "server"), { recursive: true });
await writeFile(join(root, "dist", "server", "index.js"), worker);
await cp(join(root, ".openai"), join(root, "dist", ".openai"), { recursive: true, force: true });
console.log(`Static EMT919 build ready: ${Object.keys(normalizedFiles).length} pages, ${cssFile}.`);