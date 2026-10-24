// Owner-approved, consent-gated measurement of accepted demo requests only.
// This adapter never loads Google tags, writes cookies/storage, or sends form fields.
(() => {
 'use strict';
 const ENABLED = true;
 const DESTINATION = 'AW-18533993828/zBffCOjc0qcdEOSa2YVF';
 const handled = new WeakSet();
 const routes = new Set(['/demo', '/demo.html', '/educators', '/educators.html']);
 const field = (form, name) => String(form.elements.namedItem(name)?.value || '');
 const isInternal = form => form.dataset.internalTest === 'true' ||
  /magnus routing test|fast dial internal test|internal (?:delivery |routing )?test|website qa/i.test(
   ['name', 'agency', 'message'].map(name => field(form, name)).join('\n'));

 async function recordAcceptedDemo(form) {
  // Called only after the existing POST returned a successful HTTP response.
  // There is deliberately no page-load, thank-you-page or button-click trigger.
  if (!form || form.getAttribute('name') !== 'emt919-demo' || handled.has(form)) return false;
  handled.add(form); // No later replay if consent/tag availability changes.
  if (!ENABLED || window.location.protocol !== 'https:' ||
   !['emt919.com', 'www.emt919.com'].includes(window.location.hostname) ||
   !routes.has(window.location.pathname) || field(form, 'company-website').trim() || isInternal(form)) return false;

  // First-party consent controls require affirmative advertising measurement permission.
  // Missing/unknown/withdrawn consent always blocks.
  let allowed = false;
  try { allowed = window.EMT919Consent?.hasAdsMeasurementConsent?.() === true; } catch { /* denied */ }
  if (!allowed || typeof window.gtag !== 'function' || typeof window.crypto?.randomUUID !== 'function') return false;

  const transactionId = window.crypto.randomUUID(); // Random; never a hash of personal fields.
  return new Promise(resolve => {
   let finished = false;
   const finish = () => { if (!finished) { finished = true; window.clearTimeout(timeout); resolve(true); } };
   // Measurement failure must not trap a successfully submitted inquiry.
   const timeout = window.setTimeout(finish, 1100);
   try {
    window.gtag('event', 'conversion', {
     send_to: DESTINATION,
     transaction_id: transactionId,
     page_location: window.location.origin + window.location.pathname,
     page_referrer: '',
     event_callback: finish,
     event_timeout: 1000,
    });
   } catch { finish(); }
  });
 }

 window.EMT919DemoConversion = Object.freeze({recordAcceptedDemo});
})();
