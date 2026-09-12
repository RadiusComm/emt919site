// Presentation only. No app, carrier, analytics or form-submission requests.
(() => {
  const bar = document.querySelector('[data-mobile-demo]');
  const hero = document.getElementById('overview');
  const final = document.getElementById('briefing');
  const footer = document.getElementById('site-footer');
  if (!bar || !hero || !final || !footer || !('IntersectionObserver' in window)) return;
  const mobile = window.matchMedia('(max-width: 600px)');
  const visible = new Map([[hero,true],[final,false],[footer,false]]);
  const sync = () => { bar.hidden = !mobile.matches || [...visible.values()].some(Boolean); };
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) visible.set(entry.target, entry.isIntersecting);
    sync();
  });
  for (const target of visible.keys()) observer.observe(target);
  mobile.addEventListener('change', sync);
  window.addEventListener('pageshow', sync);
  sync();
})();
