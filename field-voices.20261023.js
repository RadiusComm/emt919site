(() => {
  'use strict';
  document.querySelectorAll('[data-field-voices]').forEach(section => {
    const track = section.querySelector('[data-voices-track]');
    const controls = section.querySelector('[data-voices-controls]');
    const toggle = section.querySelector('[data-voices-toggle]');
    const status = section.querySelector('[data-voices-status]');
    const cards = [...track.querySelectorAll('.voices-card')];
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timer = null;
    let userPaused = false;
    let hovered = false;
    let focused = false;
    let inView = !('IntersectionObserver' in window);
    const clear = () => { window.clearTimeout(timer); timer = null; };
    function refresh() {
      clear();
      section.dataset.reduced = String(motion.matches);
      const canScroll = track.scrollWidth > track.clientWidth + 3;
      controls.hidden = motion.matches || !canScroll;
      toggle.textContent = userPaused ? 'Play' : 'Pause';
      toggle.setAttribute('aria-label', userPaused ? 'Play automatic testimonial scrolling' : 'Pause automatic testimonial scrolling');
      toggle.setAttribute('aria-pressed', String(userPaused));
      const playing = canScroll && !motion.matches && !userPaused && !hovered && !focused && inView && !document.hidden;
      section.dataset.motionState = motion.matches ? 'reduced' : playing ? 'playing' : 'paused';
      if (playing) timer = window.setTimeout(() => { move(1, false); refresh(); }, 12000);
    }
    function move(direction, manual) {
      const max = Math.max(0, track.scrollWidth - track.clientWidth);
      const gap = cards[1] ? cards[1].offsetLeft - cards[0].offsetLeft : track.clientWidth;
      const current = track.scrollLeft;
      const target = direction === 'start' ? 0 : direction === 'end' ? max : direction > 0
        ? (current >= max - 3 ? 0 : Math.min(max, current + gap))
        : (current <= 3 ? max : Math.max(0, current - gap));
      track.scrollTo({left:target, behavior:motion.matches ? 'auto' : 'smooth'});
      if (manual) {
        userPaused = true;
        status.textContent = target <= 3 ? 'First testimonials shown.' : target >= max - 3 ? 'Last testimonials shown.' : 'Next testimonials shown.';
        refresh();
      }
    }
    toggle.addEventListener('click', () => { userPaused = !userPaused; refresh(); });
    section.querySelector('[data-voices-prev]').addEventListener('click', () => move(-1, true));
    section.querySelector('[data-voices-next]').addEventListener('click', () => move(1, true));
    section.addEventListener('pointerenter', e => { if(e.pointerType !== 'touch') { hovered = true; refresh(); } });
    section.addEventListener('pointerleave', () => { hovered = false; refresh(); });
    section.addEventListener('focusin', () => { focused = true; refresh(); });
    section.addEventListener('focusout', e => { if (!section.contains(e.relatedTarget)) { focused = false; refresh(); } });
    track.addEventListener('pointerdown', () => { userPaused = true; refresh(); });
    track.addEventListener('keydown', e => {
      const directions = {ArrowRight:1, ArrowLeft:-1, Home:'start', End:'end'};
      if (e.target === track && Object.hasOwn(directions, e.key)) { e.preventDefault(); move(directions[e.key], true); }
    });
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('resize', refresh);
    motion.addEventListener('change', () => { if (motion.matches) track.scrollTo({left:0,behavior:'auto'}); refresh(); });
    if ('IntersectionObserver' in window) new window.IntersectionObserver(entries => {
      inView = entries[0].isIntersecting; refresh();
    }, {threshold:0.15}).observe(section);
    refresh();
  });
})();
