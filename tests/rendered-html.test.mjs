import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { extname } from "node:path";
import test from "node:test";

const root = new URL("../", import.meta.url);
const publicRoot = new URL("../public/", import.meta.url);
const outputRoot = new URL("../netlify-dist/", import.meta.url);

test("build publishes the complete EMT919 static site", async () => {
  const publicFiles = await readdir(publicRoot);
  const outputFiles = await readdir(outputRoot);
  const htmlFiles = publicFiles.filter((name) => extname(name) === ".html");

  assert.ok(htmlFiles.length >= 20);
  assert.ok(outputFiles.includes("styles.css"));
  assert.ok(outputFiles.includes("emt919-field-hero.jpg"));
  assert.ok(outputFiles.includes("scenario-traffic.jpg"));
  assert.ok(outputFiles.includes("scenario-ems.jpg"));
  assert.ok(outputFiles.includes("scenario-corrections.jpg"));

  for (const name of htmlFiles) {
    await access(new URL(name, outputRoot));
  }
});

test("homepage presents the first-minute workflow and evidence boundaries", async () => {
  const html = await readFile(new URL("index.html", outputRoot), "utf8");
  assert.match(html, /Keep control<br>of the scene/i);
  assert.match(html, /What happens<br>after #919/i);
  assert.match(html, /representative demonstration/i);
  assert.match(html, /Watch a 60-second call/i);
  assert.match(html, /depend on agency configuration, network conditions, and contracted services/i);
  assert.doesNotMatch(html, /2,100\+/i);
  assert.doesNotMatch(html, /class="neutrality-promo/i);
  assert.match(html, /name="emt919-demo"/i);
  assert.match(html, /netlify-honeypot=/i);
  assert.doesNotMatch(html, /class="hero-device|class="phone"|READY FOR DUTY/i);
  assert.doesNotMatch(html, /\bpilot(s|ing)?\b/i);
});

test("trust, service-option, audience, product, and resource pages are present", async () => {
  const required = [
    "security.html",
    "privacy.html",
    "accessibility.html",
    "responsible-ai.html",
    "subprocessors.html",
    "government-data.html",
    "vulnerability-disclosure.html",
    "terms.html",
    "pricing.html",
    "evidentiary-package.html",
    "neutrality-testing.html",
    "languages.html",
    "procurement.html",
    "how-it-works.html",
    "law-enforcement.html",
    "ems-fire.html",
    "corrections.html",
    "schools-campus.html",
    "animal-code.html",
    "first-minute-guide.html",
    "language-access-policy-guide.html",
    "procurement-checklist.html",
    "product-sheet.html",
    "news.html",
  ];

  for (const name of required) {
    const html = await readFile(new URL(name, outputRoot), "utf8");
    assert.match(html, /<title>.+<\/title>/i, name);
    assert.match(html, /class="skip-link"/i, name);
  }

  const security = await readFile(new URL("security.html", outputRoot), "utf8");
  assert.match(security, /does not currently hold its own SOC 2 report/i);
  assert.match(security, /Provider certifications apply to the named providers/i);

  const pricing = await readFile(new URL("pricing.html", outputRoot), "utf8");
  const pricingText = pricing.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  assert.match(pricingText, /AI-first interpretation/i);
  assert.match(pricingText, /AI \+ EMT Live Translation/i);
  assert.match(pricingText, /AI \+ your interpreter provider/i);
  assert.match(pricingText, /Evidentiary Package/i);
  assert.doesNotMatch(pricingText, /\$\s*\d/i);
  assert.match(pricing, /name="emt919-quote"/i);

  const evidentiary = await readFile(new URL("evidentiary-package.html", outputRoot), "utf8");
  assert.match(evidentiary, /does not represent that any record is admissible/i);
  assert.match(evidentiary, /chain-of-custody/i);
  assert.match(evidentiary, /Live expert testimony is not part of the package/i);

  const neutrality = await readFile(new URL("neutrality-testing.html", outputRoot), "utf8");
  assert.match(neutrality, /2,100\+/i);
  assert.match(neutrality, /Influence attempts tested in each direction/i);
  assert.match(neutrality, /not customer outcome statistics/i);

  const languages = await readFile(new URL("languages.html", outputRoot), "utf8");
  assert.match(languages, /31 AI languages\. 300\+ with live interpreters/i);
  assert.match(languages, /Haitian Creole/i);
  assert.match(languages, /Mandarin Chinese/i);

  const subprocessors = await readFile(new URL("subprocessors.html", outputRoot), "utf8");
  assert.match(subprocessors, /Bandwidth/i);
  assert.match(subprocessors, /Twilio/i);
  assert.match(subprocessors, /EMT Live/i);
  assert.doesNotMatch(subprocessors, /ElevenLabs/i);

  const privacy = await readFile(new URL("privacy.html", outputRoot), "utf8");
  assert.match(privacy, /30-day rolling deletion by default/i);
  assert.match(privacy, /additional storage option/i);

  const governmentData = await readFile(new URL("government-data.html", outputRoot), "utf8");
  assert.match(governmentData, /Government customers retain ownership/i);
  assert.match(governmentData, /public-records or freedom-of-information/i);

  const vulnerability = await readFile(new URL("vulnerability-disclosure.html", outputRoot), "utf8");
  assert.match(vulnerability, /security@city919\.com/i);
  assert.match(vulnerability, /Safe harbor/i);

  const news = await readFile(new URL("news.html", outputRoot), "utf8");
  assert.match(news, /Useful guidance\. No filler\./i);
  assert.match(news, /Editorial standard/i);
  assert.doesNotMatch(news, /testimonial|trusted by/i);
});

test("all root-relative internal page links resolve", async () => {
  const htmlFiles = (await readdir(outputRoot)).filter((name) => name.endsWith(".html"));
  const known = new Set(htmlFiles);

  for (const name of htmlFiles) {
    const html = await readFile(new URL(name, outputRoot), "utf8");
    const links = [...html.matchAll(/href="(\/[^"#?]+\.html)"/g)].map((match) =>
      match[1].slice(1),
    );
    for (const link of links) {
      assert.ok(known.has(link), `${name} links to missing ${link}`);
    }
  }
});

test("source does not publish pilot language or fabricated customer proof", async () => {
  const htmlFiles = (await readdir(publicRoot)).filter((name) => name.endsWith(".html"));
  const combined = (
    await Promise.all(htmlFiles.map((name) => readFile(new URL(name, publicRoot), "utf8")))
  ).join("\n");

  assert.doesNotMatch(combined, /\bpilot(s|ing)?\b/i);
  assert.doesNotMatch(combined, /trusted by \d+/i);
  assert.doesNotMatch(combined, /anonymous testimonial/i);
  assert.doesNotMatch(combined, /\$\s*\d/i);
  assert.doesNotMatch(combined, /ElevenLabs/i);
  assert.doesNotMatch(combined, /Carl|Bubeck|carlb@|610-517-2874|tel:\+/i);
  await access(new URL("app/globals.css", root));
});

test("generated pages share a complete responsive shell and current metadata", async () => {
  const outputFiles = await readdir(outputRoot);
  const hashedStyle = outputFiles.find((name) => /^styles\.[a-f0-9]{10}\.css$/.test(name));
  assert.ok(hashedStyle, "fingerprinted stylesheet is present");

  const css = await readFile(new URL(hashedStyle, outputRoot), "utf8");
  assert.ok(css.length > 20000, "complete stylesheet is published");
  assert.match(css, /@media \(max-width: 680px\)/);
  assert.match(css, /\.page-hero/);
  assert.match(css, /\.mobile-menu/);
  assert.match(css, /scroll-snap-type: x proximity/);
  assert.match(css, /width: min\(100%,300px\)/);

  const htmlFiles = outputFiles.filter((name) => name.endsWith(".html"));
  for (const name of htmlFiles) {
    const html = await readFile(new URL(name, outputRoot), "utf8");
    assert.match(html, /<header class="site-header no-print">/i, name);
    assert.match(html, /<footer class="site-footer no-print">/i, name);
    assert.equal((html.match(/<header class="site-header no-print">/gi) || []).length, 1, `${name} has one site header`);
    assert.equal((html.match(/<footer class="site-footer no-print">/gi) || []).length, 1, `${name} has one site footer`);
    assert.match(html, /<meta name="description"/i, name);
    assert.match(html, /<link rel="canonical" href="https:\/\/emt\.city919\.com\//i, name);
    assert.match(html, new RegExp(`href="/${hashedStyle.replaceAll(".", "\\.")}"`), name);
    assert.doesNotMatch(html, /Carl|Bubeck|carlb@|610-517-2874|tel:\+/i, name);
  }

  await access(new URL("service-options.html", outputRoot));
});