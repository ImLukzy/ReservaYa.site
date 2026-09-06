// src/scripts/smooth-wheel.ts
// Desplazamiento suave y perceptible para la rueda, sin dependencias.
// Los paneles internos conservan su scroll nativo.

(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var LERP = 0.075;
  var target = window.scrollY;
  var current = target;
  var raf = 0;
  var lastWheel = 0;
  var isWheelScrolling = false;

  function maxScroll() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  function innerScrollable(el) {
    while (el && el !== document.body && el !== document.documentElement) {
      if (el instanceof HTMLElement) {
        var oy = getComputedStyle(el).overflowY;
        if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1) return true;
      }
      el = el.parentNode;
    }
    return false;
  }

  function frame() {
    if (performance.now() - lastWheel > 180 && !isWheelScrolling) {
      target = window.scrollY;
    }
    target = Math.max(0, Math.min(maxScroll(), target));
    current += (target - current) * LERP;
    if (Math.abs(target - current) < 0.5) {
      current = target;
      window.scrollTo(0, Math.round(current));
      raf = 0;
      isWheelScrolling = false;
      return;
    }
    window.scrollTo(0, current);
    raf = requestAnimationFrame(frame);
  }

  function kick() {
    if (!raf) {
      current = window.scrollY;
      raf = requestAnimationFrame(frame);
    }
  }

  window.addEventListener(
    'wheel',
    function (e) {
      if (e.ctrlKey || e.metaKey || e.shiftKey) return; // zoom / horizontal: nativo
      if (e.target instanceof Element && innerScrollable(e.target)) return; // paneles: nativo
      var dy = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY;
      if (!dy) return;
      e.preventDefault();
      target = Math.max(0, Math.min(maxScroll(), target + dy));
      lastWheel = performance.now();
      isWheelScrolling = true;
      kick();
    },
    { passive: false }
  );

  window.addEventListener('scroll', function () {
    if (!isWheelScrolling) {
      current = window.scrollY;
      target = current;
    }
  }, { passive: true });
})();
