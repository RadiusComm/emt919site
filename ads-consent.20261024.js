// Owner-approved basic consent: load only the fixed Google Ads tag after permission.
(() => {
 'use strict';
 if (window.EMT919Consent) return;
 const BASE_TAG_ENABLED = true;
 const TAG = 'AW-18533993828';
 const KEY = 'emt919.ads-measurement-choice.v1';
 const DAYS = 90;
 const denied = {ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied', analytics_storage:'denied'};
 let choice = null, expiresAt = 0, ownsTag = false, lastTrigger = null;
 const gpc = () => window.navigator.globalPrivacyControl === true;
 const allowed = () => choice === 'granted' && expiresAt > Date.now() && !gpc();
 const production = () => window.location.protocol === 'https:' && ['emt919.com','www.emt919.com'].includes(window.location.hostname);
 try {
  const raw = window.localStorage.getItem(KEY), saved = JSON.parse(raw);
  if (saved?.version === 1 && ['granted','denied'].includes(saved.choice) &&
   Number.isFinite(saved.expiresAt) && saved.expiresAt > Date.now() && saved.expiresAt <= Date.now()+DAYS*86400000) {choice=saved.choice;expiresAt=saved.expiresAt;}
  else if(raw!==null)window.localStorage.removeItem(KEY);
 } catch { /* Unknown/blocked storage defaults to no consent. */ }

 function loadGoogleIfAllowed() {
  if (!BASE_TAG_ENABLED || !production() || !allowed() || ownsTag || typeof window.gtag === 'function') return;
  ownsTag = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function(){ window.dataLayer.push(arguments); };
  window.gtag('consent','default',{...denied});
  window.gtag('set','allow_ad_personalization_signals',false);
  window.gtag('set','allow_google_signals',false);
  window.gtag('set','ads_data_redaction',true);
  window.gtag('set','url_passthrough',false);
  window.gtag('consent','update',{...denied,ad_storage:'granted',ad_user_data:'granted'});
  window.gtag('js',new Date());
  window.gtag('config',TAG,{send_page_view:false,allow_enhanced_conversions:false,
   allow_ad_personalization_signals:false,page_location:window.location.origin+window.location.pathname,page_referrer:''});
  const tag = document.createElement('script');
  tag.async = true; tag.referrerPolicy = 'no-referrer';
  tag.src = 'https://www.googletagmanager.com/gtag/js?id='+TAG;
  tag.dataset.emt919Google = 'true';
  document.head.append(tag);
 }
 function clearAdvertisingCookies() {
  // Only accessible first-party Google advertising cookies; never preference/auth cookies.
  const names = document.cookie.split(';').map(part=>part.split('=')[0].trim()).filter(name=>/^_(?:gcl|gac)_/.test(name));
  for (const name of names) for (const domain of ['',window.location.hostname,'.emt919.com']) {
   document.cookie = name+'=; Max-Age=0; Path=/; SameSite=Lax'+(domain?'; Domain='+domain:'')+'; Secure';
  }
 }
 function save(grant) {
  choice = grant && !gpc() ? 'granted' : 'denied';
  expiresAt=Date.now()+DAYS*86400000;
  try { window.localStorage.setItem(KEY,JSON.stringify({version:1,choice,expiresAt})); } catch { /* This page still honors the choice. */ }
  if (ownsTag) window.gtag('consent','update',allowed()?{...denied,ad_storage:'granted',ad_user_data:'granted'}:{...denied});
  if (!allowed()) clearAdvertisingCookies();
  else loadGoogleIfAllowed();
  banner.hidden = true;
  closeSettings();
  status.textContent = allowed()?'Advertising measurement preference saved: allowed.':'Advertising measurement preference saved: off.';
 }
 const banner = document.createElement('section');
 banner.className='ads-consent-banner'; banner.setAttribute('role','region'); banner.setAttribute('aria-labelledby','ads-choice-title');
 banner.innerHTML='<div><h2 id="ads-choice-title">Advertising measurement</h2><p>With your permission, we use Google Ads to understand which ads lead to demo requests. Google may receive online identifiers and browser information. We do not send your form entries. You can request a demo without allowing measurement. <a href="/privacy#policy-advertising">Read the details</a>.</p></div><div class="ads-consent-actions"><button type="button" data-choice="allow">Allow measurement</button><button type="button" data-choice="reject">Reject optional</button><button type="button" data-choice="manage">Manage choices</button></div>';
 const dialog = document.createElement('dialog');
 dialog.className='ads-consent-dialog'; dialog.setAttribute('aria-labelledby','ads-preferences-title');
 dialog.setAttribute('aria-describedby','ads-preferences-detail');
 dialog.innerHTML='<h2 id="ads-preferences-title">Advertising preferences</h2><p id="ads-preferences-detail">Optional Google Ads conversion measurement helps us understand which ads lead to demo requests. This choice does not enable analytics, personalized ads or remarketing, and does not affect your form submission or emails.</p><label class="ads-consent-option"><input type="checkbox" data-choice="checkbox">Allow Google Ads conversion measurement</label><p data-choice="signal" hidden>Your browser sends a Global Privacy Control signal. Optional advertising measurement is off.</p><p>We remember this choice in this browser for 90 days. You can change it here at any time. Withdrawing does not delete information already sent. <a href="/privacy#policy-advertising">Privacy details</a>.</p><div class="ads-consent-actions"><button type="button" data-choice="save">Save choices</button><button type="button" data-choice="reject">Reject optional</button><button type="button" data-choice="close">Close without changes</button></div>';
 const manage = document.createElement('button');
 manage.type='button'; manage.className='ads-consent-manage'; manage.textContent='Advertising preferences';
 manage.setAttribute('aria-haspopup','dialog');
 const status = document.createElement('p');
 status.className='ads-consent-status'; status.setAttribute('role','status'); status.setAttribute('aria-live','polite');
 const checkbox=dialog.querySelector('[data-choice="checkbox"]');
 function openSettings(trigger) {
  lastTrigger=trigger||document.activeElement;
  checkbox.checked=allowed(); checkbox.disabled=gpc();
  dialog.querySelector('[data-choice="signal"]').hidden=!gpc();
  if (!dialog.open) { if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open',''); }
  (checkbox.disabled?dialog.querySelector('[data-choice="reject"]'):checkbox).focus();
 }
 function closeSettings() {
  if(dialog.open){if(typeof dialog.close==='function')dialog.close();else dialog.removeAttribute('open');}
  if(lastTrigger?.isConnected)lastTrigger.focus();lastTrigger=null;
 }
 banner.querySelector('[data-choice="allow"]').addEventListener('click',()=>save(true));
 banner.querySelector('[data-choice="allow"]').disabled=gpc();
 banner.querySelector('[data-choice="reject"]').addEventListener('click',()=>save(false));
 banner.querySelector('[data-choice="manage"]').addEventListener('click',event=>openSettings(event.currentTarget));
 dialog.querySelector('[data-choice="save"]').addEventListener('click',()=>save(checkbox.checked));
 dialog.querySelector('[data-choice="reject"]').addEventListener('click',()=>save(false));
 dialog.querySelector('[data-choice="close"]').addEventListener('click',closeSettings);
 dialog.addEventListener('cancel',event=>{event.preventDefault();closeSettings();});
 dialog.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();closeSettings();return;}
  if(event.key!=='Tab')return;
  const stops=[...dialog.querySelectorAll('a[href],button:not([disabled]),input:not([disabled])')].filter(el=>!el.hidden&&el.getClientRects().length);
  const first=stops[0],last=stops.at(-1);
  if(event.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){event.preventDefault();last?.focus();}
  else if(!event.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){event.preventDefault();first?.focus();}
 });
 manage.addEventListener('click',()=>openSettings(manage));
 document.addEventListener('click',event=>{const trigger=event.target.closest?.('[data-advertising-preferences]');if(trigger){event.preventDefault();openSettings(trigger);}});
 window.addEventListener('storage',event=>{if(event.key===KEY)window.location.reload();});
 banner.hidden=choice!==null||gpc();
 document.body.append(banner,dialog,status);
 const footer=document.querySelector('.footer-legal');
 if(footer)footer.append(manage);else{manage.classList.add('ads-consent-manage-floating');document.body.append(manage);}
 window.EMT919Consent=Object.freeze({hasAdsMeasurementConsent:allowed,openPreferences:()=>openSettings(manage)});
 loadGoogleIfAllowed();
})();
