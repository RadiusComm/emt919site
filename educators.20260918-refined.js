// Education-page enhancements; the shared script retains Netlify submission handling.
(() => {
  const form = document.getElementById('school-demo');
  if (!form) return;
  const heading = document.getElementById('demo-title');
  const bar = document.querySelector('.edu-mobile-demo');
  const hero = document.querySelector('.edu-hero');
  const footer = document.querySelector('.site-footer');
  const smallScreen = matchMedia('(max-width:760px)');
  let heroVisible = true, formVisible = false, footerVisible = false;
  const update = () => {
    const typing = document.activeElement?.matches('input,select,textarea');
    bar.hidden = !smallScreen.matches || heroVisible || formVisible || footerVisible || typing;
  };
  if ('IntersectionObserver' in window && bar) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.target === hero) heroVisible = entry.isIntersecting;
        if (entry.target === form) formVisible = entry.isIntersecting;
        if (entry.target === footer) footerVisible = entry.isIntersecting;
      }
      update();
    });
    [hero,form,footer].forEach(element => { if (element) observer.observe(element); });
    smallScreen.addEventListener('change', update);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', () => requestAnimationFrame(update));
  }
  for (const link of document.querySelectorAll('a[href="#school-demo"], a[href="/educators#school-demo"]')) {
    link.addEventListener('click', () => {
      document.querySelectorAll('.mobile-menu[open]').forEach(menu => { menu.open = false; });
      // Preserve native fragment navigation and place keyboard focus at the form heading.
      requestAnimationFrame(() => heading.focus({ preventScroll:true }));
    });
  }
})();
