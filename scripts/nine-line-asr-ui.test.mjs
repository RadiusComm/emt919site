import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
class E{constructor(tag='div'){this.tagName=tag;this.children=[];this.attrs={};this.value='';this.textContent='';this.hidden=false;this.disabled=false;this.checked=false;this.style={};this.classList={toggle(){},add(){},remove(){}};}append(...x){this.children.push(...x)}replaceChildren(...x){this.children=x}setAttribute(k,v){this.attrs[k]=v}removeAttribute(k){delete this.attrs[k]}pause(){this.paused=true}click(){return this.disabled?undefined:this.onclick?.()}}
let serial=0;
async function boot(options={}){
 const html=await readFile(new URL('../nine-line-system-test.html',import.meta.url),'utf8');const ids=Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new E()]));let now=0,nextTimer=0,timers=new Map(),requests=0,analysisReads=0,signal=.1,empty=false,noStart=false,noStop=false;
 const events={},streams=[],contexts=[],recorders=[],utterances=[],locks=[],workers=[],meter=new E();
 globalThis.Worker=class {constructor(){this.messages=[];workers.push(this)}postMessage(data){this.messages.push(data)}terminate(){this.terminated=true}reply(type,extra={}){this.onmessage?.({data:{id:this.messages.at(-1).id,type,...extra}})}};
 const allNodes=()=>{const walk=n=>[n,...n.children.flatMap(walk)];return Object.values(ids).flatMap(walk)};
 globalThis.OfflineAudioContext=class {constructor(channels,length){this.length=length;this.destination={}}createBufferSource(){return{connect(){},start(){}}}async startRendering(){return{getChannelData:()=>new Float32Array(this.length).fill(.1)}}};
 globalThis.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};
 globalThis.speechSynthesis=options.voice?{getVoices:()=>[{localService:true,lang:'en-US'}],speak(u){utterances.push(u);if(!options.holdVoice)setTimeout(()=>u.onend?.(),300)},cancel(){}}:undefined;
 const add=(fn,ms,repeat)=>{const id=++nextTimer;timers.set(id,{fn,at:now+ms,repeat:repeat?ms:0});return id;};
 globalThis.setTimeout=(fn,ms)=>add(fn,ms,false);globalThis.clearTimeout=id=>timers.delete(id);globalThis.setInterval=(fn,ms)=>add(fn,ms,true);globalThis.clearInterval=id=>timers.delete(id);Object.defineProperty(globalThis,'performance',{value:{now:()=>now},configurable:true});
 const flush=()=>new Promise(r=>setImmediate(r));
 async function advance(ms){const end=now+ms;while(true){let due=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];if(!due)break;const [id,t]=due;now=t.at;if(t.repeat)t.at+=t.repeat;else timers.delete(id);t.fn();await flush();}now=end;await flush();}
 function stream(){const track={stopped:false,stop(){this.stopped=true}};const s={getTracks:()=>[track],getAudioTracks:()=>[track],track};streams.push(s);return s;}
 let mic=async()=>stream();Object.defineProperty(globalThis,'navigator',{value:{mediaDevices:{getUserMedia(){requests++;return mic();}}},configurable:true});
 if(options.wake)navigator.wakeLock={request:options.wake===true?async()=>{const lock={released:false,release(){this.released=true;return Promise.resolve()},addEventListener(){}};locks.push(lock);return lock;}:options.wake};
 globalThis.document={getElementById:id=>ids[id]||null,createElement:tag=>new E(tag),querySelector:()=>meter,querySelectorAll:q=>q==='[data-analysis]'?allNodes().filter(n=>'data-analysis'in n.attrs):q==='audio'?ids.samples.children.flatMap(c=>c.children.filter(x=>x.tagName==='audio')):[],addEventListener:(k,fn)=>events[k]=fn,hidden:false};
 globalThis.window={isSecureContext:true,addEventListener:(k,fn)=>events[k]=fn};
 class MR{static isTypeSupported(){return true}constructor(s){this.state='inactive';this.mimeType='audio/webm';this.stream=s;recorders.push(this)}start(){this.state='recording';if(!noStart)queueMicrotask(()=>this.onstart?.())}stop(){if(this.state==='inactive')return;this.state='inactive';if(!noStop)queueMicrotask(()=>{this.ondataavailable?.({data:new Blob(empty?[]:['synthetic QA audio'])});this.onstop?.();})}}
 class AC{decodeAudioData(){return options.decode?options.decode():Promise.resolve({duration:10})}constructor(){this.state=options.suspended?'suspended':'running';contexts.push(this)}resume(){return options.resume?options.resume(this):(this.state='running',Promise.resolve())}createMediaStreamSource(){return{connect(){},disconnect(){}}}createAnalyser(){return{fftSize:2048,getFloatTimeDomainData(d){analysisReads++;d.fill(signal)},disconnect(){}}}close(){this.state='closed';return Promise.resolve()}}
 globalThis.MediaRecorder=window.MediaRecorder=MR;globalThis.AudioContext=window.AudioContext=AC;Object.defineProperty(globalThis,'localStorage',{get(){throw Error('Persistence forbidden')},configurable:true});
 ids.make.value='Apple';ids.model.value='iPhone 16';ids.os.value='iOS';ids.preparation.value='5';
 await import('../nine-line-system-test-assets/app.js?asr-ui='+serial++);
 return{ids,events,streams,contexts,recorders,utterances,locks,workers,advance,flush,stall:ms=>{now+=ms;for(const t of timers.values())t.at=Math.max(t.at,now);},analysisReads:()=>analysisReads,requests:()=>requests,timerCount:()=>timers.size,setMic:f=>mic=f,stream,setSignal:v=>signal=v,setEmpty:v=>empty=v,setNoStart:v=>noStart=v,setNoStop:v=>noStop=v};
}
async function baseline(h){await h.ids.start.click();await h.advance(5000);}
async function speech(h,prep=5){h.ids.preparation.value=String(prep);await h.ids.start.click();await h.advance(prep*1000+10000);}
async function full(h){await baseline(h);for(let i=0;i<5;i++)await speech(h);}


async function enable(h){const pending=h.ids['enable-auto'].click();h.workers.at(-1).reply('ready');await pending;}
const analyzeButtons=()=>document.querySelectorAll('[data-analysis]');

test('ASR UI: enabling blocks capture, readiness restores capture without acquiring microphone',async()=>{
 const h=await boot();const pending=h.ids['enable-auto'].click();assert.equal(h.ids.start.disabled,true);assert.equal(h.ids['enable-auto'].disabled,true);assert.equal(h.ids['cancel-auto'].disabled,false);assert.equal(h.ids.cancel.disabled,true);assert.equal(h.requests(),0);
 h.workers[0].reply('ready');await pending;assert.equal(h.ids.start.disabled,false);assert.equal(h.ids['enable-auto'].disabled,true);assert.match(h.ids['auto-status'].textContent,/model ready/);assert.equal(h.requests(),0);h.ids['cancel-auto'].click();assert.equal(h.timerCount(),0);
});
test('ASR UI: hiding pending model load releases it and visible controls recover',async()=>{
 const h=await boot();const pending=h.ids['enable-auto'].click();const retired=h.workers[0];document.hidden=true;h.events.visibilitychange();document.hidden=false;h.events.visibilitychange();await pending;retired.reply('ready');await h.flush();
 assert.equal(retired.terminated,true);assert.equal(h.ids.start.disabled,false);assert.equal(h.ids['enable-auto'].disabled,false);assert.equal(h.ids['cancel-auto'].disabled,true);assert.equal(h.timerCount(),0);await enable(h);assert.match(h.ids['auto-status'].textContent,/model ready/);h.ids['cancel-auto'].click();
});
test('ASR UI: immediate cancel and re-enable ignores retired load rejection and error',async()=>{
 const h=await boot();const first=h.ids['enable-auto'].click();const retired=h.workers[0];h.ids['cancel-auto'].click();const second=h.ids['enable-auto'].click();const replacement=h.workers[1];await h.flush();retired.onerror();retired.reply('ready');assert.ok(!replacement.terminated);replacement.reply('ready');await Promise.all([first,second]);
 assert.match(h.ids['auto-status'].textContent,/model ready/);assert.equal(h.ids.start.disabled,false);h.ids['cancel-auto'].click();assert.equal(h.timerCount(),0);
});
test('ASR UI: existing rendered Analyze buttons enable on ready and disable on unload',async()=>{
 const h=await boot();await full(h);assert.equal(analyzeButtons().length,5);assert.ok(analyzeButtons().every(b=>b.disabled));await enable(h);assert.ok(analyzeButtons().every(b=>!b.disabled));h.ids['cancel-auto'].click();assert.ok(analyzeButtons().every(b=>b.disabled));await enable(h);assert.ok(analyzeButtons().every(b=>!b.disabled));h.ids['cancel-auto'].click();assert.equal(h.timerCount(),0);
});
test('ASR UI: valid stopped speech automatically analyzes PCM and keeps human rating separate',async()=>{
 const h=await boot();await enable(h);await baseline(h);assert.equal(h.workers[0].messages.length,1);await speech(h);await h.flush();const message=h.workers[0].messages.at(-1);assert.equal(message.type,'analyze');assert.ok(message.pcm instanceof Float32Array);assert.deepEqual(Object.keys(message).sort(),['id','pcm','type']);assert.ok(h.streams.every(s=>s.track.stopped));assert.equal(h.ids.start.disabled,true);assert.equal(h.ids.cancel.disabled,true);
 h.workers[0].reply('result',{text:'This is the two-foot test. The plane flies west. I can hear every word clearly.'});await h.flush();assert.equal(h.ids.start.disabled,false);assert.equal(h.ids['auto-farthest'].textContent,'2 ft');assert.match(h.ids['auto-status'].textContent,/WER 0%/);assert.match(h.ids['auto-bar'].children[0].textContent,/Phrase recognized/);const speechCard=h.ids.samples.children[0];const rating=speechCard.children.find(c=>c.className==='rating').children[0].children[0];assert.equal(rating.value,'unreviewed');assert.equal(rating.disabled,true);h.ids['cancel-auto'].click();assert.equal(h.timerCount(),0);
});
test('ASR UI: reset while decoding ignores late PCM and cannot restore deleted sample',async()=>{
 let finishDecode;const h=await boot({decode:()=>new Promise(r=>finishDecode=r)});await enable(h);await baseline(h);await speech(h);await h.flush();assert.equal(typeof finishDecode,'function');h.ids.clear.click();finishDecode({duration:10});await h.flush();await h.flush();assert.equal(h.workers[0].messages.length,1);assert.equal(h.workers[0].terminated,true);assert.equal(h.ids['test-progress'].textContent,'0/6 recording steps complete');assert.equal(h.ids['auto-farthest'].textContent,'None yet');assert.equal(h.ids.start.disabled,false);assert.equal(h.timerCount(),0);assert.ok(h.contexts.every(c=>c.state==='closed'));
});
test('ASR UI: hiding active inference discards late recognition and restores retry controls',async()=>{
 const h=await boot();await enable(h);await baseline(h);await speech(h);await h.flush();const retired=h.workers[0];assert.equal(retired.messages.at(-1).type,'analyze');document.hidden=true;h.events.visibilitychange();document.hidden=false;h.events.visibilitychange();retired.reply('result',{text:'This is the two foot test. The plane flies west. I can hear every word clearly.'});await h.flush();assert.equal(h.ids['auto-farthest'].textContent,'None yet');assert.equal(h.ids['test-progress'].textContent,'2/6 recording steps complete');assert.equal(h.ids.start.disabled,false);assert.equal(h.ids['enable-auto'].disabled,false);assert.ok(analyzeButtons().every(b=>b.disabled));assert.equal(h.timerCount(),0);
});
test('ASR UI: deleting current sample while decoding preserves baseline and rejects stale analysis',async()=>{
 let finishDecode;const h=await boot({decode:()=>new Promise(r=>finishDecode=r)});await enable(h);await baseline(h);await speech(h);await h.flush();const card=h.ids.samples.children[0];const actions=card.children.find(c=>c.className==='sample-actions');actions.children.find(b=>b.textContent==='Delete recording').click();finishDecode({duration:10});await h.flush();await h.flush();assert.equal(h.workers[0].messages.length,1);assert.equal(h.ids['test-progress'].textContent,'1/6 recording steps complete');assert.equal(h.ids['auto-farthest'].textContent,'None yet');assert.equal(h.ids.start.disabled,false);assert.equal(h.timerCount(),0);
});
test('ASR UI: inference error is uncertain rather than recognized and restores manual controls',async()=>{
 const h=await boot();await enable(h);await baseline(h);await speech(h);await h.flush();h.workers[0].reply('error',{message:'Synthetic inference unavailable'});await h.flush();assert.match(h.ids['auto-bar'].children[0].textContent,/Uncertain/);assert.equal(h.ids['auto-farthest'].textContent,'None yet');assert.equal(h.ids.start.disabled,false);assert.equal(h.ids['test-progress'].textContent,'2/6 recording steps complete');h.ids['cancel-auto'].click();assert.equal(h.timerCount(),0);
});
