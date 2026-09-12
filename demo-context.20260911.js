// Adapt the existing inquiry page without adding fields or changing submission handling.
(() => {
  if (new URLSearchParams(window.location.search).get('product') !== '9-line') return;
  document.title = 'Request a 9/Line Demo | EMT919';
  const main = document.getElementById('main-content');
  if (!main) return;
  // Keep the visible brand slash red without inserting markup into plain-text fields.
  const setBrandedText = (element, text) => {
    const copy = document.createElement('span');
    copy.className = 'nine-brand-copy';
    for (const part of text.split(/(9\/Line)/gi)) {
      if (/^9\/Line$/i.test(part)) {
        const brand = document.createElement('span');
        brand.className = 'nine-brand-name';
        const slash = document.createElement('span');
        slash.className = 'nine-brand-slash';
        slash.textContent = '/';
        brand.append(part[0], slash, part.slice(2));
        copy.append(brand);
      } else copy.append(part);
    }
    element.replaceChildren(copy);
  };
  const hero = main.querySelector('.page-hero');
  setBrandedText(hero.querySelector('.eyebrow'), '9/Line agency demo');
  setBrandedText(hero.querySelector('h1'), 'See 9/Line for your agency.');
  setBrandedText(hero.querySelector('p:last-child'), 'Explore 9/Line Officer and Team. We’ll review your priorities and confirm the available configuration.');
  main.querySelector('.demo-form h2').textContent = 'Request a demo.';
  main.querySelector('button[type="submit"]').textContent = 'Request a demo';
  const message = main.querySelector('textarea[name="message"]');
  if (!message.value) message.value = '9/Line demo request\nPackage interest: 9/Line Officer / 9/Line Team\nPriorities: ';
  for (const link of document.querySelectorAll('a[href="/demo"]')) {
    link.href = '/demo?product=9-line';
    link.textContent = 'Request a demo';
  }
})();
