// Node-only behavioral tests: no browser, Google requests or live form submissions.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'demo-conversion.20261024.js'),'utf8');
const ui=fs.readFileSync(path.join(root,'site-ui.20260912.js'),'utf8');
function form(values={},name='emt919-demo') {
 return {dataset:{},getAttribute:key=>key==='name'?name:key==='action'?'/thanks':null,
  elements:{namedItem:key=>({value:values[key]||''})}};
}
function tracker({enabled=true,consent=true,route='/demo',host='emt919.com',gtag=true,callback=true,throws=false}={}) {
 const calls=[],timers=new Map();let timerId=0;
 const window={location:{protocol:'https:',hostname:host,origin:'https://'+host,pathname:route,search:'?email=private@example.invalid#sensitive'},
  crypto:{randomUUID:()=> '3d7dc754-dddd-4f5f-8d04-843b2911d462'},
  EMT919Consent:consent===null?undefined:{hasAdsMeasurementConsent:()=>consent},
  setTimeout:fn=>{timers.set(++timerId,fn);return timerId},clearTimeout:id=>timers.delete(id)};
 if(gtag)window.gtag=(...args)=>{if(throws)throw Error('Tag unavailable');calls.push(args);if(callback)args[2].event_callback()};
 vm.runInNewContext(source.replace(/const ENABLED = (?:true|false);/,'const ENABLED = '+enabled+';'),{window,WeakSet,Set,Promise});
 return {window,calls,timers,record:window.EMT919DemoConversion.recordAcceptedDemo};
}
test('disabled policy sends nothing, including on page load',async()=>{
 const h=tracker({enabled:false});assert.equal(h.calls.length,0);assert.equal(await h.record(form()),false);assert.equal(h.calls.length,0);
});
test('only consented accepted demo emits exact action and no personal fields',async()=>{
 const h=tracker();assert.equal(await h.record(form({name:'Private Name',agency:'Private Agency',email:'private@example.invalid',phone:'555-1234',message:'Sensitive case'})),true);
 assert.equal(h.calls.length,1);assert.equal(h.calls[0][0],'event');assert.equal(h.calls[0][1],'conversion');
 assert.equal(h.calls[0][2].send_to,'AW-18533993828/zBffCOjc0qcdEOSa2YVF');
 assert.equal(h.calls[0][2].transaction_id,'3d7dc754-dddd-4f5f-8d04-843b2911d462');
 assert.equal(h.calls[0][2].page_location,'https://emt919.com/demo');assert.equal(h.calls[0][2].page_referrer,'');
 assert.doesNotMatch(JSON.stringify(h.calls),/Private|Sensitive|private@example|555-1234/);
});
test('missing, denied or unknown consent sends nothing',async()=>{
 for(const consent of [null,false,undefined,'granted']){const h=tracker({consent:consent===undefined?'unknown':consent});assert.equal(await h.record(form()),false);assert.equal(h.calls.length,0)}
});
test('direct confirmation visits, quote forms and preview hosts do not convert',async()=>{
 for(const options of [{route:'/thanks'},{route:'/educators-thanks'},{host:'preview.netlify.app'}]){const h=tracker(options);await h.record(form());assert.equal(h.calls.length,0)}
 const h=tracker();await h.record(form({},'emt919-quote'));assert.equal(h.calls.length,0);
});
test('education demo uses same accepted form without tracking education thanks visits',async()=>{
 const h=tracker({route:'/educators'});assert.equal(await h.record(form()),true);assert.equal(h.calls.length,1);
});
test('internal tests and filled honeypots never convert',async()=>{
 for(const values of [{name:'Magnus routing test'},{agency:'Fast Dial internal test'},{message:'INTERNAL TEST ONLY'},{message:'Internal delivery test only.'},{'company-website':'bot'}]){const h=tracker();await h.record(form(values));assert.equal(h.calls.length,0)}
 const h=tracker(),f=form();f.dataset.internalTest='true';await h.record(f);assert.equal(h.calls.length,0);
});
test('same accepted form cannot emit twice or replay later after consent changes',async()=>{
 const h=tracker(),f=form();await Promise.all([h.record(f),h.record(f)]);assert.equal(h.calls.length,1);
 const denied=tracker({consent:false}),held=form();await denied.record(held);denied.window.EMT919Consent.hasAdsMeasurementConsent=()=>true;await denied.record(held);assert.equal(denied.calls.length,0);
});
test('missing/throwing tag and missing callback do not trap confirmation',async()=>{
 const absent=tracker({gtag:false});assert.equal(await absent.record(form()),false);
 const broken=tracker({throws:true});assert.equal(await broken.record(form()),true);
 const slow=tracker({callback:false});const done=slow.record(form());for(const fn of [...slow.timers.values()])fn();assert.equal(await done,true);
});
async function runUi({ok=true,reject=false,name='emt919-demo',adapterThrows=false}={}) {
 let submit,calls=0;const locations=[];
 const button={disabled:false},status={dataset:{},setAttribute(){},focus(){}};
 const f=form({},name);Object.assign(f,{reportValidity:()=>true,setAttribute(){},removeAttribute(){},querySelector:()=>button,append(){},addEventListener:(type,fn)=>{submit=fn}});
 const document={head:{append(){}},querySelectorAll:selector=>selector.startsWith('form[')?[f]:[],querySelector:()=>null,addEventListener(){},createElement:()=>status};
 const window={location:{assign:value=>locations.push(value)},EMT919DemoConversion:{recordAcceptedDemo:async()=>{calls++;if(adapterThrows)throw Error('Tag failed')}}};
 vm.runInNewContext(ui,{document,window,AbortController,setTimeout,clearTimeout,URLSearchParams,FormData:class{*[Symbol.iterator](){yield ['form-name',name]}},fetch:async()=>{if(reject)throw Error('Network unavailable');return {ok}}});
 await submit({preventDefault(){}});return {calls,locations,status};
}
test('actual form handler skips failed and uncertain submissions',async()=>{
 for(const options of [{ok:false},{reject:true}]){const r=await runUi(options);assert.equal(r.calls,0);assert.deepEqual(r.locations,[]);assert.equal(r.status.dataset.state,'error')}
});
test('actual successful demo invokes measurement once and still confirms on tag error',async()=>{
 for(const adapterThrows of [false,true]){const r=await runUi({adapterThrows});assert.equal(r.calls,1);assert.deepEqual(r.locations,['/thanks'])}
 const quote=await runUi({name:'emt919-quote'});assert.equal(quote.calls,0);assert.deepEqual(quote.locations,['/thanks']);
});
test('only demo pages load the disabled adapter, no Google base tag added',()=>{
 for(const file of ['demo.html','educators.html']){const html=fs.readFileSync(path.join(root,file),'utf8');assert.equal((html.match(/demo-conversion\.20261024\.js/g)||[]).length,1);assert.ok(html.indexOf('demo-conversion.20261024.js')<html.indexOf('site-ui.20260912.js'))}
 for(const file of ['thanks.html','educators-thanks.html'])assert.doesNotMatch(fs.readFileSync(path.join(root,file),'utf8'),/demo-conversion|gtag\(/);
 assert.doesNotMatch(source,/createElement|document\.cookie|localStorage|sessionStorage|fetch\(/);
});
