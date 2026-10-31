import { playCue, keepAwake } from './guidance.js';
// Timed local capture only. Permission/setup time never consumes the recording window.
export function createCapture({onState,onComplete,onError}) {
  let current=null,epoch=0,phase='idle',prepared=null;
  const closeContext=context=>{if(context&&context.state!=='closed'){context.onstatechange=null;try{context.close().catch(()=>{});}catch{}}};
  // Call directly in the Start/Retry click, BEFORE awaiting model preparation.
  function prepareAudio(){
    if(phase!=='idle'||document.hidden)return Promise.resolve(false);
    if(prepared)return prepared.ready;
    let context;try{
      context=new (window.AudioContext||window.webkitAudioContext)();
      const resumed=context.state==='suspended'?context.resume():Promise.resolve();
      const audio={context,ready:Promise.resolve(resumed).then(()=>context.state==='running',()=>false)};
      prepared=audio;return audio.ready;
    }catch{closeContext(context);return Promise.resolve(false);}
  }
  const state=()=>onState(phase,current);
  function release(run){
    if(!run)return;
    clearTimeout(run.deadline);clearTimeout(run.watchdog);clearInterval(run.clock);
    clearTimeout(run.settleTimer);run.cancelCue?.();run.releaseWake?.();
    if(run.context)run.context.onstatechange=null;
    run.stream?.getTracks().forEach(t=>{t.onended=null;t.stop();});
    try{run.source?.disconnect();run.analyser?.disconnect();}catch{}
    if(run.context&&run.context.state!=='closed')run.context.close().catch(()=>{});
  }
  function cancel(message='Recording cancelled. Retry this step when ready.'){
    epoch++;const run=current;current=null;phase='idle';if(prepared){closeContext(prepared.context);prepared=null;}
    if(run){run.discard=true;try{if(run.recorder?.state!=='inactive')run.recorder?.stop();}catch{}release(run);}
    state();if(message)onError(message);
  }
  function fail(run,message){if(current===run&&!run.discard)cancel(message);}
  function stop(run){
    if(current!==run||phase!=='recording')return;
    run.elapsed=(performance.now()-run.started)/1000;phase='stopping';
    clearTimeout(run.deadline);clearInterval(run.clock);state();
    // Wait briefly for the encoded final chunk, with the microphone already released.
    run.watchdog=setTimeout(()=>fail(run,'The browser did not finish this recording. Retry this step.'),3000);
    try{run.recorder.stop();releaseTracks(run);}catch{fail(run,'Could not finish this recording. Retry this step.');}
  }
  function releaseTracks(run){
    if(run.context)run.context.onstatechange=null;
    run.stream?.getTracks().forEach(t=>{t.onended=null;t.stop();});
    try{run.source?.disconnect();run.analyser?.disconnect();}catch{}
  }
  async function start(stage,notes,preparation=0){
    if(phase!=='idle'||document.hidden)return;
    prepareAudio();const audio=prepared;prepared=null;
    const run={ticket:++epoch,stage,notes,seconds:stage===0?5:10,chunks:[],sum:0,count:0,peak:0,clipped:0,frames:0,lastFrame:null,maxGap:0,discard:false,remaining:stage===0?5:10};
    run.context=audio?.context;current=run;phase='requesting';state();
    const live=()=>current===run&&!run.discard&&run.ticket===epoch;
    run.releaseWake=keepAwake(live,message=>{if(live()){run.wakeStatus=message;state();}});
    try{
      if(!audio||!await audio.ready)throw Error('Audio context unavailable');
      if(!live()){release(run);return;}
      run.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});
      if(!live()){release(run);return;}
      if(!run.stream.getAudioTracks().length)throw Error('No audio track');
      run.stream.getTracks().forEach(t=>t.onended=()=>fail(run,'The microphone disconnected. Retry this step.'));
      if(!live()){release(run);return;}
      if(run.context.state!=='running')throw Error('Audio context unavailable');
      run.context.onstatechange=()=>{if(live()&&run.context.state!=='running')fail(run,'Audio capture was interrupted. Retry this step.');};
      run.source=run.context.createMediaStreamSource(run.stream);run.analyser=run.context.createAnalyser();run.analyser.fftSize=2048;
      const beginRecording=()=>{
      if(!live())return;clearInterval(run.clock);
      try{
      phase='requesting';state();
      run.source.connect(run.analyser);
      const types=['audio/webm;codecs=opus','audio/mp4','audio/webm'];const mime=types.find(t=>MediaRecorder.isTypeSupported(t));
      run.recorder=mime?new MediaRecorder(run.stream,{mimeType:mime}):new MediaRecorder(run.stream);
      run.recorder.ondataavailable=e=>{if(live()&&e.data?.size)run.chunks.push(e.data);};
      run.recorder.onerror=()=>fail(run,'Recording failed. Retry this step.');
      run.recorder.onpause=()=>fail(run,'Recording was paused or interrupted. Retry this step.');
      run.recorder.onstop=()=>{
        if(!live())return;
        if(phase!=='stopping'){fail(run,'Recording ended early. Retry this step.');return;}
        clearTimeout(run.watchdog);releaseTracks(run);
        const blob=new Blob(run.chunks,{type:run.recorder.mimeType||run.chunks[0]?.type||'audio/webm'});
        // A blob alone is insufficient: require sustained finite analyser data and the full window.
        if(!blob.size||run.frames<run.seconds*5||!run.count||run.maxGap>1000||run.elapsed<run.seconds-.05||run.elapsed>run.seconds+1){fail(run,'No complete usable recording was captured. Check the microphone and retry this step.');return;}
        // A complete silent attempt is a negative distance result, not an invalid capture.
        const noSignal=stage>0&&run.peak<=.0001;
        const finish=()=>{if(!live())return;release(run);current=null;phase='idle';state();onComplete({...run,blob,noSignal});};
        phase='completion-cue';state();
        run.cancelCue=playCue(run.context,'complete',finish,()=>{run.cueUnavailable=true;finish();});
      };
      run.recorder.onstart=()=>{
        if(!live()||phase!=='requesting')return;
        run.started=performance.now();phase='recording';
        const data=new Float32Array(run.analyser.fftSize);
        const tick=()=>{
          if(!live()||phase!=='recording')return;
          const now=performance.now();
          try{
            run.analyser.getFloatTimeDomainData(data);
            let sum=0,peak=0,clipped=0;
            for(const value of data){if(!Number.isFinite(value))throw Error('Invalid analyser data');sum+=value*value;peak=Math.max(peak,Math.abs(value));if(Math.abs(value)>=.99)clipped++;}
            if(run.lastFrame!==null)run.maxGap=Math.max(run.maxGap,now-run.lastFrame);
            run.lastFrame=now;run.frames++;run.sum+=sum;run.count+=data.length;run.peak=Math.max(run.peak,peak);run.clipped+=clipped;run.level=Math.sqrt(sum/data.length);
          }catch{fail(run,'Microphone level data was unavailable. Retry this step.');return;}
          run.remaining=Math.max(0,Math.ceil(run.seconds-(now-run.started)/1000));state();
          if(now-run.started>=run.seconds*1000)stop(run);
        };
        tick();if(!live())return;
        run.clock=setInterval(tick,100);run.deadline=setTimeout(()=>stop(run),run.seconds*1000);
      };
      // A recorder that never emits start must not leave an open microphone indefinitely.
      run.watchdog=setTimeout(()=>fail(run,'Recording did not start. Retry this step.'),10000);
      const originalStart=run.recorder.onstart;
      run.recorder.onstart=()=>{clearTimeout(run.watchdog);originalStart();};
      run.recorder.start(250);
      }catch{fail(run,'Could not begin recording. Retry this step.');}
      };
      const afterPreparation=()=>{
        if(!live())return;clearInterval(run.clock);
        const settle=()=>{if(!live())return;phase='settling';state();run.settleTimer=setTimeout(()=>{if(live())beginRecording();},500);};
        phase='start-cue';state();
        run.cancelCue=playCue(run.context,'start',settle,()=>{if(!live())return;run.cueUnavailable=true;settle();});
      };
      if(stage>0){
        preparation=Number(preparation)===5?5:10;
        phase='preparing';run.preparedAt=performance.now();run.remaining=preparation;state();
        const prepare=()=>{if(!live()||phase!=='preparing')return;run.remaining=Math.max(0,Math.ceil(preparation-(performance.now()-run.preparedAt)/1000));state();if(run.remaining===0)afterPreparation();};
        run.clock=setInterval(prepare,100);
      }else afterPreparation();
    }catch(e){
      if(!live()){release(run);return;}
      const messages={NotAllowedError:'Microphone access was denied or blocked. Allow access in browser site settings, then retry this step.',NotFoundError:'No microphone was found. Connect or enable one, then retry.',NotReadableError:'The microphone is unavailable or in use. Close other recording apps, then retry.'};
      fail(run,messages[e.name]||'Could not start recording. Check microphone permission and browser support, then retry this step.');
    }
  }
  return {start,prepareAudio,cancel,get phase(){return phase;}};
}

