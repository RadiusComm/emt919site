import test from 'node:test';
import assert from 'node:assert/strict';
import {playCue} from '../nine-line-system-test-assets/guidance.js';

function scheduled(kind){
 const notes=[];let current;
 const context={state:'running',currentTime:0,destination:{},
 createOscillator(){current={events:[],frequency:{setValueAtTime(v){current.hz=v}},connect(){},disconnect(){},start(at){this.startAt=at},stop(at){this.endAt=at}};notes.push(current);return current},
 createGain(){const note=current;const event=type=>(value,time)=>note.events.push({type,value,time});return {gain:{setValueAtTime:event('set'),linearRampToValueAtTime:event('linear'),exponentialRampToValueAtTime:event('exponential')},connect(){},disconnect(){}}}};
 const cancel=playCue(context,kind,()=>{},()=>assert.fail('Unexpected unavailable'));
 const result=structuredClone(notes.map(({events,hz,startAt,endAt})=>({events,hz,startAt,endAt})));cancel();return result;
}
function envelope(events,t){
 let previous={value:0,time:0};
 for(const e of events){
  if(t<e.time){
   if(e.type==='set')return previous.value;
   const f=(t-previous.time)/(e.time-previous.time);
   return e.type==='linear'?previous.value+(e.value-previous.value)*f:previous.value*Math.pow(e.value/previous.value,f);
  }previous=e;
 }return previous.value;
}
function render(notes){
 const duration=Math.max(...notes.map(n=>n.endAt));let peak=0,sum=0,count=0;
 for(let i=0;i<Math.ceil(duration*48000);i++){
  const t=i/48000;let sample=0;
  for(const n of notes)if(t>=n.startAt&&t<n.endAt)sample+=Math.sin(2*Math.PI*n.hz*(t-n.startAt))*envelope(n.events,t);
  assert.ok(Number.isFinite(sample));peak=Math.max(peak,Math.abs(sample));sum+=sample*sample;count++;
 }
 return {peak,rms:Math.sqrt(sum/count),duration};
}
function old(kind){
 return (kind==='start'?[[880,0,.18]]:[[660,0,.13],[440,.17,.18]]).map(([hz,at,d])=>({hz,startAt:at,endAt:at+d+.01,events:[{type:'set',value:0,time:at},{type:'linear',value:.12,time:at+.012},{type:'exponential',value:.001,time:at+d},{type:'set',value:0,time:at+d+.005}]}));
}
for(const kind of ['start','complete'])test(kind+' scheduled waveform is stronger, bounded and non-overlapping',()=>{
 const notes=scheduled(kind),now=render(notes),before=render(old(kind));
 for(let i=1;i<notes.length;i++)assert.ok(notes[i].startAt>notes[i-1].endAt);
 assert.ok(now.peak<=.45+1e-10);assert.ok(now.peak>.44);
 assert.ok(20*Math.log10(now.rms/before.rms)>14);
 assert.ok(now.duration<1);assert.equal(notes.length,kind==='start'?2:3);
 console.log(kind,JSON.stringify({...now,oldRms:before.rms,rmsIncreaseDb:20*Math.log10(now.rms/before.rms)}));
});
