// Dedicated anonymous summary receiver. Never forwards audio, notes, cookies, identity or CRM data.
import { validate } from '../lib/nine-line-test-validation.mjs';
const upstreamOrigin = 'https://covert-mode-tester-nineline-20261031.zanzee.chatgpt.site';
const route = '/api/nine-line-system-test/results';
const headers = { 'Content-Type':'application/json', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'no-referrer' };
const reply=(status,message)=>new Response(JSON.stringify({message}),{status,headers});
export function createHandler(requestFetch=fetch) {
 return async request=>{
  const url=new URL(request.url);
  if(url.pathname!==route)return reply(404,'Not found.');
  if(request.method!=='POST')return reply(405,'Only explicit submissions are supported.');
  if(request.headers.get('Origin')!==url.origin || (request.headers.get('Sec-Fetch-Site') && request.headers.get('Sec-Fetch-Site')!=='same-origin'))return reply(403,'Same-origin submission required.');
  if(request.headers.get('Content-Type')?.split(';')[0].trim()!=='application/json')return reply(415,'JSON only.');
  if(Number(request.headers.get('Content-Length'))>12000)return reply(413,'Too large.');
  let payload;
  try{
   const reader=request.body?.getReader();if(!reader)return reply(400,'Missing result.');let total=0;const chunks=[];
   while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>12000){await reader.cancel();return reply(413,'Too large.');}chunks.push(value);}
   const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
   payload=JSON.parse(new TextDecoder().decode(bytes));
  }catch{return reply(400,'Invalid JSON.');}
  if(!validate(payload))return reply(400,'Invalid result.');
  const sanitized={consent:true,model:payload.model,results:payload.results.map(r=>({distance:r.distance,rms:r.rms,peak:r.peak,clipping:r.clipping,rating:r.rating}))};
  try{
   // Fixed server-to-server destination. Neither visitor cookies nor identity headers are forwarded.
   const response=await requestFetch(upstreamOrigin+'/api/results',{method:'POST',headers:{'Content-Type':'application/json',Origin:upstreamOrigin},body:JSON.stringify(sanitized),signal:AbortSignal.timeout(10000),redirect:'error'});
   if(response.status===429)return reply(429,'Collection limit reached.');
   if(response.status!==201)return reply(503,'Could not confirm storage. Keep your local report.');
   const receipt=await response.text();if(receipt.length>1000 || JSON.parse(receipt).message!=='Result stored privately.')return reply(503,'Could not confirm storage. Keep your local report.');
   return reply(201,'Result stored privately.');
  }catch{return reply(503,'Could not confirm storage. Keep your local report.');}
 };
}
export default createHandler();
export const config={path:'/api/nine-line-system-test/results',rateLimit:{action:'rate_limit',aggregateBy:['domain','ip'],windowSize:60,windowLimit:10}};

