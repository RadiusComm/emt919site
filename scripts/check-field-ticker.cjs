/* Focused source-integrity, quote and continuous ticker lifecycle checks. No network writes. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const base='d73c35d14b98b2616e3dc6d3a61ed63bf8fdef1d';
for(const file of ['index.html','9-line.html']){
 const html=read(file),before=execFileSync('git',['show',`${base}:${file}`],{cwd:root,encoding:'utf8'}),oldSection=before.match(/<section class="field-voices[\s\S]*?<\/section>/)[0];
 const restored=html.replace(/<section class="field-ticker[\s\S]*?<\/section>/,oldSection).replace('/field-ticker.20261023.css','/field-voices.20261023.css').replace('/field-ticker.20261023.js','/field-voices.20261023.js');
 assert.equal(restored.replace(/\r/g,''),before.replace(/\r/g,''),'Unrelated HTML preserved: '+file);
 const section=html.match(/<section class="field-ticker[\s\S]*?<\/section>/)[0];
 assert.ok(!/<article|<details|<img|<blockquote/.test(section),'No cards, expansion, portraits or logos');
 const baselineQuotes=[...oldSection.matchAll(/<blockquote><p>([\s\S]*?)<\/p><\/blockquote>/g)].map(m=>m[1]);
 for(const quote of baselineQuotes)assert.ok(section.includes(quote),'Exact original quote retained');
 assert.equal((section.match(/class="ticker-item"/g)||[]).length,file==='index.html'?5:2);
 for(const match of html.matchAll(/(?:src|href)="(\/[^"?#]+\.(?:css|js|png|webp|jpg|svg))"/g))assert.ok(fs.existsSync(path.join(root,match[1])),'Asset exists: '+match[1]);
}
for(const role of ['Sergeant, Philadelphia Police Department','Police Officer, Oklahoma State Police','Federal Agent','Marine Corps Sergeant','Patrol Officer, North Carolina'])assert.ok(read('index.html').includes(`<strong class="ticker-role">${role}</strong>`));
for(const role of ['Former Officer, San Diego Police Department','Former Undercover Narcotics'])assert.ok(read('9-line.html').includes(`<strong class="ticker-role">${role}</strong>`));
const css=read('field-ticker.20261023.css');assert.ok(css.includes('height:72px')&&css.includes('height:88px')&&css.includes('white-space:nowrap')&&css.includes('prefers-reduced-motion:reduce'));
function el(){return {events:{},attrs:{},dataset:{},hidden:false,textContent:'',addEventListener(k,f){this.events[k]=f},setAttribute(k,v){this.attrs[k]=v}}}
function setup(reduced=false){
 const section=el(),viewport={...el(),scrollLeft:0,clientWidth:1000},toggle=el(),group={...el(),scrollWidth:5000,cloneNode(){return el()}},runner={appendChild(c){this.clone=c}};
 const els={'[data-ticker-viewport]':viewport,'[data-ticker-runner]':runner,'[data-ticker-group]':group,'[data-ticker-toggle]':toggle};section.querySelector=s=>els[s];section.contains=e=>e===viewport;
 const motion={...el(),matches:reduced},doc={...el(),hidden:false,querySelectorAll:()=>[section]},frames=new Map();let id=0,observer;
 const win={matchMedia:()=>motion,requestAnimationFrame(f){frames.set(++id,f);return id},cancelAnimationFrame(i){frames.delete(i)},IntersectionObserver:class{constructor(f){observer=f}observe(){observer([{isIntersecting:true}])}}};
 vm.runInNewContext(read('field-ticker.20261023.js'),{window:win,document:doc});
 return {section,viewport,toggle,runner,motion,doc,frames,observer,tick(t){const [id,f]=frames.entries().next().value;frames.delete(id);f(t)}};
}
const t=setup();assert.equal(t.runner.clone.attrs['aria-hidden'],'true');assert.equal(t.section.dataset.motionState,'playing');
t.tick(0);t.tick(100);t.tick(200);assert.ok(Math.abs(t.viewport.scrollLeft-4.4)<0.001,'Continuous 22px/second pace');
t.viewport.scrollLeft=4999;t.tick(300);assert.ok(t.viewport.scrollLeft<2,'Seamless loop');
t.section.events.pointerenter({pointerType:'mouse'});assert.equal(t.frames.size,0,'Hover pauses');t.section.events.pointerleave();assert.equal(t.frames.size,1);
t.section.events.focusin();assert.equal(t.frames.size,0,'Focus pauses');t.section.events.focusout({relatedTarget:null});assert.equal(t.frames.size,1);
t.toggle.events.click();assert.equal(t.toggle.textContent,'Play');assert.equal(t.frames.size,0,'Pause control');t.toggle.events.click();assert.equal(t.frames.size,1);
t.viewport.events.pointerdown();assert.equal(t.frames.size,0,'Touch/manual scrolling pauses');
t.viewport.events.keydown({key:'Home',preventDefault(){}});assert.equal(t.viewport.scrollLeft,0);t.viewport.events.keydown({key:'ArrowRight',preventDefault(){}});assert.equal(t.viewport.scrollLeft,120,'Keyboard scrolling');
t.motion.matches=true;t.motion.events.change();assert.equal(t.viewport.scrollLeft,0);assert.equal(t.frames.size,0);assert.equal(t.toggle.hidden,true);assert.equal(t.section.dataset.reduced,'true');
const r=setup(true);assert.equal(r.frames.size,0);assert.equal(r.section.dataset.motionState,'reduced','Static reduced-motion load');
const b=setup();b.doc.hidden=true;b.doc.events.visibilitychange();assert.equal(b.frames.size,0,'Background tab pauses');
const o=setup();o.observer([{isIntersecting:false}]);assert.equal(o.frames.size,0,'Offscreen pauses');
console.log('PASS: exact seven quotes; expanded owner-supplied roles; product/team separation; unrelated source and hero preserved; single fixed-height line; continuous pace/loop; Pause/Play; hover/focus; keyboard/native touch scrolling; reduced-motion static; background/offscreen pause.');
