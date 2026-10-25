// Presentation safeguard for the existing 9/Line query-string context.
// Intake, context adaptation, consent and conversion remain in existing scripts.
if (new URLSearchParams(window.location.search).get('product') === '9-line') {
 document.body.classList.add('nine-demo-context');
}
