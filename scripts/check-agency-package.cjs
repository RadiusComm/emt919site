/* Scoped package-name regression checks. Read-only; never submit a form. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),base=process.env.QA_BASE||'http://127.0.0.1:48549';
const report=process.env.QA_REPORT||path.resolve(root,'../..','tmp/9line-brand/agency-qa.json');
const pages=fs.readdirSync(root).filter(n=>n.endsWith('.html')&&fs.readFileSync(path.join(root,n),'utf8').includes('site-header'));
const checks=[];const pass=name=>checks.push({name,passed:true});
const compact=t=>t.replace(/\s+/g,' ').replaceAll('\u00a0',' ').trim();
(async()=>{
 for(const file of pages){
  const h=fs.readFileSync(path.join(root,file),'utf8');
  assert.ok(!/9\/Line Team|Line<\/span> Team|Officer &amp; Team/.test(h),`Old package in ${file}`);
  if(h.includes('class="site-footer'))assert.ok(h.includes('Officer &amp; Agency'),`Footer package missing in ${file}`);
 }pass(`${pages.length} source pages use Agency package name`);
 for(const f of ['privacy.html','sms-terms.html','sms-consent.html']){
  const before=execFileSync('git',['-c',`safe.directory=${root.replaceAll('\\','/')}`,'show',`b2e2c1374b7fde797de05b23b2428c32de1a9750:${f}`],{cwd:root,encoding:'utf8'});
  const main=x=>x.match(/<main\b[\s\S]*?<\/main>/)[0].replace(/\r/g,'');
  assert.equal(main(fs.readFileSync(path.join(root,f),'utf8')),main(before));
 }pass('Approved Privacy/SMS main content unchanged');
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const p=await browser.newPage();await p.route('**/*',r=>['GET','HEAD'].includes(r.request().method())?r.continue():r.abort());
  for(const width of [320,390,768,1440]){
   await p.setViewportSize({width,height:1000});
   let r=await p.goto(base+'/9-line',{waitUntil:'networkidle'});assert.equal(r.status(),200);
   await p.evaluate(()=>document.fonts.ready);
   const body=compact(await p.locator('body').innerText());
   assert.ok(!body.includes('9/Line Team'));assert.ok(body.includes('9/Line Agency'));assert.ok(body.includes('Department-wide communications and supervision.'));
   assert.ok(!body.includes('Package availability:'));
   assert.equal(await p.locator('.nx-availability').count(),0);
   assert.ok(!body.includes('Scanning before preview'));assert.ok(!body.includes('Photo attachment'));
   assert.ok(!body.includes('Illustrative messaging interface. No real recipient or message.'));
   assert.equal(await p.locator('.nx-message-preview figcaption').count(),0);
   const messagePanelBox=await p.locator('.nx-message-preview').boundingBox();
   assert.ok(messagePanelBox.width<=460&&messagePanelBox.height<=580,'Conversation panel stays compact');
   const photo=p.locator('.nx-location-attachment img');
   assert.equal(await photo.count(),1);
   assert.equal(await photo.getAttribute('alt'),'Example meeting location: a park entrance with stone pillars and a bench.');
   await photo.scrollIntoViewIfNeeded();
   await p.waitForFunction(()=>{const img=document.querySelector('.nx-location-attachment img');return img.complete&&img.naturalWidth===900&&img.naturalHeight===600});
   const photoBox=await photo.boundingBox();
   assert.ok(photoBox.width<=220&&photoBox.height<=147,'Location photo stays compact');
   const attachmentBox=await p.locator('.nx-location-attachment').boundingBox();
   const messagesBox=await p.locator('.nx-messages').boundingBox();
   assert.ok(attachmentBox.width<=220&&attachmentBox.width<messagesBox.width*.75,'Attachment fits the conversation');
   assert.equal(await p.locator('.nx-location-caption strong').innerText(),'Meeting location');
   if([390,1440].includes(width))await p.locator('.nx-message-preview').screenshot({path:path.join(path.dirname(report),`location-message-${width}.png`),style:'.site-header,.nx-mobile-demo,.skip-link{visibility:hidden!important}'});
   const officer=compact(await p.locator('#officer-package').innerText());
   assert.ok(officer.includes('Up to 3 dedicated 9/Line numbers per officer'));
   assert.ok(officer.includes('Keep separate, labeled work numbers for different assignments, investigations, or roles—all managed in one app.'));
   assert.ok(officer.includes('Up to 3 work numbers: choose and label dedicated 9/Line numbers for inbound and outbound calls and SMS/MMS while keeping your personal number private.'));
   assert.match(await p.title(),/9\/Line Agency/);
   assert.equal(await p.locator('link[rel=canonical]').getAttribute('href'),'https://emt919.com/9-line');
   assert.equal(await p.locator('#team-call-map').count(),1);
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   if([390,1440].includes(width))await p.locator('#packages').screenshot({path:path.join(path.dirname(report),`agency-packages-${width}.png`)});
   pass(`/9-line ${width}px packages, location photo, accessible text, anchor and layout`);
   r=await p.goto(base+'/demo?product=9-line',{waitUntil:'networkidle'});assert.equal(r.status(),200);
   assert.ok((await p.locator('textarea[name=message]').inputValue()).includes('9/Line Agency'));
   assert.ok(!compact(await p.locator('main').innerText()).includes('Officer and Team'));
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   pass(`/demo ${width}px Agency context and layout`);
  }
  for(const url of ['/','/privacy','/sms-terms','/sms-consent','/company']){
   const r=await p.goto(base+url,{waitUntil:'domcontentloaded'});assert.equal(r.status(),200);
   if(await p.locator('footer.site-footer').count()){
    assert.match(compact(await p.locator('footer').innerText()),/Officer & Agency/i);pass(`${url} HTTP 200 and updated footer`);
   }else{
    // SMS-consent has a policy-only footer, not the shared product footer. Preserve it.
    assert.equal(url,'/sms-consent');assert.ok(await p.locator('a[href="/privacy"]').count());assert.ok(await p.locator('a[href="/sms-terms"]').count());pass(`${url} HTTP 200; existing policy links retained`);
   }
  }
 }finally{await browser.close()}
 fs.writeFileSync(report,JSON.stringify({base,checks},null,2));console.log(JSON.stringify({passed:checks.length,total:checks.length,report}));
})().catch(e=>{console.error(e);process.exit(1)});
