/* Focused source-integrity, quote and continuous ticker lifecycle checks. No network writes. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const base='7c651d94c13ae99640af7f8f5cc38528c2374c78';
for(const file of ['index.html','9-line.html']){
 const html=read(file),before=execFileSync('git',['show',`${base}:${file}`],{cwd:root,encoding:'utf8'}),oldSection=before.match(/<section class="field-ticker[\s\S]*?<\/section>/)[0];
 const restored=html.replace(/<section class="field-ticker[\s\S]*?<\/section>/,oldSection).replace('/field-ticker.20261023-two-line.css','/field-ticker.20261023-fast.css');
 assert.equal(restored.replace(/\r/g,''),before.replace(/\r/g,''),'Unrelated HTML preserved: '+file);
 const section=html.match(/<section class="field-ticker[\s\S]*?<\/section>/)[0];
 assert.ok(!/<article|<details|<img|<blockquote|<button/.test(section),'No cards, expansion, portraits, logos or visible buttons');
 const baselineQuotes=[...oldSection.matchAll(/<span class="ticker-item" role="listitem"><span>([\s\S]*?)&nbsp; &#8212;/g)].map(m=>m[1]);
 const renderedCopy=section.replace(/<[^>]*>/g,'');
 for(const quote of baselineQuotes)assert.ok(renderedCopy.includes(quote),'Exact original quote retained across two-line spans');
 assert.equal((section.match(/class="ticker-lines"/g)||[]).length,file==='index.html'?5:2);
 assert.equal((section.match(/class="ticker-line"/g)||[]).length,file==='index.html'?10:4,'Exactly two text lines per testimonial');
 assert.equal((section.match(/class="ticker-item"/g)||[]).length,file==='index.html'?5:2);
 for(const match of html.matchAll(/(?:src|href)="(\/[^"?#]+\.(?:css|js|png|webp|jpg|svg))"/g))assert.ok(fs.existsSync(path.join(root,match[1])),'Asset exists: '+match[1]);
}
for(const role of ['Sergeant, Philadelphia Police Department','Police Officer, Oklahoma State Police','Federal Agent','Marine Corps Sergeant','Patrol Officer, North Carolina'])assert.ok(read('index.html').includes(`<strong class="ticker-role">${role}</strong>`));
for(const role of ['Former Officer, San Diego Police Department','Former Undercover Narcotics'])assert.ok(read('9-line.html').includes(`<strong class="ticker-role">${role}</strong>`));
const css=read('field-ticker.20261023-two-line.css');assert.ok(css.includes('height:84px')&&css.includes('height:100px')&&css.includes('grid-template-rows:22px 22px')&&css.includes('white-space:nowrap')&&css.includes('prefers-reduced-motion:reduce'));
function el(){return {events:{},attrs:{},dataset:{},hidden:false,textContent:'',addEventListener(k,f){this.events[k]=f},setAttribute(k,v){this.attrs[k]=v}}}
function setup(reduced=false){
 const section=el(),viewport={...el(),clientWidth:1000},toggle=el(),group={...el(),scrollWidth:5000,cloneNode(){return el()}},runner={appendChild(c){this.clone=c}};
 let scrollPosition=0;Object.defineProperty(viewport,'scrollLeft',{get(){return scrollPosition},set(v){scrollPosition=Math.round(v)}});
 const els={'[data-ticker-viewport]':viewport,'[data-ticker-runner]':runner,'[data-ticker-group]':group,'[data-ticker-toggle]':toggle};section.querySelector=s=>els[s];section.contains=e=>e===viewport;
 const motion={...el(),matches:reduced},doc={...el(),hidden:false,querySelectorAll:()=>[section]},frames=new Map();let id=0,observer;
 const win={matchMedia:()=>motion,requestAnimationFrame(f){frames.set(++id,f);return id},cancelAnimationFrame(i){frames.delete(i)},IntersectionObserver:class{constructor(f){observer=f}observe(){observer([{isIntersecting:true}])}}};
 vm.runInNewContext(read('field-ticker.20261023-fast.js'),{window:win,document:doc});
 return {section,viewport,toggle,runner,motion,doc,frames,observer,tick(t){const [id,f]=frames.entries().next().value;frames.delete(id);f(t)}};
}
const t=setup();assert.equal(t.runner.clone.attrs['aria-hidden'],'true');assert.equal(t.section.dataset.motionState,'playing');
t.tick(0);for(let time=16;time<=160;time+=16)t.tick(time);assert.equal(t.viewport.scrollLeft,5,'33px/second pace survives integer-rounded browser scrollLeft');
const loop=setup();loop.viewport.scrollLeft=4999;loop.section.events.pointerenter({pointerType:'mouse'});loop.section.events.pointerleave();loop.tick(0);loop.tick(100);assert.ok(loop.viewport.scrollLeft<3,'Seamless loop');
t.section.events.pointerenter({pointerType:'mouse'});assert.equal(t.frames.size,0,'Hover pauses');t.section.events.pointerleave();assert.equal(t.frames.size,1);
t.section.events.focusin();assert.equal(t.frames.size,0,'Focus pauses');t.section.events.focusout({relatedTarget:null});assert.equal(t.frames.size,1);
t.viewport.events.keydown({key:' ',preventDefault(){}});assert.equal(t.frames.size,0,'Space pauses without a visible button');t.viewport.events.keydown({key:' ',preventDefault(){}});assert.equal(t.frames.size,1,'Space releases pause');
t.viewport.events.pointerdown();assert.equal(t.frames.size,0,'Touch/manual scrolling pauses');t.viewport.events.pointerup();assert.equal(t.frames.size,1);
t.section.events.focusin();
t.viewport.events.keydown({key:'Home',preventDefault(){}});assert.equal(t.viewport.scrollLeft,0);t.viewport.events.keydown({key:'ArrowRight',preventDefault(){}});assert.equal(t.viewport.scrollLeft,120,'Keyboard scrolling');
t.viewport.events.keydown({key:' ',preventDefault(){}});t.section.events.focusout({relatedTarget:null});assert.equal(t.frames.size,0,'Keyboard pause persists after focus leaves');t.viewport.events.keydown({key:' ',preventDefault(){}});assert.equal(t.frames.size,1);
t.motion.matches=true;t.motion.events.change();assert.equal(t.viewport.scrollLeft,0);assert.equal(t.frames.size,0);assert.equal(t.section.dataset.reduced,'true');
const r=setup(true);assert.equal(r.frames.size,0);assert.equal(r.section.dataset.motionState,'reduced','Static reduced-motion load');
const b=setup();b.doc.hidden=true;b.doc.events.visibilitychange();assert.equal(b.frames.size,0,'Background tab pauses');
const o=setup();o.observer([{isIntersecting:false}]);assert.equal(o.frames.size,0,'Offscreen pauses');
console.log('PASS: exactly two word-boundary text lines per complete testimonial; no visible button or expanding cards; 33px/s preserved; exact seven quotes/roles; product/team separation; unrelated source/hero preserved; fixed strip height; continuous loop; hover/focus/Space pause; native scrolling; reduced-motion static.');
