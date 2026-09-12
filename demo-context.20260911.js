// Adapt the existing inquiry page without adding fields or changing submission handling.
(() => {
  if (new URLSearchParams(window.location.search).get('product') !== '9-line') return;
  document.title = 'Request a 9/Line Demo | EMT919';
  const main = document.getElementById('main-content');
  if (!main) return;
  const hero = main.querySelector('.page-hero');
  hero.querySelector('.eyebrow').textContent = '9/Line agency demo';
  hero.querySelector('h1').textContent = 'See 9/Line for your agency.';
  hero.querySelector('p:last-child').textContent = 'Explore Officer and Advanced Officer packages. We will review your priorities, show available workflows and confirm feature availability and activation requirements.';
  main.querySelector('.demo-form h2').textContent = 'Request a demo.';
  main.querySelector('button[type="submit"]').textContent = 'Request a demo';
  const message = main.querySelector('textarea[name="message"]');
  if (!message.value) message.value = '9/Line demo request\nPackage interest: Officer / Advanced Officer\nPriorities: ';
  for (const link of document.querySelectorAll('a[href="/demo"]')) {
    link.href = '/demo?product=9-line';
    link.textContent = 'Request a demo';
  }
})();
