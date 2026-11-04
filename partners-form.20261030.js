(() => {
 'use strict';
 const form = document.querySelector('form[name="emt919-partners"]');
 if (!form) return;
 const button = form.querySelector('button[type="submit"]');
 const status = document.getElementById('partner-status');
 let pending = false;
 // Campaign labels stay with this inquiry: no storage, pixels or conversion events.
 function fillAttribution() {
  const search = location.search;
  const params = new URLSearchParams(search.length <= 4096 ? search : '');
  for (const name of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term']) {
   const values = params.getAll(name), raw = values.length === 1 ? values[0] : '';
   form.elements[name].value = raw.length <= 100 && !/[\u0000-\u001f\u007f]/.test(raw) && /^[A-Za-z0-9][A-Za-z0-9 ._-]*$/.test(raw.trim()) ? raw.trim().replace(/ +/g,' ') : '';
  }
 }
 fillAttribution();
 form.addEventListener('submit', async event => {
  event.preventDefault();
  if (pending || !form.reportValidity()) return;
  pending = true; button.disabled = true; form.setAttribute('aria-busy','true');
  status.hidden = false; status.textContent = 'Sending your request…';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
   fillAttribution();
   const response = await fetch('/', {method:'POST', signal:controller.signal, headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:new URLSearchParams(new FormData(form)).toString()});
   if (!response.ok) throw new Error('Request not accepted');
   location.assign(form.getAttribute('action'));
  } catch {
   status.textContent = 'We could not confirm delivery. Your entries are still here. Please try again, or use the Support link below. If you retry, mention any earlier attempt. An interrupted response may still have been received.';
   status.focus(); pending = false; button.disabled = false; form.removeAttribute('aria-busy');
  } finally { clearTimeout(timer); }
 });
})();
