// No browser/network sends. Execute the real controller with a minimal DOM and tag queue.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'ads-consent.20261024.js'),'utf8');
const KEY='emt919.ads-measurement-choice.v1';
function setup({enabled=false,gpc=false,saved=null,blocked=false}={}) {
 let now=1792860000000;const writes=[],scripts=[],elements=[],cookies=[],windowEvents={};
 const document={activeElement:null,querySelector:()=>null,head:{append:e=>scripts.push(e)},body:{append(...nodes){elements.push(...nodes)}},addEventListener(){},createElement:tag=>new Element(tag)};
 class Element {
  constructor(tag){this.tag=tag;this.attrs={};this.children={};this.events={};this.dataset={};this.hidden=false;this.open=false;this.isConnected=true;this.classList={add(){}};}
  setAttribute(k,v){this.attrs[k]=v;if(k==='open')this.open=true} removeAttribute(k){delete this.attrs[k];if(k==='open')this.open=false}
  querySelector(s){return this.children[s]||=(new Element('child'))} addEventListener(type,fn){this.events[type]=fn}
  focus(){document.activeElement=this} showModal(){this.open=true} close(){this.open=false}
  click(){this.events.click?.({currentTarget:this,preventDefault(){}})}
 }
 Object.defineProperty(document,'cookie',{get:()=> '_gcl_aw=old; _gac_test=old; session=private',set:v=>cookies.push(v)});
 const storage=new Map(saved?[[KEY,JSON.stringify(saved)]]:[]);
 const window={location:{protocol:'https:',hostname:'emt919.com',origin:'https://emt919.com',pathname:'/demo',reload(){}},navigator:{globalPrivacyControl:gpc},
  localStorage:{getItem:key=>{if(blocked)throw Error('Blocked');return storage.get(key)||null},setItem:(key,value)=>{if(blocked)throw Error('Blocked');writes.push({key,value});storage.set(key,value)},removeItem:key=>storage.delete(key)},
  crypto:{randomUUID:()=> 'b716f2f5-9406-482d-9928-5671099fa823'},setTimeout:()=>1,clearTimeout(){},addEventListener:(name,fn)=>windowEvents[name]=fn};
 class MockDate extends Date{constructor(...args){super(...(args.length?args:[now]))}static now(){return now}}
 vm.runInNewContext(source.replace(/const BASE_TAG_ENABLED = (?:true|false);/,'const BASE_TAG_ENABLED = '+enabled+';'),{window,document,Date:MockDate,JSON,Number});
 const [banner,dialog,status,manage]=elements;
 return {window,document,scripts,writes,cookies,storage,banner,dialog,manage,status,advance:ms=>{now+=ms},click:(node,choice)=>node.querySelector('[data-choice="'+choice+'"]').click(),loadAdapter(){const adapter=fs.readFileSync(path.join(root,'demo-conversion.20261024.js'),'utf8').replace('const ENABLED = false;','const ENABLED = true;');vm.runInNewContext(adapter,{window,WeakSet,Set,Promise});}};
}
test('unknown/rejected consent produces no tag request or Google queue',()=>{
 const h=setup({enabled:true});assert.equal(h.window.EMT919Consent.hasAdsMeasurementConsent(),false);assert.equal(h.scripts.length,0);assert.equal(h.window.dataLayer,undefined);
 h.click(h.banner,'reject');assert.equal(h.scripts.length,0);assert.equal(h.window.dataLayer,undefined);assert.equal(JSON.parse(h.writes[0].value).choice,'denied');
});
test('disabled base policy remains off even after affirmative choice',()=>{
 const h=setup();h.click(h.banner,'allow');assert.equal(h.window.EMT919Consent.hasAdsMeasurementConsent(),true);assert.equal(h.scripts.length,0);assert.equal(h.window.gtag,undefined);
});
test('enabled mock loads only after grant with denied personalization and no enhanced conversions',()=>{
 const h=setup({enabled:true});h.click(h.banner,'allow');assert.equal(h.scripts.length,1);assert.equal(h.scripts[0].src,'https://www.googletagmanager.com/gtag/js?id=AW-18533993828');assert.equal(h.scripts[0].referrerPolicy,'no-referrer');
 const commands=h.window.dataLayer.map(args=>Array.from(args));assert.deepEqual(JSON.parse(JSON.stringify(commands[0])),['consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied'}]);
 const config=commands.find(c=>c[0]==='config')[2];assert.equal(config.send_page_view,false);assert.equal(config.allow_enhanced_conversions,false);assert.equal(config.page_referrer,'');
 assert.equal(commands.find(c=>c[0]==='set'&&c[1]==='allow_ad_personalization_signals')[2],false);
});
test('withdrawal blocks consent, updates owned tag and removes only advertising cookies',()=>{
 const h=setup({enabled:true});h.click(h.banner,'allow');h.manage.click();assert.ok(h.dialog.open);h.click(h.dialog,'reject');assert.equal(h.window.EMT919Consent.hasAdsMeasurementConsent(),false);assert.equal(h.dialog.open,false);assert.equal(h.document.activeElement,h.manage);
 const last=Array.from(h.window.dataLayer.at(-1));assert.equal(last[0],'consent');assert.equal(last[1],'update');assert.equal(last[2].ad_storage,'denied');assert.equal(last[2].ad_user_data,'denied');assert.equal(h.scripts.length,1);
 assert.ok(h.cookies.some(v=>v.startsWith('_gcl_aw=')));assert.ok(h.cookies.some(v=>v.startsWith('_gac_test=')));assert.ok(h.cookies.every(v=>!v.startsWith('session=')));
});
test('manage has no default opt-in, save/close/Escape restore focus',()=>{
 const h=setup();h.manage.click();assert.equal(h.dialog.querySelector('[data-choice="checkbox"]').checked,false);h.click(h.dialog,'close');assert.equal(h.window.EMT919Consent.hasAdsMeasurementConsent(),false);assert.equal(h.document.activeElement,h.manage);
 h.manage.click();h.dialog.querySelector('[data-choice="checkbox"]').checked=true;h.click(h.dialog,'save');assert.equal(h.window.EMT919Consent.hasAdsMeasurementConsent(),true);
 h.manage.click();h.dialog.events.cancel({preventDefault(){}});assert.equal(h.dialog.open,false);assert.equal(h.document.activeElement,h.manage);
});
test('choice retention is 90 days, malformed/expired choices default off',()=>{
 for(const saved of [{version:1,choice:'granted',expiresAt:1},{version:2,choice:'granted',expiresAt:1792860001000},{version:1,choice:'granted',expiresAt:9999999999999}]){const h=setup({enabled:true,saved});assert.equal(h.window.EMT919Consent.hasAdsMeasurementConsent(),false);assert.equal(h.scripts.length,0)}
 const h=setup();h.click(h.banner,'allow');const record=JSON.parse(h.writes[0].value);assert.deepEqual(Object.keys(record).sort(),['choice','expiresAt','version']);assert.equal(record.expiresAt-1792860000000,90*86400000);h.advance(90*86400000+1);assert.equal(h.window.EMT919Consent.hasAdsMeasurementConsent(),false);
});
test('GPC and unavailable preference storage fail closed on new pages',()=>{
 const h=setup({enabled:true,gpc:true});h.click(h.banner,'allow');assert.equal(h.window.EMT919Consent.hasAdsMeasurementConsent(),false);assert.equal(h.scripts.length,0);h.manage.click();assert.equal(h.dialog.querySelector('[data-choice="checkbox"]').disabled,true);
 const blocked=setup({enabled:true,blocked:true});assert.equal(blocked.window.EMT919Consent.hasAdsMeasurementConsent(),false);assert.equal(blocked.scripts.length,0);blocked.click(blocked.banner,'reject');assert.equal(blocked.scripts.length,0);
});
test('real controller and conversion adapter stop new conversions after revocation',async()=>{
 const h=setup({enabled:true});h.loadAdapter();h.click(h.banner,'allow');
 const makeForm=()=>({dataset:{},getAttribute:name=>name==='name'?'emt919-demo':null,elements:{namedItem:()=>({value:''})}});
 const pending=h.window.EMT919DemoConversion.recordAcceptedDemo(makeForm());const event=Array.from(h.window.dataLayer.at(-1));assert.equal(event[1],'conversion');event[2].event_callback();assert.equal(await pending,true);
 h.manage.click();h.click(h.dialog,'reject');const count=h.window.dataLayer.filter(a=>a[0]==='event'&&a[1]==='conversion').length;
 assert.equal(await h.window.EMT919DemoConversion.recordAcceptedDemo(makeForm()),false);assert.equal(h.window.dataLayer.filter(a=>a[0]==='event'&&a[1]==='conversion').length,count);
});
test('dialog explicitly contains forward/backward Tab focus',()=>{
 const h=setup(),first=h.dialog.querySelector('[data-choice="checkbox"]'),last=h.dialog.querySelector('[data-choice="close"]');
 first.getClientRects=last.getClientRects=()=>[{}];h.dialog.querySelectorAll=()=>[first,last];h.manage.click();let prevented=0;
 h.dialog.events.keydown({key:'Tab',shiftKey:true,preventDefault(){prevented++}});assert.equal(h.document.activeElement,last);
 h.dialog.events.keydown({key:'Tab',shiftKey:false,preventDefault(){prevented++}});assert.equal(h.document.activeElement,first);assert.equal(prevented,2);
});
