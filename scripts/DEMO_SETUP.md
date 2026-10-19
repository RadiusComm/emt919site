# Private event demo registration

Page: `https://emt919.com/event-demo` (not linked in public navigation or sitemap).

The website's Netlify endpoint is a same-origin bridge to Supabase `event-demo`. **No new Netlify environment variables are required.** Deploy the website by pushing to main as usual.

The Supabase endpoint authenticates the dedicated `demo@emt919.com` login using a salted scrypt password hash in `event_demo_operators`. The credential and rate-limit tables have RLS enabled and all access revoked from public, anon and authenticated users. Only the backend service role can read or modify them. This is a dedicated demo-page login; it grants no general CRM or dashboard account access.

The server reuses the existing Supabase `CRM_API_KEY` and calls `crm-officers` with `action: add` only. It never returns or accepts officer lists, editing, deletion, manual verification or reactivation. No API keys or plaintext passwords are committed or returned to the browser.

Signed cookies are Secure, HttpOnly, SameSite=Strict and expire after eight hours. Matching Origin and JSON are required for mutations. Netlify limits all page API requests to 20 per IP/domain/minute; Supabase persists additional login and registration limits. Deactivating the operator or rotating its password hash revokes current sessions.

CRM behavior is unchanged: seven-day demo registration; activation text requests a YES reply; pending until confirmation; then the officer can dial #919. API acceptance of an SMS is not proof of delivery. SMS failure and duplicate numbers are shown separately. For existing registrations and failed sends, use CRM's Demo Officers page rather than creating another officer.

Verification:

- Website: `node --test scripts/demo-officers.test.mjs`
- EMTSystem backend: `node --test supabase/functions/event-demo/handler.test.mjs`

These tests mock upstream SMS and do not create real officers. Real SMS delivery and YES/#919 activation require a consenting test recipient.
