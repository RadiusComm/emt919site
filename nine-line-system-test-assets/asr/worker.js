// Same-origin local inference only. No expected phrase, distance, prompt or prior transcript enters generation.
import {env,pipeline} from './vendor/transformers.min.js';
env.allowRemoteModels=false;env.allowLocalModels=true;env.localModelPath=new URL('./models/',import.meta.url).href;
env.useBrowserCache=true;
env.backends.onnx.wasm.wasmPaths=new URL('./vendor/',import.meta.url).href;
env.backends.onnx.wasm.numThreads=1;
env.backends.onnx.wasm.proxy=false;
let model;
self.onmessage=async({data})=>{const {id,type,pcm}=data;try{
 if(type==='load'){
  model=await pipeline('automatic-speech-recognition','whisper-tiny.en',{device:'wasm',dtype:'q8',local_files_only:true,progress_callback:p=>self.postMessage({id,type:'progress',progress:Number.isFinite(p.progress)?p.progress:null,file:String(p.file||'')})});
  self.postMessage({id,type:'ready'});return;
 }
 if(type!=='analyze'||!model||!(pcm instanceof Float32Array)||pcm.length<1600||pcm.length>16_000*15)throw Error('Invalid local analysis request');
 const output=await model(pcm,{max_new_tokens:128,do_sample:false,return_timestamps:false});
 pcm.fill(0);self.postMessage({id,type:'result',text:String(output.text||'')});
}catch{pcm?.fill?.(0);self.postMessage({id,type:'error',message:'Local analysis unavailable. Retry or use manual listening.'});}};
