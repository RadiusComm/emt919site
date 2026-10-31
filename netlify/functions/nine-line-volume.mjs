// Public opt-in numeric volume roster only; legacy private endpoint is unchanged.
import {publicVolumePayload,validateRoster,validatePublicReceipt} from '../../nine-line-system-test-assets/volume-contract.js';
const upstream='https://covert-mode-tester-nineline-20261031.zanzee.chatgpt.site';
const headers={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const reply=(status,value)=>new Response(JSON.stringify(typeof value==='string'?{message:value}:value),{status,headers});
async function bounded(body,limit){const reader=body?.getReader();if(!reader)throw Error('Missing body');let size=0,parts=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw Error('Too large');}parts.push(value);}const bytes=new Uint8Array(size);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.byteLength;}return JSON.parse(new TextDecoder().decode(bytes));}
export function createHandler(requestFetch=fetch,{enabled=false}={}){return async request=>{
 const url=new URL(request.url),read=url.pathname==='/api/nine-line-system-test/volume-roster',write=url.pathname==='/api/nine-line-system-test/volume-results';
 if((!read&&!write)||url.search)return reply(404,'Not found.');
 if(request.method!==(read?'GET':'POST'))return reply(405,'Method not allowed.');
 if(write&&(request.headers.get('Origin')!==url.origin||(request.headers.get('Sec-Fetch-Site')&&request.headers.get('Sec-Fetch-Site')!=='same-origin')))return reply(403,'Same-origin submission required.');
 if(!enabled)return reply(503,'Public roster is not available yet.');
 let payload;
 if(write){if(request.headers.get('Content-Type')?.split(';')[0].trim()!=='application/json')return reply(415,'JSON only.');if(Number(request.headers.get('Content-Length'))>12000)return reply(413,'Too large.');try{payload=publicVolumePayload(await bounded(request.body,12000));}catch(e){return reply(e.message==='Too large'?413:400,'Invalid public result.');}}
 try{
  const options={method:read?'GET':'POST',headers:read?{}:{'Content-Type':'application/json',Origin:upstream},signal:AbortSignal.timeout(10000),redirect:'error'};if(write)options.body=JSON.stringify(payload);
  const response=await requestFetch(upstream+(read?'/api/volume-roster':'/api/volume-results'),options);
  if(response.status===429)return reply(429,'Collection limit reached.');
  if(response.status!==(read?200:201))return reply(503,'Public roster is unavailable. Nothing was confirmed published.');
  const result=await bounded(response.body,read?131072:1000);
  if(!(read?validateRoster(result):validatePublicReceipt(result)))throw Error('Invalid receipt');
  return reply(read?200:201,result);
 }catch{return reply(503,'Public roster is unavailable. Nothing was confirmed published.');}
};}
export default createHandler(fetch,{enabled:true});
export const config={path:['/api/nine-line-system-test/volume-results','/api/nine-line-system-test/volume-roster'],rateLimit:{action:'rate_limit',aggregateBy:['domain','ip'],windowSize:60,windowLimit:10}};
