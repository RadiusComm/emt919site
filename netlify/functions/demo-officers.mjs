// Same-origin bridge only. Supabase owns credential checks, signed sessions and CRM credentials.
const endpoint = 'https://ptoqbvoxtknebussntdh.supabase.co/functions/v1/event-demo';
export function createHandler(requestFetch = fetch) {
  return async request => {
    const match = new URL(request.url).pathname.match(/^\/api\/demo\/(session|login|logout|officers)$/);
    if (!match) return Response.json({ error: 'Not found.' }, { status: 404 });
    const route = match[1];
    if (request.method !== (route === 'session' ? 'GET' : 'POST')) return Response.json({ error: 'Method not allowed.' }, { status: 405 });
    if (request.method === 'POST' && (request.headers.get('origin') !== new URL(request.url).origin || !request.headers.get('content-type')?.startsWith('application/json'))) return Response.json({ error: 'Request must originate from this website.' }, { status: 403 });
    const headers = new Headers({ 'Content-Type': 'application/json' });
    for (const key of ['cookie', 'origin']) if (request.headers.has(key)) headers.set(key, request.headers.get(key));
    const responseHeaders = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
    try {
      const body = request.method === 'POST' ? await request.text() : undefined;
      if (body?.length > 4096) return Response.json({ error: 'Request too large.' }, { status: 413, headers: responseHeaders });
      const upstream = await requestFetch(`${endpoint}?route=${route}`, { method: request.method, headers, ...(body !== undefined ? { body } : {}), signal: AbortSignal.timeout(35000) });
      if (upstream.headers.has('set-cookie')) responseHeaders['Set-Cookie'] = upstream.headers.get('set-cookie');
      return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
    } catch { return Response.json({ error: route === 'officers' ? 'Could not confirm the result. Check the CRM before trying again.' : 'The demo service is temporarily unavailable.' }, { status: 503, headers: responseHeaders }); }
  };
}
export default createHandler();
export const config = { path: '/api/demo/*', rateLimit: { action: 'rate_limit', aggregateBy: ['domain', 'ip'], windowSize: 60, windowLimit: 20 } };
