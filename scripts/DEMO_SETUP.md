# Private event demo registration

Page: `https://emt919.com/event-demo` (not linked in public navigation or sitemap).

The website's Netlify endpoint is a same-origin bridge to Supabase `event-demo`. **No new Netlify environment variables are required.** Deploy the website by pushing to main as usual.

Administrators add names and US mobile numbers in EMT Dashboard → Authorized Users. Only enabled entries can receive a six-digit Twilio SMS code and sign in. Email/password login is retired. Event users receive no general CRM or dashboard access.

Supabase uses the existing `TWILIO_ACCOUNT_SID`, `TWILIO_MESSAGING_NUMBER` and `TWILIO_API_KEY_SID` / `TWILIO_API_KEY_SECRET` (falling back to `TWILIO_AUTH_TOKEN`). These match the 9/Line sender setup. Codes are HMAC hashed with a server secret, expire after ten minutes, allow five attempts, are single use, and have a 60-second resend cooldown / five-send hourly cap. Codes and access lists are never returned publicly. Only active dashboard administrators can manage the access list through RLS.

The server reuses the existing Supabase `CRM_API_KEY` and calls `crm-officers` with `action: add` only. It never returns or accepts officer lists, editing, deletion, manual verification or reactivation. No API keys or plaintext passwords are committed or returned to the browser.

Signed cookies are Secure, HttpOnly, SameSite=Strict and expire after eight hours. Matching Origin and JSON are required for mutations. Netlify limits all page API requests to 20 per IP/domain/minute; Supabase persists additional login and registration limits. Disabling a user or changing their phone rotates the user's session version and revokes both current sessions and outstanding codes. Re-enabling requires a new OTP login.

CRM behavior is unchanged: seven-day demo registration; activation text requests a YES reply; pending until confirmation; then the officer can dial #919. API acceptance of an SMS is not proof of delivery. SMS failure and duplicate numbers are shown separately. For existing registrations and failed sends, use CRM's Demo Officers page rather than creating another officer.

Verification:

- Website: `node --test scripts/demo-officers.test.mjs`
- EMTSystem backend: `node --test supabase/functions/event-demo/handler.test.mjs supabase/functions/event-demo/phone-auth.test.mjs`

These tests mock upstream SMS and do not create real officers. Real SMS delivery and YES/#919 activation require a consenting test recipient.
