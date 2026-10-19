import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from '../netlify/functions/demo-officers.mjs';
const origin = 'https://emt919.com';
test('bridge forwards cookies and activation requests to Supabase without any Netlify secrets', async () => {
  let calls = 0;
  const handler = createHandler(async (url, options) => {
    calls++;
    assert.equal(url, 'https://ptoqbvoxtknebussntdh.supabase.co/functions/v1/event-demo?route=officers');
    assert.equal(options.headers.get('cookie'), 'test-cookie');
    assert.equal(options.headers.get('origin'), origin);
    assert.deepEqual(JSON.parse(options.body), { name: 'Test', rank: 'Officer', phone: '2025550147' });
    return Response.json({ registered: true, sms_sent: true }, { status: 201, headers: { 'Set-Cookie': '__Host-emt-demo=example; HttpOnly; Secure; SameSite=Strict; Path=/' } });
  });
  const response = await handler(new Request(`${origin}/api/demo/officers`, { method: 'POST', headers: { Origin: origin, Cookie: 'test-cookie', 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Test', rank: 'Officer', phone: '2025550147' }) }));
  assert.equal(response.status, 201);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.ok(response.headers.get('set-cookie').includes('HttpOnly'));
  assert.equal(calls, 1);
});
test('bridge rejects cross-origin, arbitrary paths, wrong methods and oversized requests', async () => {
  const handler = createHandler(() => assert.fail('No backend call expected'));
  assert.equal((await handler(new Request(`${origin}/api/demo/delete`, { method: 'POST' }))).status, 404);
  assert.equal((await handler(new Request(`${origin}/api/demo/officers`))).status, 405);
  assert.equal((await handler(new Request(`${origin}/api/demo/login`, { method: 'POST', headers: { Origin: 'https://other.example' } }))).status, 403);
  assert.equal((await handler(new Request(`${origin}/api/demo/login`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: 'x'.repeat(4097) }))).status, 413);
});
test('bridge returns sign-in failures and ambiguous registration failures safely', async () => {
  const denied = createHandler(async () => Response.json({ error: 'Sign in to continue.' }, { status: 401 }));
  assert.equal((await denied(new Request(`${origin}/api/demo/session`))).status, 401);
  const failed = createHandler(async () => { throw new Error('private backend detail'); });
  const response = await failed(new Request(`${origin}/api/demo/officers`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: '{}' }));
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /Check the CRM/);
});

test('bridge isolates the session cookie from upstream infrastructure cookies', async () => {
  const headers = new Headers();
  headers.append('Set-Cookie', '__Host-emt-demo=signed-session; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800');
  headers.append('Set-Cookie', '__cf_bm=upstream-only; Domain=supabase.co; Path=/; Expires=Mon, 19 Oct 2026 14:00:00 GMT');
  const handler = createHandler(async () => new Response('{}', { headers }));
  const response = await handler(new Request(`${origin}/api/demo/login`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: '{}' }));
  assert.equal(response.headers.get('set-cookie'), '__Host-emt-demo=signed-session; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800');
});
