import test from 'node:test';import assert from 'node:assert/strict';
import {estimate,expectedPhrase,wordErrorRate,automaticSummary,uncertain,wordAlignment,recognitionScore} from '../nine-line-system-test-assets/asr/scoring.js';
import {createLocalAnalyzer} from '../nine-line-system-test-assets/asr/controller.js';
test('exact normalized phrase and numeric distance pass; wrong distance cannot pass low WER',()=>{for(const d of [5,10,20])assert.equal(estimate(expectedPhrase(d),d).status,1);assert.equal(estimate(expectedPhrase(20),5).status,4);assert.equal(estimate('This is the 5-foot test. The plane flies west. I can hear every word clearly.',5).status,1);});
test('silence, unrelated words, missing distance and contradictory distances cannot qualify',()=>{for(const t of ['', 'hello there','The plane flies west. I can hear every word clearly.'])assert.equal(estimate(t,5).status,2);assert.equal(estimate(expectedPhrase(5),5,{noSignal:true}).status,2);});
test('WER counts substitutions deletions insertions; clipping separate from phrase result',()=>{assert.equal(wordErrorRate('one two','one'),.5);assert.equal(wordErrorRate('one two','one three'),.5);assert.equal(wordErrorRate('one two','one two three'),.5);assert.equal(estimate(expectedPhrase(5),5,{clipping:2}).status,1);assert.equal(estimate(expectedPhrase(5),5,{clipping:2}).clippingWarning,1);assert.equal(uncertain(2).wer,null);});
test('maximum uses actual recognized distances without filling gaps; errors remain uncertain',()=>{assert.deepEqual(automaticSummary([{kind:'speech',distance:20,automatic:{status:1}},{kind:'speech',distance:5,automatic:uncertain()}]),{farthest:20,complete:false});});
test('worker load cancellation rejects pending request and ignores late readiness',async()=>{let instance;class W{constructor(){instance=this;}postMessage(x){this.last=x;}terminate(){this.terminated=true;}}const analyzer=createLocalAnalyzer({WorkerClass:W});const p=analyzer.load();analyzer.cancel();await assert.rejects(p,/cancelled/);instance.onmessage({data:{id:instance.last.id,type:'ready'}});assert.equal(analyzer.ready,false);assert.equal(instance.terminated,true);});
test('worker loading error rejects safely and permits retry',async()=>{let instance;class W{constructor(){instance=this;}postMessage(x){this.last=x;}terminate(){this.terminated=true;}}const analyzer=createLocalAnalyzer({WorkerClass:W});const p=analyzer.load();instance.onerror();await assert.rejects(p,/could not load/);assert.equal(analyzer.ready,false);const q=analyzer.load();instance.onmessage({data:{id:instance.last.id,type:'ready'}});await q;assert.equal(analyzer.ready,true);analyzer.cancel();});
test('cancel followed by immediate replacement load cannot let old catch terminate new worker',async()=>{const instances=[];class W{constructor(){instances.push(this);}postMessage(x){this.last=x;}terminate(){this.terminated=true;}}const a=createLocalAnalyzer({WorkerClass:W});const p=a.load();a.cancel();const q=a.load();await assert.rejects(p,/cancelled/);assert.equal(instances[1].terminated,undefined);instances[0].onerror();assert.equal(instances[1].terminated,undefined);instances[1].onmessage({data:{id:instances[1].last.id,type:'ready'}});await q;assert.equal(a.ready,true);a.cancel();});

test('alignment exposes exact S D I and denominator without retaining words',()=>{
 assert.deepEqual(wordAlignment('red green blue','red yellow blue'),{substitutions:1,deletions:0,insertions:0,referenceWords:3,wer:1/3});
 assert.deepEqual(wordAlignment('red green blue','red blue'),{substitutions:0,deletions:1,insertions:0,referenceWords:3,wer:1/3});
 assert.deepEqual(wordAlignment('red blue','red green blue'),{substitutions:0,deletions:0,insertions:1,referenceWords:2,wer:.5});
 assert.deepEqual(wordAlignment('red blue',''),{substitutions:0,deletions:2,insertions:0,referenceWords:2,wer:1});
 assert.equal(wordAlignment('red','red blue green').wer,2);assert.throws(()=>wordAlignment('','red'));
});
test('numeric aliases normalize; explicit conflicts request retry while missing distance retains ordinary WER',()=>{
 for(const d of [5,10,20]){const text=expectedPhrase(d).replace({5:'five',10:'ten',20:'twenty'}[d]+' foot',d+'-foot');assert.equal(estimate(text,d).score,10);}
 for(const text of [expectedPhrase(20),expectedPhrase(5)+' Ten feet.',expectedPhrase(5)+' Six feet.',expectedPhrase(5)+' 100 feet.',expectedPhrase(5)+' Five feet.',expectedPhrase(5).replace('five foot','twenty-five foot')]){const r=estimate(text,5);assert.equal(r.score,null);assert.equal(r.status,4);assert.equal(r.protocolMismatch,1);}
 const missing=estimate(expectedPhrase(5).replace('five foot','foot'),5);assert.equal(missing.score,9.4);assert.equal(missing.protocolMismatch,0);assert.equal(missing.distanceMatched,0);
 assert.equal(estimate(expectedPhrase(5),5,{noSignal:true}).score,1);assert.equal(estimate(expectedPhrase(5),5,{noSignal:true}).deletions,16);
});
test('recognition score averages all three trials only; clipping is separate and uncertainty is not failure',()=>{
 const samples=[5,10,20].map(distance=>({kind:'speech',distance,automatic:estimate(expectedPhrase(distance),distance)}));
 assert.equal(recognitionScore(samples),10);assert.equal(recognitionScore(samples.slice(0,2)),null);
 samples[2].automatic=estimate('',20);assert.equal(recognitionScore(samples),7);
 samples[2].automatic=uncertain();assert.equal(recognitionScore(samples),null);
 const silent=[5,10,20].map(distance=>({kind:'speech',distance,automatic:estimate('',distance)}));assert.equal(recognitionScore(silent),1);
 assert.equal(recognitionScore([silent[0],silent[0],silent[2]]),null);
 assert.equal(estimate(expectedPhrase(5),5,{clipping:100}).score,10);
});
test('edit distance counts agree with independent distance across repeated-word alignments',()=>{
 const cases=[['a b a','b a b'],['a a b','a b b a'],['one two three','four one three five']];
 for(const [a,b]of cases){const r=wordAlignment(a,b);assert.equal((r.substitutions+r.deletions+r.insertions)/r.referenceWords,r.wer);assert.ok(r.substitutions+r.deletions<=r.referenceWords);}
});
test('overall rounds once after equal raw WER-derived scores and excludes protocol errors',()=>{
 const samples=[5,10,20].map(distance=>({kind:'speech',distance,automatic:estimate(expectedPhrase(distance),distance)}));
 samples[0].automatic=estimate(expectedPhrase(5).replace('clearly',''),5);
 assert.equal(recognitionScore(samples),9.8);
 samples[2].automatic=estimate(expectedPhrase(5),20);assert.equal(recognitionScore(samples),null);
});
