// Only explicit Start/Retry actions prepare the model; never load on page entry.
import {createLocalAnalyzer} from './controller.js';
import {estimate,uncertain} from './scoring.js';
export function createRecognitionSession({onChange=()=>{},analyzer=createLocalAnalyzer()}={}){
 let epoch=0,busy=false,state='idle';
 const update=value=>{state=value;onChange(value);};
 async function prepare(){
  if(busy)throw Error('Recognition is busy.');
  const ticket=epoch;busy=true;update(analyzer.ready?'ready':'loading');
  try{await analyzer.load();if(ticket!==epoch)throw Error('Preparation cancelled.');update('ready');}
  catch(e){if(ticket===epoch)update('unavailable');throw e;}
  finally{if(ticket===epoch){busy=false;onChange(state);}}
 }
 async function analyze(sample){
  if(busy)throw Error('Recognition is busy.');
  const ticket=epoch;busy=true;update('analyzing');
  try{
   if(!analyzer.ready)await analyzer.load();
   if(ticket!==epoch)return null;
   const noSignal=sample.levels.peakDb<=-80;
   const text=noSignal?'':await analyzer.analyze(sample.blob);
   if(ticket!==epoch)return null;
   const result=estimate(text,sample.distance,{noSignal,clipping:sample.levels.clipping});
   update('ready');return result;
  }catch{if(ticket!==epoch)return null;update('unavailable');return uncertain(sample.levels.clipping);}
  finally{if(ticket===epoch){busy=false;onChange(state);}}
 }
 function cancel(){epoch++;analyzer.cancel();busy=false;update('idle');}
 return {prepare,analyze,cancel,get busy(){return busy},get state(){return state}};
}
