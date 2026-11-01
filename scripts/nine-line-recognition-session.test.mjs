import test from 'node:test';import assert from 'node:assert/strict';
import {createRecognitionSession} from '../nine-line-system-test-assets/asr/session.js';
const sample={distance:5,levels:{peakDb:-20,clipping:0},blob:new Blob(['synthetic'])};
const phrase='This is the five foot test. The plane flies west. I can hear every word clearly.';
test('session does not load on creation; valid silent capture bypasses hallucinated transcript',async()=>{
 let loads=0,analyses=0;const analyzer={ready:false,async load(){loads++;this.ready=true},async analyze(){analyses++;return phrase},cancel(){}};
 const s=createRecognitionSession({analyzer});assert.equal(loads,0);await s.prepare();assert.equal(loads,1);
 const r=await s.analyze({...sample,levels:{peakDb:-100,clipping:0}});assert.equal(r.score,1);assert.equal(r.deletions,16);assert.equal(analyses,0);
});
test('model errors and decoding errors are unavailable rather than low scores',async()=>{
 for(const method of ['load','analyze']){const analyzer={ready:method==='analyze',async load(){if(method==='load')throw Error('no model')},async analyze(){throw Error('decode failed')},cancel(){}};
 const s=createRecognitionSession({analyzer});const r=await s.analyze(sample);assert.equal(r.status,3);assert.equal(r.score,null);assert.equal(s.busy,false);}
});
test('cancelled inference cannot commit stale score and session can retry',async()=>{
 let finish;const analyzer={ready:true,async load(){this.ready=true},analyze:()=>new Promise(r=>finish=r),cancel(){this.ready=false}};
 const s=createRecognitionSession({analyzer});const p=s.analyze(sample);assert.equal(s.busy,true);s.cancel();finish(phrase);assert.equal(await p,null);assert.equal(s.busy,false);
 analyzer.analyze=async()=>phrase;await s.prepare();assert.equal((await s.analyze(sample)).score,10);
});
test('concurrent operations rejected; completion notification observes idle busy flag',async()=>{
 let finish;const analyzer={ready:true,load:()=>new Promise(r=>finish=r),analyze:async()=>phrase,cancel(){}};
 const busy=[];let s;s=createRecognitionSession({analyzer,onChange:()=>busy.push(s.busy)});
 const p=s.prepare();await assert.rejects(s.prepare(),/busy/);await assert.rejects(s.analyze(sample),/busy/);finish();await p;assert.equal(busy.at(-1),false);
});
