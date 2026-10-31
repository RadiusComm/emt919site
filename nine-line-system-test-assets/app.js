import { PHRASE, db, frameMetrics, latestDistances, summary } from './metrics.js';
import { MODELS, defaultOperatingSystem } from './models.js';
import { sharedPayload } from './results.js';
const $ = id => document.getElementById(id);
let mode = 'baseline', phase = 'idle', epoch = 0, active = null, samples = [], seq = 0;
const TEST_DISTANCES = [2,6,10,15,20];
const fields = ['make','model','manual','os','version','position','noise'];
const captureNotes = () => Object.fromEntries(fields.map(k => [k, $(k).value.trim()]));
function renderTests(){
  const latest=latestDistances(samples);const baseline=samples.some(s=>s.kind==='baseline');
  $('baseline-status').textContent=baseline?'Complete':'Not recorded';
  $('test-progress').textContent=TEST_DISTANCES.filter(d=>latest.some(s=>s.distance===d)).length+'/5 tests complete';
  TEST_DISTANCES.forEach((d,i)=>{const sample=latest.find(s=>s.distance===d);$('test-status-'+d).textContent=sample?'Complete · '+(sample.rating==='unreviewed'?'clarity review needed':sample.rating):'Not started'+(d===6?' · qualification target':'');$('test-'+d).textContent=(sample?'Retry':'Start')+' test '+(i+1);});
}
function renderGuidance(){
  const text=phase==='coaching'?'Read the distance instruction. Start recording only when you are in position.':phase==='requesting'?'Allow microphone access, or cancel.':phase==='recording'?(mode==='baseline'?'Stay quiet, then tap Stop recording after about 5 seconds.':'Read the phrase once, then tap Stop recording.'):phase==='stopping'?'Finishing this recording.':!samples.some(s=>s.kind==='baseline')?'First: record the room noise below.':latestDistances(samples).some(s=>s.rating==='unreviewed')?'Recording complete. Review its clarity in Step 3, then choose another test when ready.':'Choose a distance test below. Each test starts only when you choose it.';
  $('next-action').textContent=text;
}
function finishPrompt(run,message){
  if(active!==run||run.discard||phase!=='coaching')return;
  if(window.speechSynthesis?.speaking){
    if(!run.promptPoll)run.promptPoll=setInterval(()=>finishPrompt(run,message),50);
    return;
  }
  clearInterval(run.promptPoll);run.promptPoll=null;run.promptPlaying=false;
  $('prompt-status').textContent=message;$('stop-prompt').hidden=true;$('coach-ready').disabled=false;
}
function beginCoach(distance){
  const run={ticket:++epoch,kind:'coach',distance,discard:false,promptPlaying:false};active=run;phase='coaching';
  $('coach').hidden=false;$('coach').insertAdjacentElement?.('afterend',$('recorder'));$('coach').scrollIntoView?.({block:'start',behavior:'smooth'});$('coach-test').textContent='Test '+(TEST_DISTANCES.indexOf(distance)+1)+' of 5';
  $('coach-heading').textContent='Stand '+distance+' feet away.';$('coach-phrase').textContent=PHRASE;
  $('coach-ready').hidden=false;$('coach-ready').disabled=false;$('stop-prompt').hidden=true;
  $('record-status').textContent='Microphone off · read the instruction';
  $('prompt-status').textContent='When you are in position, explicitly start recording. Nothing starts automatically.';
  updateControls();
  if(!$('spoken-prompt').checked)return;
  try{
    const synthesis=window.speechSynthesis;
    const voice=synthesis?.getVoices?.().find(v=>v.localService===true&&/^en(?:-|$)/i.test(v.lang));
    if(!voice||!window.SpeechSynthesisUtterance){$('prompt-status').textContent='No on-device English voice is available. Follow the on-screen instruction.';return;}
    const utterance=new window.SpeechSynthesisUtterance('Stand '+distance+' feet away from this phone. Measure the distance yourself. When you are in position, start recording and read the phrase on screen.');
    utterance.voice=voice;utterance.lang=voice.lang;run.utterance=utterance;run.promptPlaying=true;
    $('coach-ready').disabled=true;$('stop-prompt').hidden=false;$('prompt-status').textContent='Spoken instruction playing · microphone off';
    utterance.onend=()=>finishPrompt(run,'Instruction finished. Start recording when you are in position.');
    utterance.onerror=()=>finishPrompt(run,'Follow the on-screen instruction. Start recording when in position.');
    synthesis.speak(utterance);
  }catch{try{window.speechSynthesis?.cancel();}catch{}finishPrompt(run,'Spoken guidance is unavailable. Follow the on-screen instruction.');}
}
$('stop-prompt').onclick=()=>{const run=active;if(phase!=='coaching'||!run?.promptPlaying)return;try{window.speechSynthesis?.cancel();}catch{}$('prompt-status').textContent='Stopping spoken instruction · microphone off';finishPrompt(run,'Spoken instruction stopped. Start recording when you are in position.');};
$('coach-ready').onclick=()=>{const run=active;if(phase!=='coaching'||run?.promptPlaying||window.speechSynthesis?.speaking)return;run.discard=true;release(run);epoch++;reset();return start(true);};
const supported = !!(window.isSecureContext && navigator.mediaDevices?.getUserMedia && window.MediaRecorder && (window.AudioContext || window.webkitAudioContext));
if (!supported) { $('support').hidden = false; $('support').textContent = 'Recording is unavailable here. Open this page directly over HTTPS in a browser that supports microphone capture, MediaRecorder and Web Audio. An embedded preview may block microphone permission.'; }
function error(message) { $('error').textContent = message; $('error').hidden = !message; }
function updateControls() {
  const busy = phase !== 'idle';
  $('start').disabled = busy || !supported; $('start').hidden = busy || samples.some(s=>s.kind==='baseline');
  $('stop').disabled = phase !== 'recording'; $('cancel').disabled = !busy;
  for (const el of [$('baseline-mode'),$('spoken-prompt'),$('distance'),...document.querySelectorAll('[data-distance]'),...fields.map($)]) el.disabled = busy;
  $('clear').disabled = !samples.length || busy;
  const hasBaseline=samples.some(s=>s.kind==='baseline');
  if(!hasBaseline&&phase==='idle')mode='baseline';
  document.querySelectorAll('[data-distance]').forEach(b=>b.disabled=busy||!hasBaseline);
  $('baseline-mode').hidden=!hasBaseline;
  $('baseline-instructions').hidden=hasBaseline||busy;
  renderGuidance();
}
function setMode(next) { if(phase!=='idle')return;mode=next; }
$('make').onchange=()=>{const options=MODELS[$('make').value]||[];$('model').replaceChildren();for(const text of ['',...options,'Other']){const option=document.createElement('option');option.value=text;option.textContent=text||'Select model';$('model').append(option);}$('model').onchange();};
$('model').onchange=()=>{$('manual-label').hidden=$('model').value!=='Other';$('os').value=defaultOperatingSystem($('make').value,$('model').value);$('version').value='';};
$('os').onchange=()=>{$('version').value='';};
$('baseline-mode').onclick=()=>{if(phase!=='idle')return;setMode('baseline');return start();};
document.querySelectorAll('[data-distance]').forEach(b=>b.onclick=()=>{if(phase!=='idle')return;if(!samples.some(s=>s.kind==='baseline'))return error('Record the room-noise baseline first.');$('distance').value=b.dataset.distance;setMode('speech');return start();});
function release(run) {
  if (!run) return; clearTimeout(run.limit); clearInterval(run.clock); clearInterval(run.promptPoll); cancelAnimationFrame(run.raf);
  if(run.promptPlaying){try{window.speechSynthesis?.cancel();}catch{}run.promptPlaying=false;}
  run.stream?.getTracks().forEach(t => { t.onended = null; t.stop(); });
  try { run.source?.disconnect(); } catch {} try { run.analyser?.disconnect(); } catch {}
  if (run.context && run.context.state !== 'closed') run.context.close().catch(() => {});
}
function reset() { $('coach').hidden=true;$('test-progress-group').insertAdjacentElement?.('beforebegin',$('recorder'));  active = null; phase = 'idle'; $('record-status').classList.remove('active'); $('record-status').textContent = 'Microphone off · ready'; $('meter-fill').style.width = '0'; $('live-level').textContent = '— dBFS'; document.querySelector('[role="meter"]').setAttribute('aria-valuenow','-100'); updateControls(); }
function cancel(message = '') {
  epoch++; const run = active; if (run) { run.discard = true; try { if (run.recorder?.state !== 'inactive') run.recorder.stop(); } catch {} release(run); }
  reset(); if (message) error(message);
}
async function start(armed=false) {
  if (phase !== 'idle' || !supported) return;
  const distance = Number($('distance').value);
  if (!$('make').value || !$('model').value || !$('os').value) return error('Select the device make, model and operating system before recording.');
  if (samples.some(s=>fields.some(k=>s.notes[k]!==$(k).value.trim()))) return error('This session has samples from a different setup. Delete the recordings before changing the device or setup.');
  if(mode==='speech' && !TEST_DISTANCES.includes(distance))return error('Choose one of the five distance tests.');
  if (mode === 'speech' && !samples.some(s => s.kind === 'baseline')) return error('Record a background baseline first so you can compare room noise.');
  if(window.speechSynthesis?.speaking)return error('Wait for spoken guidance to stop before recording.');
  document.querySelectorAll('audio').forEach(a=>a.pause());
  error('');
  if(mode==='speech'&&!armed){beginCoach(distance);return;}
  if(mode==='speech'){$('coach').hidden=false;$('coach-ready').hidden=true;$('stop-prompt').hidden=true;$('coach-heading').textContent='Get ready at '+distance+' feet.';}
  phase = 'requesting'; const ticket = ++epoch;
  const run = {ticket, kind:mode, distance: mode === 'speech' ? distance : null, notes:captureNotes(), sum:0, count:0, peak:0, clipped:0, chunks:[], discard:false}; active = run;
  $('record-status').textContent = 'Waiting for microphone permission…'; updateControls();
  try {
    run.stream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});
    if (ticket !== epoch || run.discard) { release(run); return; }
    run.context = new (window.AudioContext || window.webkitAudioContext)();
    if (run.context.state === 'suspended') await run.context.resume();
    if (ticket !== epoch || run.discard) { release(run); return; }
    run.source = run.context.createMediaStreamSource(run.stream); run.analyser = run.context.createAnalyser(); run.analyser.fftSize = 2048; run.source.connect(run.analyser);
    const types = ['audio/webm;codecs=opus','audio/mp4','audio/webm']; const mime = types.find(t => MediaRecorder.isTypeSupported(t));
    run.recorder = mime ? new MediaRecorder(run.stream,{mimeType:mime}) : new MediaRecorder(run.stream);
    run.recorder.ondataavailable = e => { if (e.data.size) run.chunks.push(e.data); };
    run.recorder.onerror = () => { if (active === run) cancel('Recording failed. The sample was discarded; try again.'); };
    run.recorder.onstop = () => {
      release(run); if (run.discard || ticket !== epoch) return;
      const blob = new Blob(run.chunks,{type:run.recorder.mimeType || run.chunks[0]?.type || 'audio/webm'});
      if (!blob.size || !run.count) { reset(); return error('No usable audio was captured. Check the microphone and try again.'); }
      const sample = {id:++seq,kind:run.kind,distance:run.distance,notes:run.notes,created:new Date().toISOString(),duration:(performance.now()-run.started)/1000,rms:db(Math.sqrt(run.sum/run.count)),peak:db(run.peak),clipping:run.clipped/run.count*100,blob,url:URL.createObjectURL(blob),rating:'unreviewed',listened:false,reviewNotes:''};
      for(const old of samples.filter(s=>s.kind===sample.kind&&(sample.kind==='baseline'||s.distance===sample.distance))) {document.querySelectorAll('audio').forEach(a=>{if(a.src===old.url){a.pause();a.removeAttribute('src');}});URL.revokeObjectURL(old.url);}
      samples=samples.filter(s=>!(s.kind===sample.kind&&(sample.kind==='baseline'||s.distance===sample.distance)));
      samples.push(sample); reset(); render();
    };
    run.stream.getTracks().forEach(t => t.onended = () => { if (active === run && phase === 'recording') cancel('The microphone disconnected. This incomplete sample was discarded.'); });
    run.recorder.start(250); run.started = performance.now(); phase = 'recording'; if(mode==='speech')$('coach-heading').textContent='Speak now · '+distance+' feet.'; $('record-status').classList.add('active'); updateControls();
    const clock = () => { $('record-status').textContent = `● Recording ${run.kind === 'baseline' ? 'background' : run.distance+' ft'} · ${Math.floor((performance.now()-run.started)/1000)}s / 60s`; }; clock(); run.clock = setInterval(clock,250);
    const data = new Float32Array(run.analyser.fftSize);
    const meter = () => { if (active !== run || phase !== 'recording') return; run.analyser.getFloatTimeDomainData(data); const m=frameMetrics(data); run.sum+=m.sum;run.count+=m.count;run.peak=Math.max(run.peak,m.peak);run.clipped+=m.clipped;const level=db(m.rms);$('live-level').textContent=level.toFixed(1)+' dBFS';$('meter-fill').style.width=((level+100))+'%';document.querySelector('[role="meter"]').setAttribute('aria-valuenow',level.toFixed(1));run.raf=requestAnimationFrame(meter); }; meter();
    run.limit=setTimeout(stop,60000);
  } catch(e) {
    release(run); if (ticket !== epoch) return; reset();
    const messages={NotAllowedError:'Microphone permission was denied or blocked. Allow microphone access in browser site settings, and open this page directly if it is embedded.',NotFoundError:'No microphone was found. Connect or enable a microphone and try again.',NotReadableError:'The microphone is unavailable or in use by another app. Close other recording apps and retry.',SecurityError:'Microphone access is blocked in this context. Open this page directly over HTTPS.'};
    error(messages[e.name] || 'Could not start recording in this browser. Check microphone permission and browser support, then try again.');
  }
}
function stop() { if (phase !== 'recording' || !active) return; phase='stopping'; const run=active; clearTimeout(run.limit); clearInterval(run.clock); cancelAnimationFrame(run.raf); $('record-status').textContent='Finishing sample · microphone off';updateControls();try{run.recorder.stop();release(run);}catch{cancel('Could not finish the sample. Please try again.');} }
$('start').onclick=()=>{if(phase!=='idle')return;setMode('baseline');return start();};$('stop').onclick=stop;$('cancel').onclick=()=>cancel();
document.addEventListener('visibilitychange',()=>{if(document.hidden && phase!=='idle')cancel('Recording cancelled when the page became hidden. Start a new sample when ready.');if(document.hidden)document.querySelectorAll('audio').forEach(a=>a.pause());});
window.addEventListener('pagehide',()=>{cancel();document.querySelectorAll('audio').forEach(a=>{a.pause();a.removeAttribute('src');});samples.forEach(s=>URL.revokeObjectURL(s.url));samples=[];});
function el(tag,text,cls){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;}
function renderSummary(){const result=summary(samples);$('target-result').textContent=result.target;$('farthest-result').textContent=result.farthest ? result.farthest+' ft':'—';const latest=latestDistances(samples);const distances=TEST_DISTANCES;$('distance-table').replaceChildren();for(const d of distances){const s=latest.find(x=>x.distance===d);const row=el('tr');[d+' ft'+(d===6?' · target':''),s?(s.listened?s.rating:'unreviewed'):'Untested',s?s.rms.toFixed(1)+' dBFS':'—'].forEach(t=>row.append(el('td',t)));$('distance-table').append(row);}$('chart').replaceChildren();const labels=[];for(const d of TEST_DISTANCES){const s=latest.find(x=>x.distance===d);const rating=s?(s.listened?s.rating:'unreviewed'):'untested';const bar=el('div',undefined,'chart-bar '+rating);bar.title=d+' ft: '+rating;if(TEST_DISTANCES.includes(d))bar.append(el('span',String(d)));$('chart').append(bar);if(s)labels.push(d+' feet '+rating);}$('chart').setAttribute('aria-label','Human clarity by measured distance. '+(labels.join('; ')||'No speech samples.')+' Untested distances have no result. Table below provides values.');}
function render(){
  renderTests();
  $('share-consent').checked=false;
  renderSummary();$('sample-count').textContent=samples.length;$('empty').hidden=!!samples.length;$('samples').replaceChildren();
  for(const s of [...samples].reverse()){
    const card=el('article',undefined,'sample');const heading=el('div',undefined,'sample-heading');heading.append(el('strong',s.kind==='baseline'?'Background baseline':s.distance+' feet · speech'));const time=el('time',new Date(s.created).toLocaleTimeString());time.dateTime=s.created;heading.append(time);card.append(heading);
    card.append(el('p',`${s.duration.toFixed(1)}s · RMS ${s.rms.toFixed(1)} dBFS · peak ${s.peak.toFixed(1)} dBFS · near-clip samples ${s.clipping.toFixed(2)}%`,'metrics'));
    const audio=el('audio');audio.controls=true;audio.setAttribute('controlsList','nodownload noremoteplayback');audio.disableRemotePlayback=true;audio.preload='none';audio.src=s.url;audio.setAttribute('aria-label',s.kind==='baseline'?'Play background baseline':'Play speech at '+s.distance+' feet');
    audio.onplay=()=>document.querySelectorAll('audio').forEach(a=>{if(a!==audio)a.pause();});
    card.append(audio);
    if(s.kind==='speech'){
      const rating=el('div',undefined,'rating');const label=el('label','Your clarity rating (self-reported)');const select=el('select');select.setAttribute('aria-label','Clarity rating for '+s.distance+' feet');for(const [value,text] of [['unreviewed','Not reviewed'],['clear','Clear — every word understood'],['partial','Partial — some words uncertain'],['unclear','Unclear — words missing or unintelligible']]){const option=el('option',text);option.value=value;select.append(option);}select.value=s.rating;select.disabled=!s.listened;label.append(select);rating.append(label);const hint=el('p',s.listened?'Rate what you heard against the phrase. This is your self-reported review.':'Finish playback to enable your rating. Your rating is self-reported; the browser cannot verify what you heard.','hint');rating.append(hint);card.append(rating);
      audio.onended=()=>{s.listened=true;select.disabled=false;hint.textContent='Rate what you heard against the phrase. This is your self-reported review.';renderSummary();};
      select.onchange=()=>{s.rating=select.value;renderSummary();renderTests();renderGuidance();};
      const note=el('label','Review notes');note.className='sample-notes';const input=el('input');input.maxLength=300;input.placeholder='e.g. Last sentence muffled';input.value=s.reviewNotes;input.oninput=()=>s.reviewNotes=input.value;note.append(input);card.append(note);
    }
    const details=el('details');details.append(el('summary','Recorded setup'));details.append(el('p',Object.entries(s.notes).map(([k,v])=>`${k}: ${v||'not noted'}`).join(' · '),'hint'));card.append(details);
    const actions=el('div',undefined,'sample-actions');const del=el('button','Delete recording','danger');del.onclick=()=>{if(s.kind==='baseline'&&phase!=='idle')cancel('Baseline deleted. Record room noise again.');audio.pause();audio.removeAttribute('src');URL.revokeObjectURL(s.url);samples=samples.filter(x=>x!==s);render();};actions.append(del);card.append(actions);$('samples').append(card);
  }updateControls();
}
$('clear').onclick=()=>{document.querySelectorAll('audio').forEach(a=>{a.pause();a.removeAttribute('src');});samples.forEach(s=>URL.revokeObjectURL(s.url));samples=[];render();$('clear-status').textContent='All samples and ratings deleted from this tab. Your setup notes remain.';};
render();
$('share-results').onclick=async()=>{const button=$('share-results');if(button.disabled)return;if(!$('share-consent').checked){$('share-status').textContent='Submission is optional. Select the consent checkbox before submitting.';return;}try{const payload=sharedPayload(samples);button.disabled=true;const response=await fetch('/api/nine-line-system-test/results',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(response.status!==201)throw Error(response.status===429?'Sharing is temporarily limited. Try again later.':'Shared storage is unavailable. Nothing was confirmed saved. Try again later.');const receipt=await response.json();if(receipt.message!=='Result stored privately.')throw Error('Storage was not confirmed. Try again later.');$('share-status').textContent='Results submitted privately to EMT919. Recordings and notes stayed on this phone.';$('share-consent').checked=false;}catch(e){$('share-status').textContent=e.message||'Could not confirm submission. Try again later.';}finally{button.disabled=false;}};





