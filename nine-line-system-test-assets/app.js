import {createRecognitionRoster,RECOGNITION_ROSTER_ENABLED} from './recognition-roster.js';
import {createRecognitionSession} from './asr/session.js';
import {recognitionScore,estimateLabel,uncertain} from './asr/scoring.js';
import {createPublicRoster} from './volume-roster.js';
import { db } from './metrics.js';
import { pickupMetrics } from './volume.js';
import { MODEL_GROUPS, defaultOperatingSystem } from './models.js';
import { createCapture } from './capture.js';
const $=id=>document.getElementById(id);
const TEST_DISTANCES=[5,10,20];
const WORDS=['five','ten','twenty'];
let recognition;let recognitionEpoch=0,starting=false;
const fields=['make','model','manual','os','version','position','noise'];
const captureNotes=()=>Object.fromEntries(fields.map(k=>[k,$(k).value.trim()]));
let samples=[],seq=0,failed=false,lastCompleted='',shownStage=-1,submitting=false,activeStage=null;
const stageIndex=()=>!samples.some(s=>s.kind==='baseline')?0:TEST_DISTANCES.findIndex(d=>!samples.some(s=>s.kind==='speech'&&s.distance===d))+1||4;
const complete=()=>stageIndex()===4;
const displayedStage=()=>capture.phase!=='idle'&&Number.isInteger(activeStage)?activeStage:stageIndex();
const supported=!!(window.isSecureContext&&navigator.mediaDevices?.getUserMedia&&window.MediaRecorder&&(window.AudioContext||window.webkitAudioContext));
function phrase(stage){return 'This is the '+WORDS[stage-1]+'-foot test. The plane flies west. I can hear every word clearly.';}
function error(text){$('error').textContent=text;$('error').hidden=!text;}
const capture=createCapture({
  onState(phase,run){
    activeStage=run?.stage??null;
    $('record-status').classList.toggle('active',phase==='recording');
    $('record-status').textContent=phase==='requesting'?'Requesting microphone access and preparing audio.':phase==='preparing'?'Microphone access ready — not recording. Get into position.':phase==='recording'?'● Recording — '+(run.stage===0?'stay quiet.':'read the script now.'):phase==='stopping'?'Microphone off — finishing recording.':'Microphone off — ready.';
    if(phase==='start-cue')$('record-status').textContent='Start bell — wait for recording indicator.';
    if(phase==='settling')$('record-status').textContent='Cue finished — recording starts momentarily.';
    if(phase==='completion-cue')$('record-status').textContent='Microphone off — recording complete.';
    $('wake-status').textContent=run?.wakeStatus||'Screen-awake protection is requested only during a visible test step.';
    $('cue-status').textContent=run?.cueUnavailable?'Sound cue unavailable. Follow the visual recording indicator.':'A bell starts each recording; a chime ends it. Use a comfortable media volume and follow the recording indicator.';
    $('countdown').textContent=phase==='preparing'?run.remaining+' seconds to get into position':phase==='recording'?run.remaining+' seconds of recording left':'';
    $('countdown').hidden=!['preparing','recording'].includes(phase);
    const level=phase==='recording'?Math.min(0,db(run.level||0)):-100;
    $('meter-fill').style.width=(level+100)+'%';$('live-level').textContent=phase==='recording'?level.toFixed(1)+' dBFS':'— dBFS';document.querySelector('[role="meter"]').setAttribute('aria-valuenow',String(level));updateControls();
  },
  onError(message){failed=true;lastCompleted='';error(message);updateControls();},
  onComplete(run){
    const distance=run.stage===0?null:TEST_DISTANCES[run.stage-1];
    let levels;try{levels=pickupMetrics(run,samples.find(s=>s.kind==='baseline')?.levels);}catch{failed=true;error('Audio levels could not be measured. Retry this step.');updateControls();return;}
    for(const old of samples.filter(s=>s.kind==='speech'&&s.distance===distance))URL.revokeObjectURL(old.url);
    samples=samples.filter(s=>!(s.kind==='speech'&&s.distance===distance));
    const sample={id:++seq,kind:run.stage===0?'baseline':'speech',distance,notes:run.notes,created:new Date().toISOString(),duration:run.elapsed,levels,captureMetrics:{sum:run.sum,count:run.count,peak:run.peak,clipped:run.clipped},blob:run.blob,url:URL.createObjectURL(run.blob)};
    samples.push(sample);failed=false;lastCompleted=run.stage===0?'Background level measured.':distance+' feet — audio level measured.';error('');render();
    if(sample.kind==='speech')void analyzeSample(sample);
  }
});
function renderTests(){
  const index=stageIndex();$('test-progress').textContent=samples.length+'/4 recording steps complete';
  $('baseline-status').textContent=samples.some(s=>s.kind==='baseline')?'Baseline recorded':'Not recorded';
  TEST_DISTANCES.forEach((d,i)=>{const sample=samples.find(s=>s.kind==='speech'&&s.distance===d);$('test-status-'+d).textContent=sample?'Level measured':index===i+1?'Current step':'Waiting';});
}
function renderGuidance(){
  const index=displayedStage(),busy=capture.phase!=='idle'||starting||!!recognition?.busy;
  const finished=complete()&&!busy&&!failed;
  for(const id of ['record-title','auto-status','completion-status','stage-instruction','recorder','cue-status','wake-status','progress-details'])$(id).hidden=finished;
  $('completion-status').textContent=lastCompleted;
  $('stage-heading').textContent=index===4?'All recording steps complete':'Step '+(index+1)+' of 4 — '+(index===0?'background baseline':TEST_DISTANCES[index-1]+' feet');
  $('stage-instruction').textContent=index===4?'Your three word-recognition results are below. Play each recording to hear what was picked up.':index===0?'Stay quiet. Start records five seconds of room noise, then stops automatically.':'Measure '+TEST_DISTANCES[index-1]+' feet from this fixed phone. Read and remember the script. Start gives you preparation time, then records for ten seconds and stops.';
  $('script-box').hidden=index===0||index===4;
  $('script').textContent=index>0&&index<4?phrase(index):'';
  $('preparation-label').hidden=index===0||index===4;
  if(index!==shownStage){$('preparation').value=index===1?'5':'10';shownStage=index;}
  $('start').hidden=index===4;
  $('start').textContent=(failed?'Retry':'Start')+' Step '+(index+1)+(index===0?' — baseline':' — '+TEST_DISTANCES[index-1]+' feet');
  $('retry-distance').hidden=true;
  $('results').hidden=!complete();$('review-pending').hidden=complete();
  $('review-pending').textContent='Final review appears after all four recording steps.';
  $('stage-card').setAttribute('aria-busy',String(busy));
}
function updateControls(){
  const busy=capture.phase!=='idle'||starting||!!recognition?.busy;
  $('auto-status').textContent='Words are checked locally after each distance recording.';
  $('recognition-status').textContent=recognition?.state==='loading'?'Preparing local word recognition (about 66 MB on first use; may be cached). No recordings leave this device.':recognition?.state==='analyzing'?'Checking words on this device…':recognition?.state==='unavailable'?'Word recognition unavailable. Retry analysis or the test.':recognition?.state==='ready'?'Word recognition ready.':'';
  document.querySelectorAll('[data-playback]').forEach(b=>b.disabled=busy);
  fields.forEach(k=>$(k).disabled=busy||samples.length>0);$('preparation').disabled=busy;
  $('start').disabled=busy||!supported||submitting;$('cancel').disabled=!busy;
  $('retry-distance').disabled=busy||submitting;
  $('clear').disabled=(!samples.length&&!busy)||submitting;
  $('share-results').disabled=!RECOGNITION_ROSTER_ENABLED||busy||recognitionScore(samples)===null||submitting;$('share-consent').disabled=!RECOGNITION_ROSTER_ENABLED||busy||submitting;
  renderTests();renderGuidance();
}
function renderModelChoices(){
  const make=$('make').value,groups=Object.entries(MODEL_GROUPS[make]||{});
  const add=(parent,value,label=value)=>{const option=document.createElement('option');option.value=value;option.textContent=label;parent.append(option);};
  $('model').replaceChildren();add($('model'),'','Select model');if(make==='Apple')groups.sort((a,b)=>Number(b[0])-Number(a[0]));
  for(const [label,models]of groups){const group=document.createElement('optgroup');group.label=label;models.forEach(model=>add(group,model));$('model').append(group);}add($('model'),'Other','Other / model not listed');$('model').value='';
}
$('make').onchange=()=>{if(capture.phase!=='idle'||samples.length)return;$('manual').value='';renderModelChoices();$('model').onchange();};
$('model').onchange=()=>{$('manual-label').hidden=$('make').value!=='Other';$('os').value=defaultOperatingSystem($('make').value,$('model').value);$('version').value='';};
$('os').onchange=()=>{$('version').value='';};
$('start').onclick=()=>{
  if(capture.phase!=='idle'||starting||recognition.busy||complete()||submitting||!supported)return;
  return startStage(stageIndex());
};
async function startStage(stage){
  if(capture.phase!=='idle'||starting||recognition.busy||submitting||!supported)return;
  if(!$('make').value||!$('model').value||!$('os').value)return error('Select phone make, model and operating system before starting.');
  if(samples.some(s=>fields.some(k=>s.notes[k]!==$(k).value.trim())))return error('The phone setup changed. Delete recordings and restart.');
  $('share-consent').checked=false;
  document.querySelectorAll('audio').forEach(a=>a.pause());error('');lastCompleted='';
  capture.prepareAudio();
  const ticket=recognitionEpoch;starting=true;updateControls();
  try{await recognition.prepare();
   if(ticket!==recognitionEpoch||document.hidden)return;
   starting=false;return capture.start(stage,captureNotes(),Number($('preparation').value));
  }catch{if(ticket===recognitionEpoch){capture.cancel('');failed=true;error('Word recognition could not prepare. Press Start to retry.');}}
  finally{if(ticket===recognitionEpoch){starting=false;updateControls();}}
}
function cancelRecognition(){
 recognitionEpoch++;starting=false;recognition?.cancel();
 for(const sample of samples)if(sample.analysisPending){sample.analysisPending=false;sample.automatic=uncertain(sample.levels.clipping);}
}
async function analyzeSample(sample){
 if(recognition.busy||capture.phase!=='idle')return;
 const ticket=recognitionEpoch;sample.analysisPending=true;render();
 const result=await recognition.analyze(sample);
 if(ticket!==recognitionEpoch||!samples.includes(sample))return;
 sample.analysisPending=false;sample.automatic=result||uncertain(sample.levels.clipping);render();
}
$('cancel').onclick=()=>{cancelRecognition();capture.cancel();render();};
if(!supported){$('support').hidden=false;$('support').textContent='Recording is unavailable here. Open this page directly over HTTPS in a browser with microphone, MediaRecorder and Web Audio support. Embedded previews may block access.';}
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelRecognition();render();if(capture.phase!=='idle')capture.cancel('This step was cancelled when the page became hidden. Retry when ready.');else capture.cancel('');document.querySelectorAll('audio').forEach(a=>a.pause());}});
window.addEventListener('pagehide',()=>{cancelRecognition();capture.cancel('');document.querySelectorAll('audio').forEach(a=>{a.pause();a.removeAttribute('src');});samples.forEach(s=>URL.revokeObjectURL(s.url));samples=[];lastCompleted='';failed=false;render();});
function el(tag,text,cls){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;}
function levelText(value){return value<=-100?'Below −100 dBFS':value.toFixed(1)+' dBFS';}
function relativeText(levels){return levels.deltaDb===null?'Comparison unavailable — background or test level too low':(levels.deltaDb>=0?'+':'')+levels.deltaDb.toFixed(1)+' dB vs background';}
function render(){
 document.querySelectorAll('audio').forEach(a=>a.pause());
 renderTests();$('share-consent').checked=false;$('samples').replaceChildren();
 for(const distance of TEST_DISTANCES){
  const sample=samples.find(s=>s.kind==='speech'&&s.distance===distance);
  const card=el('article',undefined,'sample');card.append(el('h3','Audio at '+distance+' feet'));
  if(!sample){card.append(el('p','Not recorded yet'));$('samples').append(card);continue;}
  card.append(el('p','Average level: '+levelText(sample.levels.rmsDb),'metrics'));
  card.append(el('p','Peak level: '+levelText(sample.levels.peakDb)+' · '+relativeText(sample.levels),'metrics'));
  card.append(el('p',sample.levels.clipping>=1?'Clipping warning: '+sample.levels.clipping.toFixed(2)+'% of sampled audio near full scale.':'Near-clipping: '+sample.levels.clipping.toFixed(2)+'% of sampled audio.','hint'));
  card.append(el('p',sample.analysisPending?'Checking words…':sample.automatic?estimateLabel(sample.automatic):'Word recognition pending','recognition-result'));
  if(sample.automatic?.score!==null&&Number.isFinite(sample.automatic?.score))card.append(el('p','Word-match score: '+sample.automatic.score.toFixed(1)+' / 10 · '+Math.round(Math.max(0,1-sample.automatic.wer)*100)+'% match · '+sample.automatic.substitutions+' changed, '+sample.automatic.deletions+' missing, '+sample.automatic.insertions+' extra words'));
  if(sample.automatic?.distanceMatched===0&&sample.automatic?.status!==4)card.append(el('p','Distance wording was not recognized. This may reflect recognition error.','hint'));
  if(!sample.analysisPending&&(!sample.automatic||sample.automatic.status===3)){
   const analyze=el('button','Retry word check');analyze.disabled=!!recognition.busy||capture.phase!=='idle';analyze.onclick=()=>analyzeSample(sample);card.append(analyze);
  }
  const playback=el('div',undefined,'pickup-playback');
  const meter=el('meter');meter.min=-100;meter.max=0;meter.value=sample.levels.rmsDb;meter.setAttribute('aria-label','Average recording level at '+distance+' feet');meter.textContent=levelText(sample.levels.rmsDb);playback.append(meter);
  const audio=el('audio');audio.controls=false;audio.disableRemotePlayback=true;audio.preload='none';audio.src=sample.url;
  const play=el('button','Play '+distance+' feet');const playbackStatus=el('span','','hint');play.setAttribute('data-playback','');play.disabled=capture.phase!=='idle';playbackStatus.setAttribute('role','status');
  play.onclick=async()=>{if(capture.phase!=='idle')return;if(!audio.paused){audio.pause();return;}document.querySelectorAll('audio').forEach(a=>{if(a!==audio)a.pause();});try{await audio.play();playbackStatus.textContent='';}catch{playbackStatus.textContent='Playback unavailable. Try again or repeat this distance.';}};
  audio.onplay=()=>{play.textContent='Pause '+distance+' feet';};audio.onpause=audio.onended=()=>{play.textContent='Play '+distance+' feet';};audio.onerror=()=>{playbackStatus.textContent='Playback unavailable. Repeat this distance.';};
  playback.append(play,playbackStatus);card.append(audio,playback);
  const retry=el('button','Repeat '+distance+' feet');retry.disabled=capture.phase!=='idle'||starting||recognition.busy;retry.onclick=()=>startStage(TEST_DISTANCES.indexOf(distance)+1);card.append(retry);$('samples').append(card);
 }
 const baseline=samples.find(s=>s.kind==='baseline');
 const score=recognitionScore(samples);$('pickup-score').textContent=score===null?'Word recognition incomplete':score.toFixed(1)+' / 10';$('score-note').textContent=score===null?'Complete all three word checks; retry unavailable or distance-mismatch trials.':'Automatic word matching—not a guarantee of human understanding or call quality.';$('baseline-result').textContent=baseline?'Background average: '+levelText(baseline.levels.rmsDb):'Background not recorded.';
 updateControls();
}
$('clear').onclick=()=>{cancelRecognition();capture.cancel('');failed=false;lastCompleted='';error('');document.querySelectorAll('audio').forEach(a=>{a.pause();a.removeAttribute('src');});samples.forEach(s=>URL.revokeObjectURL(s.url));samples=[];render();$('clear-status').textContent='All recordings and results deleted from this tab. Your setup notes remain.';};
recognition=createRecognitionSession({onChange:()=>updateControls()});
const roster=createPublicRoster({allowSubmission:false,getSamples:()=>samples,isBusy:()=>capture.phase!=='idle',setBusy:value=>{submitting=value;updateControls();}});
const wordRoster=createRecognitionRoster({getSamples:()=>samples,isBusy:()=>capture.phase!=='idle'||starting||recognition.busy,setBusy:value=>{submitting=value;updateControls();}});
render();
