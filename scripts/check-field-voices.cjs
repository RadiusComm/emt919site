/* Focused static-site and carousel lifecycle regression checks; no network or form writes. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
for(const file of ['index.html','9-line.html']){
 const html=read(file),before=execFileSync('git',['show',`b01be9dbc3e93d944f543b6d5966b508a6bc90fa:${file}`],{cwd:root,encoding:'utf8'});
 const restored=html.replace(/\n<section class="field-voices[\s\S]*?<\/section>\n/,'').replace('<link rel="stylesheet" href="/field-voices.20261023.css">\n','').replace('<script src="/field-voices.20261023.js" defer></script>\n','');
 assert.equal(restored.replace(/\r/g,''),before.replace(/\r/g,''),`${file}: unrelated source preserved exactly`);
 const hero=html.match(/<section class="(?:hero|nx-hero)"[\s\S]*?<\/section>/)[0];
 assert.ok(html.slice(html.indexOf(hero)+hero.length).trimStart().startsWith('<section class="field-voices'),`${file}: voices immediately under hero`);
 for(const m of html.matchAll(/(?:src|href)="(\/[^"?#]+\.(?:css|js|png|webp|jpg|svg))"/g))assert.ok(fs.existsSync(path.join(root,m[1])),`${file}: ${m[1]}`);
}
const originalQuotes=[
 '“I use it every day while on patrol for community outreach.”',
 "“It's so useful. I can't get over the time I save versus calling in to the operators over the phone or waiting on another unit.”",
 "“This is great. I can't believe how easy this is.”",
 "“I was a Marine military police sergeant. At the gate, when someone can't understand you, they don't turn around. They keep driving, and now you're sending a unit after them. That never changed the whole time I served. That first thirty seconds, getting two people to understand each other, is exactly the moment EMT919 is built for.”",
 "“When I was on patrol in North Carolina, communication was a need, not a compromise. If you can't understand the person in front of you, you can't help them and you can't keep anyone safe. That's why I'm here.”",
 "“I worked undercover. My phone was my lifeline. If something went down, my team had to be able to hear me. That's the standard I hold 9/Line to.”",
 "“I'm not just selling this. As a former undercover officer, I'm testing it against the scenarios I lived, and feeding what I find straight back to the people building it.”"
];
const homepage=read('index.html'),nine=read('9-line.html');
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
for(let i=0;i<7;i++)assert.ok((i<5?homepage:nine).includes('<blockquote><p>'+esc(originalQuotes[i])+'</p></blockquote>'),`Exact quote ${i+1} in correct product`);
assert.ok(!homepage.includes('Former Officer, San Diego Police Department'));
assert.ok(homepage.includes('<p class="voices-role">Federal Agent</p>'));
assert.ok(nine.includes('<p class="voices-role">Former Officer, San Diego Police Department</p>'));
assert.ok(nine.includes('<p class="voices-role">Former Undercover Narcotics</p>'));
assert.ok(!/portrait|avatar|role label supplied|name placeholder/i.test(homepage.match(/<section class="field-voices[\s\S]*?<\/section>/)[0]));
const css=read('field-voices.20261023.css');
assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
assert.ok(css.includes('overflow-x:auto')&&css.includes('scroll-snap-type:x mandatory'));
function node(){return {events:{},dataset:{},hidden:true,textContent:'',attrs:{},addEventListener(k,v){this.events[k]=v},setAttribute(k,v){this.attrs[k]=v}}}
function setup(reduced=false){
 const section=node(),track=node(),controls=node(),toggle=node(),status=node(),prev=node(),next=node();
 Object.assign(track,{scrollWidth:1140,clientWidth:740,scrollLeft:0,querySelectorAll:()=>[{offsetLeft:0},{offsetLeft:380},{offsetLeft:760}],scrollTo(o){this.scrollLeft=o.left;this.behavior=o.behavior}});
 const map={'[data-voices-track]':track,'[data-voices-controls]':controls,'[data-voices-toggle]':toggle,'[data-voices-status]':status,'[data-voices-prev]':prev,'[data-voices-next]':next};
 section.querySelector=s=>map[s];section.contains=e=>e===track;
 const motion={...node(),matches:reduced};const timers=new Map();let nextId=0,observer;
 const doc={...node(),hidden:false,querySelectorAll:()=>[section]};
 const win={...node(),matchMedia:()=>motion,setTimeout(fn,ms){const id=++nextId;timers.set(id,{fn,ms});return id},clearTimeout(id){timers.delete(id)},IntersectionObserver:class{constructor(cb){observer=cb}observe(){observer([{isIntersecting:true}])}}};
 vm.runInNewContext(read('field-voices.20261023.js'),{document:doc,window:win});
 return {section,track,controls,toggle,status,prev,next,motion,timers,doc,observer};
}
const t=setup();
assert.equal(t.section.dataset.motionState,'playing');assert.equal(t.timers.size,1);assert.equal([...t.timers.values()][0].ms,12000);
[...t.timers.values()][0].fn();assert.equal(t.track.scrollLeft,380,'automatic advance');
t.section.events.pointerenter({pointerType:'mouse'});assert.equal(t.timers.size,0,'hover pauses');
t.section.events.pointerleave();assert.equal(t.timers.size,1,'hover exit resumes');
t.section.events.focusin();assert.equal(t.timers.size,0,'focus pauses');
t.section.events.focusout({relatedTarget:null});assert.equal(t.timers.size,1);
t.toggle.events.click();assert.equal(t.toggle.textContent,'Play');assert.equal(t.timers.size,0,'Pause control');
t.toggle.events.click();assert.equal(t.timers.size,1,'Play control');
t.next.events.click();assert.equal(t.track.scrollLeft,400);assert.equal(t.timers.size,0,'manual navigation stays paused');
let prevented=false;t.track.events.keydown({target:t.track,key:'Home',preventDefault(){prevented=true}});assert.ok(prevented);assert.equal(t.track.scrollLeft,0);
t.track.events.keydown({target:t.track,key:'ArrowRight',preventDefault(){}});assert.equal(t.track.scrollLeft,380,'keyboard navigation');
t.toggle.events.click();t.track.events.pointerdown();assert.equal(t.timers.size,0,'touch/native swipe pauses');
t.motion.matches=true;t.motion.events.change();assert.equal(t.section.dataset.reduced,'true');assert.equal(t.controls.hidden,true);assert.equal(t.timers.size,0);assert.equal(t.track.scrollLeft,0);
const r=setup(true);assert.equal(r.timers.size,0);assert.equal(r.controls.hidden,true);assert.equal(r.section.dataset.motionState,'reduced','reduced motion static from load');
const d=setup();d.doc.hidden=true;d.doc.events.visibilitychange();assert.equal(d.timers.size,0,'background tab pauses');
const o=setup();o.observer([{isIntersecting:false}]);assert.equal(o.timers.size,0,'offscreen pauses');
console.log('PASS: actual hero/CTA and all unrelated source preserved; all seven exact quotes with correct roles/product placement; local assets; native mobile scroll; 12-second advance; Pause/Play; hover/focus; keyboard; interaction pause; offscreen/background pause; reduced-motion static initialization/change.');
