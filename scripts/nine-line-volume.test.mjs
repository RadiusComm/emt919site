import test from 'node:test';
import assert from 'node:assert/strict';
import { pickupMetrics, pickupScore, DISPLAY_FLOOR_DB } from '../nine-line-system-test-assets/volume.js';

function capture(values) {
  return {sum:values.reduce((s,x)=>s+x*x,0),count:values.length,peak:Math.max(...values.map(Math.abs)),clipped:values.filter(x=>Math.abs(x)>=.99).length};
}
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);

test('volume: sine amplitudes produce expected RMS and peak digital levels',()=>{
  for(const amplitude of [.1,.25,.5]){
    const samples=Array.from({length:1600},(_,i)=>amplitude*Math.sin(2*Math.PI*i/100));
    const result=pickupMetrics(capture(samples));
    close(result.meanSquare,amplitude*amplitude/2);close(result.rmsDb,20*Math.log10(amplitude/Math.SQRT2));close(result.peakDb,20*Math.log10(amplitude));assert.equal(result.clipping,0);assert.equal(result.deltaDb,null);assert.equal(result.deltaReason,'no-baseline');
  }
});
test('volume: trial/baseline raw power ratio is signed delta, not background-subtracted SNR',()=>{
  const baseline=capture([.1,-.1,.1,-.1]);
  close(pickupMetrics(capture([.2,-.2]),baseline).deltaDb,10*Math.log10(4));
  close(pickupMetrics(capture([.05,-.05]),baseline).deltaDb,10*Math.log10(.25));
  close(pickupMetrics(baseline,baseline).deltaDb,0);
  assert.deepEqual(pickupMetrics(capture([.2,-.2]),baseline),pickupMetrics(capture([.2,-.2]),pickupMetrics(baseline)));
});
test('volume: deterministic noise scaling changes delta by amplitude ratio only',()=>{
  let seed=123;const samples=Array.from({length:2000},()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return(seed/2**32-.5)*.1});
  const baseline=capture(samples),trial=capture(samples.map(x=>x*3));close(pickupMetrics(trial,baseline).deltaDb,20*Math.log10(3));
});
test('volume: clipping is percentage of actual near-full-scale samples',()=>{
  const result=pickupMetrics(capture([0,.99,-1,.5]));assert.equal(result.clipping,50);assert.equal(result.peakDb,0);close(result.meanSquare,(.99**2+1+.25)/4);
});
test('volume: digital silence is valid and display floored, never fake zero dB delta',()=>{
  const silence=capture([0,0]),signal=capture([.1,-.1]);
  assert.deepEqual(pickupMetrics(silence),{meanSquare:0,rmsDb:-100,peakDb:-100,clipping:0,deltaDb:null,deltaReason:'no-baseline'});
  assert.equal(pickupMetrics(signal,silence).deltaReason,'baseline-too-quiet');assert.equal(pickupMetrics(silence,signal).deltaReason,'trial-too-quiet');assert.equal(pickupMetrics(silence,silence).deltaDb,null);
});
test('volume: values below display floor retain raw energy but cannot produce delta',()=>{
  const quiet=capture([1e-6,-1e-6]),signal=capture([.1,-.1]);const q=pickupMetrics(quiet);close(q.meanSquare,1e-12);assert.equal(q.rmsDb,DISPLAY_FLOOR_DB);assert.equal(q.peakDb,DISPLAY_FLOOR_DB);assert.equal(pickupMetrics(signal,q).deltaReason,'baseline-too-quiet');assert.equal(pickupMetrics(quiet,signal).deltaReason,'trial-too-quiet');
  const atFloor={sum:1e-10,count:1,peak:1e-5,clipped:0};assert.equal(pickupMetrics(atFloor,atFloor).deltaReason,null);close(pickupMetrics(atFloor,atFloor).deltaDb,0);
});
test('volume: invalid and contradictory capture fields throw rather than generate plausible scores',()=>{
  const good={sum:.01,count:1,peak:.1,clipped:0};
  for(const bad of [null,{}, {...good,sum:NaN},{...good,sum:Infinity},{...good,sum:-1},{...good,sum:2},{...good,count:0},{...good,count:1.2},{...good,count:Infinity},{...good,peak:-1},{...good,peak:1.01},{...good,peak:NaN},{...good,clipped:-1},{...good,clipped:2},{...good,clipped:.5},{...good,sum:0},{...good,peak:0},{...good,peak:.01},{...good,clipped:1},{...good,peak:1}])assert.throws(()=>pickupMetrics(bad));
});
test('volume: invalid baseline cannot silently become a valid comparison',()=>{
  const signal=capture([.1,-.1]);const levels=pickupMetrics(signal);
  for(const baseline of [{},{meanSquare:NaN},{...levels,meanSquare:-1},{...levels,rmsDb:0},{...levels,peakDb:-80},{...levels,clipping:101}, {...signal,sum:Infinity}])assert.throws(()=>pickupMetrics(signal,baseline));
  assert.equal(pickupMetrics(signal,null).deltaReason,'no-baseline');
});

const level = amplitude => pickupMetrics(capture([amplitude,-amplitude]));
const trials = amplitudes => [5,10,20].map((distance,i)=>({distance,levels:level(amplitudes[i])}));
test('pickup score: transparent endpoints, weighted midpoint, and distant-distance emphasis',()=>{
  const baseline=level(.001);
  assert.deepEqual(pickupScore(baseline,trials([.001,.001,.001])),{score:1,reason:null});
  assert.equal(pickupScore(baseline,trials([.1,.1,.1])).score,10);
  // Each distance contributes according to .2/.3/.5, not order in the input.
  assert.equal(pickupScore(baseline,trials([.1,.001,.001])).score,2.8);
  assert.equal(pickupScore(baseline,trials([.001,.1,.001])).score,3.7);
  assert.equal(pickupScore(baseline,trials([.001,.001,.1])).score,5.5);
  assert.equal(pickupScore(baseline,trials([.001,.001,.1]).reverse()).score,5.5);
});
test('pickup score: signal increases are monotone; louder baseline cannot improve the score',()=>{
  const low=trials([.01,.01,.01]),high=trials([.02,.02,.02]);
  assert.ok(pickupScore(level(.001),high).score>pickupScore(level(.001),low).score);
  assert.ok(pickupScore(level(.002),high).score<pickupScore(level(.001),high).score);
  assert.equal(pickupScore(level(.1),low).score,1);
});
test('pickup score: weighted clipping lowers score with penalty capped at two points',()=>{
  const baseline=level(.001),baseTrials=trials([.1,.1,.1]);
  // Build actual mixtures with a fixed mean square and increasing clipping count.
  const clippedLevels=percent=>{const count=1000,n=percent*10;const other=Math.sqrt((100-n)/(count-n));return pickupMetrics(capture([...Array(n).fill(1),...Array(count-n).fill(other)]))};
  const clean=pickupScore(baseline,baseTrials).score;
  const one=baseTrials.map(t=>({...t,levels:clippedLevels(1)}));
  const five=baseTrials.map(t=>({...t,levels:clippedLevels(5)}));
  assert.equal(clean,10);assert.equal(pickupScore(baseline,one).score,9.6);assert.equal(pickupScore(baseline,five).score,8);
  const distant=baseTrials.map(t=>t.distance===20?{...t,levels:clippedLevels(5)}:t);
  const near=baseTrials.map(t=>t.distance===5?{...t,levels:clippedLevels(5)}:t);
  assert.ok(pickupScore(baseline,distant).score<pickupScore(baseline,near).score);
});
test('pickup score: missing, duplicate, stale-distance, and invalid data are insufficient',()=>{
  const baseline=level(.001),all=trials([.01,.01,.01]);
  assert.equal(pickupScore(null,all).reason,'no-baseline');assert.equal(pickupScore({},all).reason,'invalid-baseline');
  assert.equal(pickupScore(baseline,all.slice(1)).reason,'incomplete-trials');assert.equal(pickupScore(baseline,[all[0],all[0],all[2]]).reason,'invalid-trials');assert.equal(pickupScore(baseline,[{distance:6,levels:all[0].levels},all[1],all[2]]).score,null);assert.equal(pickupScore(baseline,[{distance:5,levels:{meanSquare:NaN}},all[1],all[2]]).score,null);
});
test('pickup score: valid silence contributes minimum pickup; all silence scores one with floor warning',()=>{
  assert.deepEqual(pickupScore(level(0),trials([0,0,0])),{score:1,reason:'floor-limited'});
  assert.deepEqual(pickupScore(level(.001),trials([0,0,0])),{score:1,reason:'floor-limited'});
  assert.deepEqual(pickupScore(level(1e-6),trials([1e-7,0,1e-8])),{score:1,reason:'floor-limited'});
  assert.equal(pickupScore(level(0),trials([.01,.01,.01])).reason,'floor-limited');
  // A missing far trial is not silently removed with weights renormalized.
  assert.equal(pickupScore(level(.001),trials([.1,.1,0]).slice(0,2)).score,null);
  assert.equal(pickupScore(level(.001),trials([.1,.1,0])).score,5.5);
  assert.equal(pickupMetrics(capture([0,0]),level(.001)).deltaDb,null);
});
