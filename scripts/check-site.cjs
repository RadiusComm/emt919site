/* Read-only page checks; form responses are mocked, never submitted to Netlify. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),base=process.env.QA_BASE||'http://127.0.0.1:48329';
const baseline='bf7ac59d0c6b518280c9c2a614a564ffd5353251';
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const results=[];
function check(name,fn){try{fn();results.push({name,passed:true});}catch(e){results.push({name,passed:false,error:e.message});}}
for(const file of ['privacy.html','sms-terms.html','sms-consent.html']){
 const old=execFileSync('git',['-c',`safe.directory=${root.replaceAll('\\','/')}`,'show',`${baseline}:${file}`],{cwd:root,encoding:'utf8'});
 const content=h=>h.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)[1].replace(/<nav class="on-this-page"[\s\S]*?<\/nav>/g,'').replace(/ id="policy-section-\d+"/g,'').replace(/\r/g,'').trim();
 check(`Approved ${file} main content unchanged`,()=>assert.equal(content(read(file)),content(old)));
}
check('Exact package availability statement retained',()=>assert.ok(read('9-line.html').includes('<strong>Package availability:</strong> Your proposal confirms available features, supported devices, languages, integrations and activation requirements.')));
check('No public SMS opt-in form',()=>assert.ok(!/<form\b/i.test(read('sms-terms.html'))));
check('No serial local CSS imports',()=>assert.ok(!/@import\s+url\(["']?\//.test(read('site-shared.20260912.css'))));
const files=fs.readdirSync(root).filter(f=>f.endsWith('.html')&&read(f).includes('site-header'));
for(const file of files){
 const html=read(file);
 for(const match of html.matchAll(/(?:src|href)="(\/[^"?#]+\.(?:css|js|png|webp|jpg|svg))"/g))check(`${file} asset ${match[1]}`,()=>assert.ok(fs.existsSync(path.join(root,match[1]))));
}
(async()=>{
 const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true});
 try{
  const jobs=files.flatMap(file=>[320,390,768,1440].map(width=>({file,width})));
  await Promise.all(Array.from({length:3},async()=>{while(jobs.length){
   const {file,width}=jobs.shift(),route=file==='index.html'?'/':'/'+file.replace('.html','');
   const p=await browser.newPage({viewport:{width,height:900}});const errors=[];
   p.on('pageerror',e=>errors.push(e.message));
   await p.route('**/*',r=>['GET','HEAD'].includes(r.request().method())?r.continue():r.abort());
   try{
    const response=await p.goto(base+route,{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);
    const data=await p.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,h1:document.querySelectorAll('h1').length,main:document.querySelectorAll('main').length,privacy:!!document.querySelector('footer a[href="/privacy"]'),sms:!!document.querySelector('footer a[href="/sms-terms"]'),skip:[...document.querySelectorAll('.skip-link')].every(a=>document.querySelector(a.getAttribute('href'))),ids:[...document.querySelectorAll('[id]')].map(e=>e.id)}));
    check(`${route} ${width}px status/layout/landmarks`,()=>{assert.equal(response.status(),200);assert.ok(data.overflow<=1,`horizontal overflow ${data.overflow}px`);assert.equal(data.h1,1);assert.equal(data.main,1);assert.ok(data.privacy&&data.sms&&data.skip);assert.equal(data.ids.length,new Set(data.ids).size,'duplicate IDs');assert.deepEqual(errors,[])});
   }catch(e){results.push({name:`${route} ${width}px`,passed:false,error:e.message});}finally{await p.close()}
  }}));
  const p=await browser.newPage({viewport:{width:390,height:900}});
  let posts=0,formMode='error',hold;
  await p.route('**/*',async r=>{
   if(['GET','HEAD'].includes(r.request().method()))return r.continue();
   if(r.request().method()!=='POST'||r.request().url()!==base+'/')return r.abort();
   posts++;
   if(formMode==='hold')await new Promise(resolve=>{hold=()=>r.fulfill({status:500,body:'Mock unavailable'}).then(resolve)});
   else if(formMode==='success')await r.fulfill({status:200,body:'Mock accepted'});
   else await r.fulfill({status:500,body:'Mock unavailable'});
  });
  await p.goto(base+'/demo?product=9-line');
  await p.locator('.mobile-menu summary').focus();await p.keyboard.press('Enter');
  check('Mobile menu opens within viewport',()=>{});
  const menu=await p.locator('.mobile-menu').evaluate(e=>({open:e.open,right:e.querySelector('nav').getBoundingClientRect().right,left:e.querySelector('nav').getBoundingClientRect().left}));
  check('Mobile navigation geometry',()=>{assert.ok(menu.open);assert.ok(menu.left>=0&&menu.right<=390)});
  await p.keyboard.press('Escape');
  check('Escape closes and returns focus',()=>{});
  assert.ok(await p.locator('.mobile-menu').evaluate(e=>!e.open&&document.activeElement===e.querySelector('summary')));
  await p.locator('input[name=name]').focus();await p.keyboard.press('Shift+Tab');
  check('Honeypot excluded from focus',()=>{});
  assert.notEqual(await p.evaluate(()=>document.activeElement.name),'company-website');
  assert.equal(await p.locator('[name=role]').inputValue(),'');
  assert.equal(await p.locator('[name=phone]').getAttribute('type'),'tel');
  await p.locator('input[name=name]').fill('Website QA');await p.locator('input[name=agency]').fill('Synthetic test agency');await p.locator('input[name=email]').fill('qa@example.invalid');
  formMode='hold';await p.locator('form').evaluate(f=>{f.requestSubmit();f.requestSubmit()});
  await p.waitForFunction(()=>document.querySelector('form').getAttribute('aria-busy')==='true');
  for(let i=0;i<100&&!hold;i++)await p.waitForTimeout(20);
  assert.equal(posts,1);assert.ok(hold);await hold();await p.waitForSelector('.form-status[data-state=error]');
  check('Duplicate submissions blocked and error retains entries',()=>{});
  assert.equal(await p.locator('input[name=name]').inputValue(),'Website QA');assert.ok(await p.locator('button[type=submit]').isEnabled());
  formMode='success';await p.locator('button[type=submit]').click();await p.waitForURL('**/thanks');assert.equal(posts,2);
  check('Mocked success reaches thank-you page',()=>{});
  await p.goto(base+'/languages');await p.locator('[data-language-search]').fill('Spanish');assert.equal(await p.locator('.language-grid>span:visible').count(),1);await p.locator('[data-language-search]').fill('zz-no-language');assert.equal(await p.locator('.language-grid>span:visible').count(),0);assert.match(await p.locator('[data-language-status]').innerText(),/No matching/);
  check('Language matching and empty state',()=>{});
  await p.goto(base+'/resources');await p.locator('[data-resource-filter]').selectOption('news');assert.equal(await p.locator('[data-resource-group]:visible').count(),1);assert.match(await p.locator('[data-resource-status]').innerText(),/4 resources/);
  check('Resource category filtering',()=>{});
  await p.goto(base+'/');assert.equal(await p.locator('iframe').count(),0);await p.locator('.video-disclosure summary').click();assert.equal(await p.locator('iframe').count(),0);await p.locator('[data-load-video]').click();assert.equal(await p.locator('iframe[title="EMT919 service overview"]').count(),1);
  check('Third-party video waits for explicit load',()=>{});
  await p.setViewportSize({width:1440,height:900});await p.goto(base+'/9-line');await p.locator('.nav-products summary').focus();await p.keyboard.press('Enter');assert.ok(await p.locator('.nav-products').evaluate(e=>e.open));await p.keyboard.press('Escape');assert.ok(await p.locator('.nav-products').evaluate(e=>!e.open));
  check('Desktop product navigation keyboard controls',()=>{});
  await p.locator('.nx-map-other-calls summary').click();assert.ok(await p.locator('.nx-map-other-calls').evaluate(e=>e.open));
  check('Additional sample calls accessible by disclosure',()=>{});
  // Simulate text-only enlargement, not just a narrower browser viewport.
  for(const route of ['/','/9-line','/demo','/privacy']){
   await p.setViewportSize({width:768,height:900});await p.goto(base+route);await p.evaluate(()=>{const entries=[...document.querySelectorAll('body *')].map(e=>[e,parseFloat(getComputedStyle(e).fontSize)]);for(const [e,size]of entries)e.style.fontSize=(size*2)+'px'});
   const overflow=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
   check(`${route} 200% text enlargement`,()=>assert.ok(overflow<=1,`${overflow}px document overflow`));
  }
  await p.close();
 }catch(e){results.push({name:'Interactive checks',passed:false,error:e.stack});}finally{await browser.close()}
 const failures=results.filter(r=>!r.passed);console.log(JSON.stringify({base,total:results.length,passed:results.length-failures.length,failures},null,2));
 if(process.env.QA_REPORT)fs.writeFileSync(process.env.QA_REPORT,JSON.stringify(results,null,2));
 if(failures.length)process.exitCode=1;
})();
