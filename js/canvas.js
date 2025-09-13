// canvas.js
(function () {
  const MIN_SCALE = 0.5;
  const MAX_SCALE = 2.5;
  const SCALE_STEP = 0.1;

  let state = {
    x: 0,
    y: 0,
    scale: 1,
    isPanning: false,
    startX: 0,
    startY: 0,
    pinchStartDist: 0,
    pinchStartScale: 1,
    pinchStartCenter: { x: 0, y: 0 },
  };

  let els = {
    canvas: null,
    viewport: null,
    centerBtn: null,
  };

  // === Utilities ===
  function applyTransform() {
    els.viewport.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
  }

  function clampScale(s) {
    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
  }

  // === Public API ===
  function centerViewport() {
    state.x = -120;
    state.y = -80;
    state.scale = 1;
    applyTransform();
  }

  function setScale(newScale, pivotClientX = null, pivotClientY = null) {
    const prevScale = state.scale;
    const nextScale = clampScale(newScale);
    if (nextScale === prevScale) return;

    if (pivotClientX !== null && pivotClientY !== null) {
      const rect = els.canvas.getBoundingClientRect();
      const pivotX = pivotClientX - rect.left - rect.width / 2 - state.x;
      const pivotY = pivotClientY - rect.top - rect.height / 2 - state.y;
      state.x -= (pivotX * (nextScale - prevScale));
      state.y -= (pivotY * (nextScale - prevScale));
    }

    state.scale = nextScale;
    applyTransform();
  }

  function addToViewport(node, x = 0, y = 0) {
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    els.viewport.appendChild(node);
  }

  // === Bindings ===
  function bindGestures() {
    const pointers = new Map();

    els.canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      if (e.target.closest('.person-card') || e.target.closest('.center-btn')) return;

      els.canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size === 1) {
        state.isPanning = true;
        state.startX = e.clientX - state.x;
        state.startY = e.clientY - state.y;
      } else if (pointers.size === 2) {
        state.isPanning = false;
        const [p1, p2] = Array.from(pointers.values());
        state.pinchStartDist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        state.pinchStartScale = state.scale;
        state.pinchStartCenter = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      }
    });

    els.canvas.addEventListener('pointermove', (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size === 1 && state.isPanning) {
        state.x = e.clientX - state.startX;
        state.y = e.clientY - state.startY;
        applyTransform();
      } else if (pointers.size === 2) {
        const [p1, p2] = Array.from(pointers.values());
        const newDist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        const newCenter = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        const newScale = state.pinchStartScale * (newDist / state.pinchStartDist);
        state.x += newCenter.x - state.pinchStartCenter.x;
        state.y += newCenter.y - state.pinchStartCenter.y;
        state.pinchStartCenter = newCenter;
        setScale(newScale, newCenter.x, newCenter.y);
      }
    });

    function endPointer(e) {
      pointers.delete(e.pointerId);
      if (pointers.size === 0) {
        state.isPanning = false;
      } else if (pointers.size === 1) {
        const remaining = Array.from(pointers.values())[0];
        state.isPanning = true;
        state.startX = remaining.x - state.x;
        state.startY = remaining.y - state.y;
      }
      if (els.canvas.hasPointerCapture && els.canvas.hasPointerCapture(e.pointerId)) {
        els.canvas.releasePointerCapture(e.pointerId);
      }
    }

    els.canvas.addEventListener('pointerup', endPointer);
    els.canvas.addEventListener('pointercancel', endPointer);
    els.canvas.addEventListener('pointerleave', endPointer);
  }

  function bindWheelZoom() {
    els.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = Math.sign(e.deltaY);
      const next = state.scale * (1 - delta * SCALE_STEP);
      setScale(next, e.clientX, e.clientY);
    }, { passive: false });
  }

  function bindCenterButton() {
    els.centerBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
    els.centerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      centerViewport();
    });
  }

  // === Init ===
  function initCanvas() {
    els.canvas = document.getElementById('canvas');
    els.viewport = document.getElementById('viewport');
    els.centerBtn = document.getElementById('centerBtn');
    if (!els.canvas || !els.viewport || !els.centerBtn) return;

    centerViewport();
    bindGestures();
    bindWheelZoom();
    bindCenterButton();
  }

  window.CanvasAPI = {
    initCanvas,
    centerViewport,
    setScale,
    addToViewport,
  };
})();