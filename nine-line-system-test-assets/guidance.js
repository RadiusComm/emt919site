// Local speech only; never send audio or cue text to a remote voice service.
export function speakCue(text,done,unavailable){
  const synth=globalThis.speechSynthesis;
  let voice;try{voice=synth?.getVoices().find(v=>v.localService&&/^en\b/i.test(v.lang));}catch{unavailable(false);return ()=>{};}
  if(!voice||!globalThis.SpeechSynthesisUtterance){unavailable(false);return ()=>{};}
  let finished=false,timer;
  const utterance=new SpeechSynthesisUtterance(text);utterance.voice=voice;utterance.lang=voice.lang;
  function clear(){clearTimeout(timer);utterance.onend=null;utterance.onerror=null;}
  function finish(ok){if(finished)return;finished=true;clear();if(!ok)try{synth.cancel();}catch{}if(ok)done();else unavailable(true);}
  utterance.onend=()=>finish(true);utterance.onerror=()=>finish(false);
  timer=setTimeout(()=>finish(false),5000);
  try{synth.speak(utterance);}catch{finish(false);}
  return ()=>{if(finished)return;finished=true;clear();try{synth.cancel();}catch{}};
}
export function keepAwake(isActive,onStatus){
  let ended=false,sentinel;
  const release=()=>{ended=true;if(sentinel){sentinel.release().catch(()=>{});sentinel=null;}};
  if(!navigator.wakeLock?.request||document.hidden){onStatus('Screen-awake protection unavailable. Keep this page visible; hiding it cancels the current step.');return release;}
  try{Promise.resolve(navigator.wakeLock.request('screen')).then(lock=>{
    if(ended||document.hidden||!isActive()){lock.release().catch(()=>{});return;}
    sentinel=lock;onStatus('Screen-awake protection active while this step runs.');
    lock.addEventListener?.('release',()=>{if(!ended)onStatus('Screen-awake protection released. Keep this page visible; hiding it cancels the current step.');});
  }).catch(()=>{if(!ended)onStatus('Screen-awake protection unavailable. Keep this page visible; hiding it cancels the current step.');});}
  catch{onStatus('Screen-awake protection unavailable. Keep this page visible.');}
  return release;
}
