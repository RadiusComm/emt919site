// Progressive enhancement only. No analytics, geolocation, microphone or carrier access.
(() => {
 const menus = [...document.querySelectorAll('.nav-products, .mobile-menu')];
 document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  for (const menu of menus) if (menu.open) { menu.open = false; menu.querySelector('summary').focus(); }
 });
 document.addEventListener('click', event => { for (const menu of menus) if (menu.open && !menu.contains(event.target)) menu.open = false; });
 for (const menu of menus) menu.addEventListener('toggle', () => { if (menu.open) for (const other of menus) if (other !== menu) other.open = false; });
 const search = document.querySelector('[data-language-search]');
 if (search) {
  const entries = [...document.querySelectorAll('.language-grid > span')];
  const status = document.querySelector('[data-language-status]');
  const filter = () => {
   const term = search.value.trim().toLocaleLowerCase();
   let count = 0;
   for (const entry of entries) { entry.hidden = !entry.textContent.toLocaleLowerCase().includes(term); if (!entry.hidden) count++; }
   status.textContent = count ? `${count} listed language option${count === 1 ? '' : 's'}. Confirm availability for your agency.` : 'No matching language listed. Contact us to review live-interpreter options.';
  };
  search.addEventListener('input', filter); filter();
 }
 const category = document.querySelector('[data-resource-filter]');
 if (category) {
  const groups = [...document.querySelectorAll('[data-resource-group]')];
  const filter = () => {
   let count = 0;
   for (const group of groups) { group.hidden = category.value !== 'all' && group.dataset.resourceGroup !== category.value; if (!group.hidden) count += group.querySelectorAll('.resource-list > a').length; }
   document.querySelector('[data-resource-status]').textContent = `${count} resources shown.`;
  };
  category.addEventListener('change', filter); filter();
 }
 for (const button of document.querySelectorAll('[data-load-video]')) button.addEventListener('click', () => {
  const iframe = document.createElement('iframe'); iframe.src = 'https://www.youtube-nocookie.com/embed/unDpE__-7Ao?rel=0&playsinline=1'; iframe.title = 'EMT919 service overview'; iframe.allow = 'fullscreen; picture-in-picture'; iframe.allowFullscreen = true;
  button.closest('.video-frame').replaceChildren(iframe); iframe.focus();
 });
 // Netlify removes data-netlify/netlify-honeypot from the published markup.
 // Registered names survive that processing and scope the enhancement safely.
 for (const form of document.querySelectorAll('form[name="emt919-demo"], form[name="emt919-quote"]')) {
  const button = form.querySelector('button[type="submit"]'); if (!button) continue;
  const status = document.createElement('p'); status.className = 'full-field form-status'; status.tabIndex = -1; status.hidden = true; status.setAttribute('role', 'status'); form.append(status);
  let pending = false;
  form.addEventListener('submit', async event => {
   event.preventDefault(); if (pending || !form.reportValidity()) return;
   pending = true; form.setAttribute('aria-busy', 'true'); button.disabled = true; status.hidden = false; status.dataset.state = 'sending'; status.textContent = 'Sending your request…';
   const controller = new AbortController();
   const timeout = setTimeout(() => controller.abort(), 20000);
   try {
    const response = await fetch('/', { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(new FormData(form)).toString() });
    if (!response.ok) throw new Error('Submission not accepted');
    window.location.assign(form.getAttribute('action') || '/thanks');
   } catch {
    // Never silently retry: an interrupted response may still have been received.
    status.dataset.state = 'error'; status.textContent = 'We could not confirm delivery. Your entries are still here. Please try again, or email contact@emt919.com. If you retry, mention any earlier attempt.'; status.focus(); pending = false; button.disabled = false; form.removeAttribute('aria-busy');
   } finally { clearTimeout(timeout); }
  });
 }
})();
