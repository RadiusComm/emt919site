// Public read-only adapter. The dashboard publishes directly to Supabase after approval.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
const endpoint = 'https://ptoqbvoxtknebussntdh.supabase.co/functions/v1/content919-public';
const escapeHtml = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const htmlResponse = (html: string) => new Response(html, { headers: {'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=30','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"} });
const template = () => readFile(join(process.cwd(),'news.html'),'utf8');
export default async (request: Request) => {
 const path = new URL(request.url).pathname;
 if(!['/api/content919/posts','/article-sitemap.xml','/news','/news.html'].includes(path) && !/^\/api\/content919\/image\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(path) && !/^\/news\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(path)) return new Response('Not found',{status:404});
 if(request.method!=='GET')return new Response('Method not allowed',{status:405});
 try {
  const imageSlug=path.startsWith('/api/content919/image/')?path.slice('/api/content919/image/'.length):null;
  const slug=path.startsWith('/news/')?path.slice(6):null;
  const response=await fetch(endpoint+(imageSlug?'?image='+encodeURIComponent(imageSlug):slug?'?slug='+encodeURIComponent(slug):''),{signal:AbortSignal.timeout(15000)});
  if(!response.ok){if(response.status===404)return new Response('Article not found',{status:404});throw new Error('Supabase unavailable');}
  if(imageSlug)return new Response(response.body,{headers:{'Content-Type':'image/jpeg','Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff'}});
  const data=await response.json();
  if(path==='/api/content919/posts')return Response.json(data,{headers:{'Cache-Control':'public, max-age=30'}});
  if(path==='/article-sitemap.xml')return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+data.posts.map((p:any)=>'<url><loc>'+escapeHtml(p.url)+'</loc><lastmod>'+escapeHtml(p.published_at)+'</lastmod></url>').join('')+'</urlset>',{headers:{'Content-Type':'application/xml','Cache-Control':'public, max-age=30'}});
  let html=await template();
  if(slug){
   html=html.replace(/<title>[^<]*<\/title>/,`<title>${escapeHtml(data.seo_title)} | EMT919</title>`).replace(/<meta name="description"[^>]*>/,`<meta name="description" content="${escapeHtml(data.meta_description)}">`).replace(/<link rel="canonical"[^>]*>/,`<link rel="canonical" href="${escapeHtml(data.url)}">`);
   const ld=JSON.stringify({'@context':'https://schema.org','@type':'Article',headline:data.title,description:data.summary,datePublished:data.published_at,dateModified:data.published_at,...(data.image_url?{image:data.image_url}:{}),mainEntityOfPage:data.url,author:{'@type':'Organization',name:'EMT919'},publisher:{'@type':'Organization',name:'EMT919'}}).replace(/</g,'\\u003c');
   html=html.replace('</head>',`<link rel="stylesheet" href="/content-news.20261002.css"><meta property="og:title" content="${escapeHtml(data.title)}"><meta property="og:description" content="${escapeHtml(data.summary)}"><meta property="og:url" content="${escapeHtml(data.url)}"><meta property="og:type" content="article">${data.image_url?`<meta property="og:image" content="${escapeHtml(data.image_url)}">`:""}<script type="application/ld+json">${ld}</script></head>`);
   html=html.replace(/<main id="main-content">[\s\S]*?<\/main>/,`<main id="main-content"><div class="content919-article"><a href="/news">← News &amp; insights</a><p><time datetime="${escapeHtml(data.published_at)}">${escapeHtml(new Date(data.published_at).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'America/New_York'}))}</time></p>${data.image_url?`<figure><img src="${escapeHtml(data.image_url)}" alt="${escapeHtml(data.image_alt||data.title)}" width="1024" height="1024"><figcaption>${data.image_origin==='generated'?'AI-generated illustration':''}</figcaption></figure>`:''}${data.html}</div></main>`);
  }else if(data.posts?.length){
   const cards=data.posts.map((p:any)=>`<article><div><small>${escapeHtml(new Date(p.published_at).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'America/New_York'}))}</small><h2><a href="/news/${escapeHtml(p.slug)}">${escapeHtml(p.title)}</a></h2><p>${escapeHtml(p.summary)}</p><a class="text-link dark-link" href="/news/${escapeHtml(p.slug)}">Read the article →</a></div></article>`).join('');
   html=html.replace('id="content919-news" hidden','id="content919-news"').replace('<div id="content919-news-grid" class="news-grid news-archive"></div>',`<div id="content919-news-grid" class="news-grid news-archive">${cards}</div>`);
  }
  // The server already included the cards. Keep the browser loader for the static outage fallback only.
  html=html.replace('<script src="/content-news.20261002.js" defer></script>','');
  return htmlResponse(html);
 }catch{
  if(path==='/news'||path==='/news.html'){try{return htmlResponse(await template());}catch{/* fall through */}}
  return Response.json({error:'Articles are temporarily unavailable.'},{status:503});
 }
};
export const config={path:['/api/content919/posts','/api/content919/image/*','/news','/news.html','/news/*','/article-sitemap.xml']};
