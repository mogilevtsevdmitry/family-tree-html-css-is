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
  function bindPanning() {
    els.canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      if (e.target.closest('.person-card') || e.target.closest('.center-btn')) return;

      els.canvas.setPointerCapture(e.pointerId);
      state.isPanning = true;
      state.startX = e.clientX - state.x;
      state.startY = e.clientY - state.y;
    });

    els.canvas.addEventListener('pointermove', (e) => {
      if (!state.isPanning) return;
      state.x = e.clientX - state.startX;
      state.y = e.clientY - state.startY;
      applyTransform();
    });

    els.canvas.addEventListener('pointerup', (e) => {
      if (els.canvas.hasPointerCapture && els.canvas.hasPointerCapture(e.pointerId)) {
        els.canvas.releasePointerCapture(e.pointerId);
      }
      state.isPanning = false;
    });

    els.canvas.addEventListener('pointerleave', () => {
      state.isPanning = false;
    });
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
    bindPanning();
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