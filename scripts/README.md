# Website maintenance and release checks

This remains a static HTML site deployed to the existing Netlify project by pushes to `main`. No application, carrier or database changes are part of this release.

## Shared presentation

- Edit `site-components/header.html` and `site-components/footer.html` for shared navigation.
- Run `node scripts/sync-site-shell.cjs` to synchronize page shells and generate `site-shared.20260912.css` from the existing stylesheet chain. Preserve page-specific styles.
- Edit `site-ui.20260912.css` for the current design tokens and responsive/accessibility refinements.
- New production changes to cached assets should receive a new versioned filename and updated references. Do not overwrite previously deployed immutable assets.
- Inquiry forms retain their registered Netlify names, hidden form-name field, honeypot, field names and `/thanks` fallback. The JavaScript adds pending/error feedback and blocks duplicate clicks; it does not guarantee server-side idempotency.
- The removed public SMS opt-in form must not be reintroduced. An old Netlify form registration is not a public consent path.

## Repeatable checks

Use Node.js and an installed Playwright browser runtime. Set `PLAYWRIGHT_MODULE` if Playwright is outside the default module path. Set `QA_BASE` to the exact local preview or hosted origin, without a trailing slash, and optionally `QA_REPORT` to a report file outside the published directory.

Run `node scripts/check-site.cjs`. It checks local assets, approved policy content against the pre-redesign revision, the package-availability sentence, page responses/landmarks at 320, 390, 768 and 1440 pixels, keyboard navigation, honeypot focus exclusion, filtering, text enlargement and mocked form responses. Form POSTs in these tests are intercepted, never sent to Netlify. Mocked success does not prove email notification delivery.

Before each release, also inspect desktop and mobile screenshots, keyboard focus, open menus, disclosures, form feedback and the demonstration map. Check changed links and all compliance URLs. Browser geometry and contrast checks are not an accessibility certification.

## Release and rollback

1. Preserve unrelated changes; inspect the diff and run the checks.
2. Confirm `emt919site` and the existing Netlify project are the deployment targets.
3. Commit the validated source and push `main`.
4. Confirm Netlify reports the matching commit as published, then check the public URLs and page content.
5. If a regression affects access or approved disclosures, use Netlify's previous published deploy to restore the known-good site. Coordinate the corresponding source correction or reviewed revert so a later automatic deployment does not restore the fault. Do not use a destructive reset.

The pre-redesign source is `bf7ac59d0c6b518280c9c2a614a564ffd5353251`; its published Netlify deploy was `6aa4df56f05cd50009030082`.

## Follow-up evidence, not invented claims

- Confirm the authoritative language/service-mode catalog before publishing numeric AI-language coverage.
- Confirm support hours and response commitments before advertising them.
- Obtain owner-approved security evidence, device support and customer references before changing related claims.
- Test on physical iOS/Android devices and with screen readers; review the overview video's captions separately.
- Evaluate form delivery using an explicitly identified test submission and confirm receipt with the destination team.
- Before A/B experiments, agree on a privacy-reviewed measurement plan. Suggested experiments: product-led vs workflow-led hero, direct demo CTA vs product comparison CTA. Measure accepted qualified requests, not button clicks alone; do not fabricate lift or install new analytics by default.
- Target LCP ≤2.5s, INP ≤200ms and CLS ≤0.1 when field data becomes available. The stylesheet request-chain reduction is not evidence of achieving those targets.
