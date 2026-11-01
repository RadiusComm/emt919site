import test from 'node:test';import assert from 'node:assert/strict';
import {estimate,expectedPhrase,recognitionScore as clientScore} from '../nine-line-system-test-assets/asr/scoring.js';
import {recognitionPayloadFromSamples,recognitionScore as serverScore} from '../nine-line-system-test-assets/recognition-contract.js';
test('real scoring counts serialize into exact same server score without transcription data',()=>{
 for(const texts of [[expectedPhrase(5),expectedPhrase(10),expectedPhrase(20)],['','',''],[expectedPhrase(5).replace('plane','train'),expectedPhrase(10)+' extra words',expectedPhrase(20).replace('can hear every','hear')]]){
  const samples=[5,10,20].map((distance,i)=>({kind:'speech',distance,notes:{make:'Samsung',model:'Galaxy Z Fold7',manual:''},automatic:estimate(texts[i],distance)}));
  const payload=recognitionPayloadFromSamples(samples);assert.equal(serverScore(payload.results).score,clientScore(samples));assert.ok(!JSON.stringify(payload).includes('plane'));
 }
});
test('explicit wrong distance cannot enter recognition leaderboard',()=>{
 const samples=[5,10,20].map(distance=>({kind:'speech',distance,notes:{make:'Samsung',model:'Galaxy Z Fold7',manual:''},automatic:estimate(expectedPhrase(distance===5?10:distance),distance)}));
 assert.equal(clientScore(samples),null);assert.throws(()=>recognitionPayloadFromSamples(samples));
});
