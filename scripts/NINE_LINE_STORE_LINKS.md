# 9/Line store availability

The product hero at `/9-line` and the 9/Line product card on `/` link directly to:

- iPhone: https://apps.apple.com/us/app/9-line/id6813856268
- Android: https://play.google.com/store/apps/details?id=com.emt919.nine

The owner supplied both exact URLs; both official store pages were verified November 2, 2026. Apple lists **9/Line**, seller/developer **Fast Dial Inc**, iPhone only, iOS 16.4 or later, version 1.0.48. Google Play lists **9/Line**, developer **Fast Dial Inc.**, with the EMT919 product website, EMT919 privacy policy and `contact@emt919.com` support address. No listing URL was inferred from the product name.

The availability copy is limited to Android and iPhone. Both store descriptions require agency approval, so the adjacent note says **Agency-approved access is required**. Store availability does not claim that connection, audio or live-listening issues are fixed. No user-agent redirects, app-store tracking parameters, downloads, installation prompts or new collection were added to the site.

Badge artwork is stored locally without modification. Apple appears first, uses the black badge at 40px high, and has 10px clear space. Google artwork retains its provided clear space and proportions.

- Apple source: https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg
- Apple SHA-256: `a26fc5b38380272c92e9019a2eb8b45542a66814b3e2b203772db8904b9fb99f`
- Google source: https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png
- Google SHA-256: `f72611e2df8e88204009fd896d05d5e8e83c77009c63943bbffa169559934849`

Run `node scripts/check-nine-line-stores.mjs` for local, read-only Chrome verification at 320/390/768/1440 pixels. External requests and submissions are blocked. Set `QA_REPORT_DIR` to an output directory outside the published tree if needed. Existing tester regression coverage remains `node --test scripts/nine-line-*.test.mjs scripts/demo-officers.test.mjs`.
