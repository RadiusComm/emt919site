(() => {
  'use strict';
  document.querySelectorAll('[data-field-ticker]').forEach(section => {
    const viewport = section.querySelector('[data-ticker-viewport]');
    const runner = section.querySelector('[data-ticker-runner]');
    const group = section.querySelector('[data-ticker-group]');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const clone = group.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    clone.setAttribute('data-ticker-clone', '');
    runner.appendChild(clone);
    let frame = null, lastTime = null, userPaused = false, hovered = false, focused = false, pointerPaused = false;
    let position = viewport.scrollLeft;
    let inView = !('IntersectionObserver' in window);
    function step(time) {
      if (lastTime !== null) {
        const elapsed = Math.min(100, time - lastTime);
        const width = group.scrollWidth;
        position = width > 0 ? (position + elapsed * 0.033) % width : 0;
        viewport.scrollLeft = position;
      }
      lastTime = time;
      frame = window.requestAnimationFrame(step);
    }
    function refresh() {
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = null; lastTime = null; position = viewport.scrollLeft;
      section.dataset.reduced = String(motion.matches);
      viewport.setAttribute('aria-description', motion.matches ? 'Stationary text. Scroll horizontally or use arrow keys to read.' : userPaused ? 'Ticker paused. Press Space again to release the pause after focus leaves.' : 'Focus pauses scrolling. Space keeps it paused after focus leaves; press Space again to release. Arrow keys scroll the text.');
      const playing = !motion.matches && !userPaused && !hovered && !focused && !pointerPaused && inView && !document.hidden;
      section.dataset.motionState = motion.matches ? 'reduced' : playing ? 'playing' : 'paused';
      if (playing) frame = window.requestAnimationFrame(step);
    }
    section.addEventListener('pointerenter', e => {if(e.pointerType !== 'touch'){hovered = true; refresh();}});
    section.addEventListener('pointerleave', () => {hovered = false; refresh();});
    section.addEventListener('focusin', () => {focused = true; refresh();});
    section.addEventListener('focusout', e => {if(!section.contains(e.relatedTarget)){focused = false; refresh();}});
    viewport.addEventListener('pointerdown', () => {pointerPaused = true; refresh();});
    viewport.addEventListener('pointerup', () => {pointerPaused = false; refresh();});
    viewport.addEventListener('pointercancel', () => {pointerPaused = false; refresh();});
    viewport.addEventListener('keydown', e => {
      if (e.key === ' ' || e.key === 'Spacebar') {e.preventDefault(); userPaused = !userPaused; refresh(); return;}
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
      e.preventDefault(); refresh();
      const max = motion.matches ? Math.max(0, group.scrollWidth - viewport.clientWidth) : group.scrollWidth;
      viewport.scrollLeft = e.key === 'Home' ? 0 : e.key === 'End' ? max : Math.max(0,Math.min(max,viewport.scrollLeft + (e.key === 'ArrowRight' ? 120 : -120)));
    });
    motion.addEventListener('change', () => {viewport.scrollLeft = 0; refresh();});
    document.addEventListener('visibilitychange', refresh);
    if ('IntersectionObserver' in window) new window.IntersectionObserver(entries => {inView = entries[0].isIntersecting; refresh();},{threshold:0.15}).observe(section);
    refresh();
  });
})();
