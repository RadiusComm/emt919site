// Page presentation only. Existing intake, consent and conversion controllers stay unchanged.
(() => {
 if(new URLSearchParams(window.location.search).get('product')==='9-line')document.body.classList.add('nine-demo-context');
 // Presentation only: the existing controller still owns every choice and tag gate.
 document.addEventListener('DOMContentLoaded',()=>{
  const banner=document.querySelector('.ads-consent-banner');
  const header=document.querySelector('.site-header');
  const explanation=banner?.querySelector('p');
  if(!banner||!header||!explanation)return;
  const heading=banner.querySelector('h2');
  if(heading)heading.classList.add('funnel-consent-heading');
  const brief=document.createElement('p');
  brief.className='funnel-consent-brief';
  brief.textContent='If you allow optional Google Ads measurement, Google may receive online identifiers and browser information. We don’t send form entries. Your demo request works either way.';
  const details=document.createElement('details');
  details.className='funnel-consent-details';
  const summary=document.createElement('summary');
  summary.textContent='How measurement works';
  explanation.before(brief,details);
  details.append(summary,explanation);
  const labels={allow:['Allow','Allow optional Google Ads conversion measurement'],reject:['Reject','Reject optional Google Ads conversion measurement'],manage:['Settings','Manage advertising measurement choices']};
  for(const button of banner.querySelectorAll('[data-choice]')){
   const label=labels[button.dataset.choice];
   if(label){button.textContent=label[0];button.setAttribute('aria-label',label[1]);}
  }
  header.after(banner);
 },{once:true});
 const watch=document.querySelector('[data-demo-watch]');
 const frame=document.querySelector('[data-demo-player]');
 const fallback=document.querySelector('[data-demo-player-fallback]');
 if(!watch||!frame)return;
 let requested=false;
 watch.addEventListener('click',()=>{
  if(requested)return;
  requested=true;
  const player=document.createElement('iframe');
  player.src='https://www.youtube-nocookie.com/embed/unDpE__-7Ao?rel=0&playsinline=1&autoplay=1&controls=1&cc_load_policy=1';
  player.title='EMT919 optional promotional overview';
  player.allow='autoplay; fullscreen; picture-in-picture';
  player.allowFullscreen=true;
  frame.replaceChildren(player);
  if(fallback)fallback.hidden=false;
  player.focus();
 });
})();
