// Site policy: optional advertising and browser analytics measurement is disabled.
(() => {
 'use strict';
 if (window.EMT919Consent?.measurementDisabled === true) return;
 const KEY = 'emt919.ads-measurement-choice.v1';
 let dialog, manage, lastTrigger = null;
 function clearOldChoices() {
  try { window.localStorage.removeItem(KEY); } catch { /* Policy remains off when storage is blocked. */ }
  try {
  const names = document.cookie.split(';').map(part => part.split('=')[0].trim())
   .filter(name => /^(?:_ga(?:_|$)|_gid$|_gat(?:_|$)|_gcl_|_gac_)/.test(name));
  const domains = ['', window.location.hostname];
  if (['emt919.com','www.emt919.com'].includes(window.location.hostname)) domains.push('.emt919.com');
  for (const name of names) for (const domain of domains) {
   document.cookie = name+'=; Max-Age=0; Path=/; SameSite=Lax'+(domain?'; Domain='+domain:'')+
    (window.location.protocol==='https:'?'; Secure':'');
  }
  } catch { /* Disabled measurement does not depend on cookie access. */ }
 }
 function close() {
  if(dialog?.open){if(typeof dialog.close==='function')dialog.close();else dialog.removeAttribute('open');}
  if(lastTrigger?.isConnected)lastTrigger.focus();lastTrigger=null;
 }
 function open(trigger) {
  if(!dialog)return;
  lastTrigger=trigger||document.activeElement;
  if(!dialog.open){if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');}
  dialog.querySelector('[data-privacy-clear]').focus();
 }
 // Old saved grants never authorize measurement. No tag, Google queue or event is created.
 window.EMT919Consent=Object.freeze({measurementDisabled:true,hasAdsMeasurementConsent:()=>false,
  openPreferences:()=>open(manage)});
 clearOldChoices();
 dialog=document.createElement('dialog');dialog.className='ads-consent-dialog';
 dialog.setAttribute('aria-labelledby','privacy-choices-title');
 dialog.innerHTML='<h2 id="privacy-choices-title">Privacy choices</h2><p>Optional advertising and browser analytics measurement is off on this website. Older saved opt-ins do not turn it on. Demo requests work normally.</p><p>You can clear old measurement choices and accessible first-party measurement cookies. This does not delete information already received by providers. <a href="/privacy#policy-advertising">Read the privacy details</a>.</p><p data-privacy-status role="status" aria-live="polite"></p><div class="ads-consent-actions"><button type="button" data-privacy-clear>Clear old measurement choices</button><button type="button" data-privacy-close>Close</button></div>';
 dialog.querySelector('[data-privacy-clear]').addEventListener('click',()=>{
  clearOldChoices();dialog.querySelector('[data-privacy-status]').textContent='Measurement remains off. Old choices were cleared where browser permissions allow.';
 });
 dialog.querySelector('[data-privacy-close]').addEventListener('click',close);
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 dialog.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();close();return;}
  if(event.key!=='Tab')return;
  const stops=[...dialog.querySelectorAll('a[href],button:not([disabled])')].filter(el=>!el.hidden&&el.getClientRects().length);
  const first=stops[0],last=stops.at(-1);
  if(event.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){event.preventDefault();last?.focus();}
  else if(!event.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){event.preventDefault();first?.focus();}
 });
 manage=document.createElement('button');manage.type='button';manage.className='privacy-choices-link';
 manage.textContent='Privacy choices';manage.setAttribute('aria-haspopup','dialog');
 manage.addEventListener('click',()=>open(manage));
 document.addEventListener('click',event=>{const trigger=event.target.closest?.('[data-advertising-preferences]');if(trigger){event.preventDefault();open(trigger);}});
 document.body.append(dialog);
 const footer=document.querySelector('.footer-legal')||document.querySelector('footer');
 if(footer)footer.append(manage);
})();
