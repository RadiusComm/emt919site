const scenarios = [
  { code: "01", title: "Traffic stops", copy: "Give clear directions. Confirm understanding. Keep the stop moving." },
  { code: "02", title: "Domestic calls", copy: "Separate confusion from danger when every word matters." },
  { code: "03", title: "Medical response", copy: "Get symptoms, medications, and history without losing the first minute." },
  { code: "04", title: "Schools", copy: "Communicate with students, parents, and staff in the moment." },
  { code: "05", title: "Corrections", copy: "Explain instructions and reduce avoidable conflict inside the facility." },
  { code: "06", title: "Crisis calls", copy: "Slow the scene down and connect people to the help they need." },
  { code: "07", title: "Witness interviews", copy: "Begin gathering a clear account while preserving speaker roles and the live-interpreter path." },
  { code: "08", title: "Welfare checks", copy: "Ask immediate safety questions and explain next steps across a language barrier." },
  { code: "09", title: "Dispatch support", copy: "Use an agency-configured language workflow before or during responder contact." },
];

const outcomes = [
  "Maintain scene control",
  "Explain commands clearly",
  "Reduce confusion",
  "De-escalate faster",
  "Request and confirm consent",
  "Deliver certified Miranda",
  "Escalate to a live interpreter",
];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="EMT919 home">
          <span className="brand-shield">919</span>
          <span>EMT<span className="brand-accent">919</span></span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#how">How it works</a>
          <a href="#scenes">Scenes</a>
          <a href="#service-options">Service options</a>
          <a href="#trust">Procurement</a>
        </nav>
        <a className="button button-small" href="mailto:contact@emt919.com?subject=EMT919%20demo">Talk to us</a>
      </header>

      <section className="hero" id="top">
        <div className="signal signal-red" />
        <div className="signal signal-blue" />
        <div className="hero-copy">
          <p className="eyebrow"><span /> Built for the badge</p>
          <h1>Language shouldn&apos;t<br />control the scene.</h1>
          <p className="hero-lede">
            EMT919 keeps officers communicating when seconds matter.
            No app hunt. No long hold. Just dial and start talking.
          </p>
          <div className="hero-actions">
            <a className="button" href="mailto:contact@emt919.com?subject=Schedule%20an%20EMT919%20demo">Schedule a demo</a>
            <a className="text-link" href="#how">See how #919 works <span>↓</span></a>
          </div>
          <div className="hero-proof">
            <div><strong>31</strong><span>AI languages</span></div>
            <div><strong>300+</strong><span>With live interpreters</span></div>
            <div><strong>1 call</strong><span>No new hardware</span></div>
          </div>
        </div>

        <div className="hero-device" aria-label="Illustration showing the EMT919 call flow">
          <div className="radio-tag"><span className="pulse" /> READY FOR DUTY</div>
          <div className="phone">
            <div className="phone-top"><span>9:19</span><span>● ● ●</span></div>
            <div className="phone-screen">
              <p>EMT919</p>
              <small>EMERGENCY MULTITRANSLATOR</small>
              <div className="dialed">#919</div>
              <div className="connecting"><span /> Connecting securely</div>
              <div className="call-button">CALL</div>
            </div>
          </div>
          <div className="first-minute">
            <small>THE FIRST MINUTE</small>
            <strong>Officer arrives.</strong>
            <span>Victim speaks Spanish.</span>
            <b>Dial #919. Start talking.</b>
          </div>
        </div>
      </section>

      <section className="statement">
        <p>Before the interpreter joins.<br />Before the report is written.</p>
        <h2>The first minute belongs to the officer.</h2>
      </section>

      <section className="how section" id="how">
        <div className="section-heading">
          <p className="eyebrow dark"><span /> Built for the street</p>
          <h2>Three steps.<br />That&apos;s it.</h2>
          <p>Works from the phone officers already carry. No downloads, logins, or extra gear on the belt.</p>
        </div>
        <div className="steps">
          <article>
            <span className="step-number">01</span>
            <div className="step-icon">#</div>
            <h3>Dial</h3>
            <p>Call the dedicated agency line or dial #919 from an authorized device.</p>
          </article>
          <article>
            <span className="step-number">02</span>
            <div className="step-icon">“ ”</div>
            <h3>Talk</h3>
            <p>Say what you need. EMT919 translates each turn clearly and keeps roles straight.</p>
          </article>
          <article>
            <span className="step-number">03</span>
            <div className="step-icon">→</div>
            <h3>Continue</h3>
            <p>Keep working the call. Move to a live interpreter when policy or language requires it.</p>
          </article>
        </div>
      </section>

      <section className="scenes section" id="scenes">
        <div className="section-heading light">
          <p className="eyebrow"><span /> Where it works</p>
          <h2>Real calls.<br />Clear communication.</h2>
        </div>
        <div className="scenario-grid">
          {scenarios.map((item) => (
            <article key={item.code}>
              <span>{item.code}</span>
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="outcomes section">
        <div className="outcome-intro">
          <p className="eyebrow dark"><span /> Why officers use it</p>
          <h2>Keep control.<br />Keep communicating.</h2>
          <p>Translation is the tool. A safer, clearer scene is the outcome.</p>
        </div>
        <ul>
          {outcomes.map((outcome, index) => (
            <li key={outcome}><span>{String(index + 1).padStart(2, "0")}</span>{outcome}<b>✓</b></li>
          ))}
        </ul>
      </section>

      <section className="neutrality-promo section">
        <div>
          <p className="eyebrow"><span /> A neutral third party by design</p>
          <h2>Translate what was said.<br />Not what someone wants hidden.</h2>
          <p>EMT919&apos;s internal QA program tests attempts by either party to recruit, redirect, or manipulate the interpreter. Required behavior is to preserve speaker roles, relay the statement faithfully, and surface the manipulation attempt.</p>
          <a className="text-link" href="/neutrality-testing.html">See the neutrality and testing program <span>→</span></a>
        </div>
        <div className="neutrality-grid">
          <article><strong>Both directions</strong><p>Influence testing covers pressure from responders and members of the public.</p></article>
          <article><strong>Critical details</strong><p>Names, dates, identifiers, dosages, and other case-sensitive details are scored for fidelity.</p></article>
          <article><strong>Field chaos</strong><p>Overlapping voices, code-switching, bystanders, and background speech are standing test classes.</p></article>
          <article><strong>Human boundary</strong><p>Policy-controlled and legally sensitive interactions follow approved scripts and live-interpreter rules.</p></article>
        </div>
      </section>

      <section className="evidence-strip section">
        <div><strong>2,100+</strong><span>Scripted scenarios in the internal QA program</span></div>
        <div><strong>57</strong><span>Laboratory test batches completed as of July 2026</span></div>
        <div><strong>2-way</strong><span>Influence and neutrality testing from both sides</span></div>
        <div><strong>Every run</strong><span>Collusion and inducement behavior scored continuously</span></div>
        <p>Figures describe City919&apos;s internal QA program—not customer outcomes, field-performance guarantees, or independent certification. Testing is continuous and the public methodology may evolve.</p>
      </section>

      <section className="security section" id="security">
        <div className="security-intro">
          <p className="eyebrow"><span /> Security behind every call</p>
          <h2>Built on proven<br />infrastructure.</h2>
          <p>EMT919 combines documented platform controls with SOC 2-certified providers across hosting, telephony, and speech processing.</p>
          <a className="text-link" href="mailto:contact@emt919.com?subject=EMT919%20security%20package">Request the agency security package <span>→</span></a>
        </div>
        <div className="security-controls" aria-label="EMT919 security controls">
          <article><span className="security-mark">SOC</span><div><strong>SOC 2 provider infrastructure</strong><p>Certified providers support the hosting, telephony, and AI service layers.</p></div></article>
          <article><span className="security-mark">US</span><div><strong>U.S.-based processing</strong><p>Customer platform data is stored and processed in the United States.</p></div></article>
          <article><span className="security-mark">256</span><div><strong>Encrypted by default</strong><p>TLS 1.2+ in transit and AES-256 encryption at rest.</p></div></article>
          <article><span className="security-mark">MFA</span><div><strong>Access controls</strong><p>MFA protects administrative accounts; transcript access requires SMS verification.</p></div></article>
          <article><span className="security-mark">AI</span><div><strong>No customer-data training</strong><p>Customer calls, audio, and transcripts are not used to train AI models.</p></div></article>
          <article><span className="security-mark">IR</span><div><strong>Formal response plan</strong><p>Defined incident roles, containment, evidence preservation, and agency notification.</p></div></article>
        </div>
        <div className="provider-rail">
          <p>SECURITY-REVIEWED SERVICE LAYERS</p>
          <div><span><b>BANDWIDTH</b><small>Voice communications</small></span><span><b>TWILIO</b><small>Telephony</small></span><span><b>EMT LIVE</b><small>Live interpretation</small></span></div>
          <small className="provider-note">Provider certifications apply to the named providers. EMT919 does not claim its own SOC 2 certification.</small>
        </div>
      </section>

      <section className="pricing section" id="service-options">
        <div>
          <p className="eyebrow dark"><span /> Agency service options</p>
          <h2>One system.<br />Your workflow.</h2>
          <p className="pricing-copy">Choose AI-first interpretation, EMT-managed live escalation, or routing to your existing interpreter provider. Commercial terms are provided in a written agency proposal.</p>
          <div className="buying-points">
            <span>✓ Agency-configured routing</span>
            <span>✓ Authorized-phone access</span>
            <span>✓ Onboarding and human support</span>
          </div>
        </div>
        <aside className="price-card service-option-card">
          <p>CONFIGURE THE SERVICE</p>
          <h3>Translation that fits the way your agency works.</h3>
          <hr />
          <ul>
            <li>AI-first interpretation</li>
            <li>AI + EMT Live Translation</li>
            <li>AI + your interpreter provider</li>
            <li>Optional Evidentiary Package</li>
          </ul>
          <a className="button" href="/pricing.html">Review service options</a>
        </aside>
      </section>

      <section className="evidentiary-promo section">
        <div>
          <p className="eyebrow"><span /> New department-wide add-on</p>
          <h2>Be ready when<br />the record is challenged.</h2>
          <p>The EMT919 Evidentiary Package adds enhanced record provenance, integrity controls, chain-of-custody documentation, legal holds, and discovery-ready exports.</p>
        </div>
        <div className="evidentiary-points">
          <span>01 <b>Record integrity</b></span><span>02 <b>Chain of custody</b></span>
          <span>03 <b>Evidence bundles</b></span><span>04 <b>Legal holds</b></span>
          <a className="button" href="/evidentiary-package.html">Explore the Evidentiary Package</a>
        </div>
      </section>

      <section className="trust section" id="trust">
        <div className="section-heading">
          <p className="eyebrow dark"><span /> Ready for procurement</p>
          <h2>Easy to evaluate.<br />Easy to buy.</h2>
          <p>Give your command staff, procurement team, and counsel the answers they need.</p>
        </div>
        <div className="trust-grid">
          {["Security", "Privacy", "Accessibility", "Support", "Cooperative purchasing", "Agency pricing"].map((item) => (
            <a key={item} href={`mailto:contact@emt919.com?subject=EMT919%20${encodeURIComponent(item)}`}>
              <span>{item}</span><b>↗</b>
            </a>
          ))}
        </div>
      </section>

      <section className="cta">
        <div className="signal signal-red" />
        <div className="signal signal-blue" />
        <p className="eyebrow"><span /> The first minute starts here</p>
        <h2>When seconds matter,<br />keep talking.</h2>
        <p>See how EMT919 fits your agency&apos;s calls, policies, and purchasing process.</p>
        <a className="button" href="mailto:contact@emt919.com?subject=Schedule%20an%20EMT919%20demo">Schedule a 15-minute briefing</a>
      </section>

      <footer>
        <div className="footer-brand">
          <div className="brand"><span className="brand-shield">919</span><span>EMT<span className="brand-accent">919</span></span></div>
          <p>Emergency MultiTranslator.<br />Built for the badge.</p>
        </div>
        <div>
          <strong>CONTACT</strong>
          <a href="mailto:contact@emt919.com">contact@emt919.com</a>
          <a href="tel:+1919">Call #919</a>
        </div>
        <div>
          <strong>RESOURCES</strong>
          <a href="#trust">Privacy</a>
          <a href="#trust">Security</a>
          <a href="#trust">Accessibility</a>
        </div>
        <p className="copyright">© 2026 EMT919. All rights reserved.</p>
      </footer>
    </main>
  );
}