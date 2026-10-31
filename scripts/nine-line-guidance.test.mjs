import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createCapture} from '../nine-line-system-test-assets/capture.js';

function boot({output=true,holdEnd=false,empty=false,suspended=false}={}){
 let now=0,id=0,reads=0,requests=0;const timers=new Map(),contexts=[],tones=[],recorders=[],streams=[],completed=[],errors=[],states=[];
 const add=(fn,ms,repeat=0)=>{const n=++id;timers.set(n,{fn,at:now+ms,repeat});return n};
 globalThis.setTimeout=(fn,ms)=>add(fn,ms);globalThis.clearTimeout=n=>timers.delete(n);globalThis.setInterval=(fn,ms)=>add(fn,ms,ms);globalThis.clearInterval=n=>timers.delete(n);Object.defineProperty(globalThis,'performance',{value:{now:()=>now},configurable:true});globalThis.document={hidden:false};
 const flush=()=>new Promise(r=>setImmediate(r));
 const advance=async ms=>{const end=now+ms;for(;;){const due=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];if(!due)break;const[n,t]=due;now=t.at;if(t.repeat)t.at+=t.repeat;else timers.delete(n);t.fn();await flush();}now=end;await flush()};
 const param=()=>({setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
 class AC{constructor(){this.state=suspended?'suspended':'running';this.destination={};contexts.push(this)}get currentTime(){return now/1000}resume(){this.resumedAt=now;this.state='running';return Promise.resolve()}close(){this.state='closed';return Promise.resolve()}createMediaStreamSource(){return{connect(){assert.ok(tones.every(t=>!t.active),'no cue during microphone graph connect')},disconnect(){}}}createAnalyser(){return{fftSize:2048,getFloatTimeDomainData(data){assert.ok(tones.every(t=>!t.active),'no cue during analysis');reads++;data.fill(.1)},disconnect(){}}}createGain(){return{gain:param(),connect(){},disconnect(){}}}createOscillator(){if(!output)throw Error('output missing');const tone={frequency:param(),active:false,connect(){},disconnect(){this.disconnected=true},start(at){this.scheduled=at;this.active=true},stop(at){if(at===undefined){clearTimeout(this.timer);this.active=false;return;}this.timer=setTimeout(()=>{this.active=false;if(!holdEnd)this.onended?.()},at*1000-now)}};tones.push(tone);return tone}}
 class MR{static isTypeSupported(){return true}constructor(){this.state='inactive';this.mimeType='audio/webm';recorders.push(this)}start(){this.started=now;this.state='recording';queueMicrotask(()=>this.onstart?.())}stop(){this.stopped=now;this.state='inactive';queueMicrotask(()=>{this.ondataavailable?.({data:new Blob(empty?[]:['fixture'])});this.onstop?.()})}}
 globalThis.window={AudioContext:AC};globalThis.MediaRecorder=MR;Object.defineProperty(globalThis,'navigator',{value:{mediaDevices:{getUserMedia:async()=>{requests++;const track={stop(){this.stopped=true}};const stream={track,getTracks:()=>[track],getAudioTracks:()=>[track]};streams.push(stream);return stream}}},configurable:true});
 const capture=createCapture({onState:(phase)=>states.push(phase),onComplete:r=>completed.push(r),onError:e=>errors.push(e)});
 return{capture,advance,flush,contexts,tones,recorders,streams,completed,errors,states,reads:()=>reads,requests:()=>requests,timers:()=>timers.size};
}
test('gesture preparation resumes synchronously before loading wait, without microphone or sound',async()=>{
 const h=boot({suspended:true});const readiness=h.capture.prepareAudio();assert.equal(h.contexts.length,1);assert.equal(h.contexts[0].resumedAt,0);assert.equal(h.requests(),0);assert.equal(h.tones.length,0);await readiness;await h.advance(15000);await h.capture.start(0,{});assert.equal(h.contexts.length,1);assert.equal(h.tones.length,1);h.capture.cancel('');assert.equal(h.contexts[0].state,'closed');assert.equal(h.timers(),0);
});
test('baseline bell ends then settles 500 ms; five-second capture ends before distinct stop chime',async()=>{
 const h=boot();await h.capture.start(0,{});assert.equal(h.tones.length,1);assert.equal(h.recorders.length,0);await h.advance(689);assert.equal(h.recorders.length,0);assert.equal(h.reads(),0);await h.advance(1);assert.equal(h.recorders[0].started,690);await h.advance(4999);assert.equal(h.tones.length,1);await h.advance(1);assert.equal(h.recorders[0].stopped,5690);assert.equal(h.streams[0].track.stopped,true);assert.equal(h.tones.length,3);assert.equal(h.completed.length,0);await h.advance(361);assert.equal(h.completed.length,1);assert.equal(h.completed[0].elapsed,5);assert.equal(h.contexts[0].state,'closed');assert.equal(h.timers(),0);
});
test('speech preparation remains 5 or 10 seconds, capture remains ten seconds excluding cues',async()=>{
 for(const prep of [5,10,20]){const h=boot();await h.capture.start(1,{},prep);const expected=prep===5?5000:10000;await h.advance(expected-1);assert.equal(h.tones.length,0);await h.advance(1);assert.equal(h.tones.length,1);await h.advance(690);assert.ok(Math.abs(h.recorders[0].started-(expected+690))<.001);await h.advance(10000);assert.ok(Math.abs(h.recorders[0].stopped-h.recorders[0].started-10000)<.001);assert.equal(h.streams[0].track.stopped,true);await h.advance(361);assert.equal(h.completed.length,1);assert.equal(h.timers(),0);}
});
test('cancel prepared context, start bell, settling, or completion suppresses stale callbacks',async()=>{
 for(const at of [-1,50,300,5800]){const h=boot();if(at===-1)h.capture.prepareAudio();else{await h.capture.start(0,{});await h.advance(at)}const callbacks=h.tones.map(t=>t.onended).filter(Boolean);h.capture.cancel('');for(const f of callbacks)f();await h.advance(30000);assert.equal(h.completed.length,0);assert.ok(h.tones.every(t=>!t.active));assert.ok(h.contexts.every(c=>c.state==='closed'));assert.ok(h.streams.every(s=>s.track.stopped));assert.equal(h.timers(),0);}
});
test('unsupported output safely falls back after settling; stuck cue terminates without overlap',async()=>{
 for(const options of [{output:false},{holdEnd:true}]){const h=boot(options);await h.capture.start(0,{});await h.advance(options.output===false?499:2999);assert.equal(h.recorders.length,0);await h.advance(1);assert.equal(h.recorders.length,1);await h.advance(8000);assert.equal(h.completed.length,1);assert.equal(h.completed[0].cueUnavailable,true);assert.ok(h.tones.every(t=>!t.active));assert.equal(h.timers(),0);}
});
test('invalid capture never emits completion chime; guidance no longer depends on speech synthesis',async()=>{
 const h=boot({empty:true});await h.capture.start(0,{});await h.advance(5690);assert.equal(h.completed.length,0);assert.equal(h.tones.length,1);assert.equal(h.streams[0].track.stopped,true);assert.equal(h.timers(),0);for(const name of ['guidance.js','capture.js']){const source=await readFile(new URL('../nine-line-system-test-assets/'+name,import.meta.url),'utf8');assert.ok(!/speechSynthesis|SpeechSynthesisUtterance/.test(source));}
});
