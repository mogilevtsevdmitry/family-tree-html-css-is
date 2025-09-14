import { CARD_WITH, CARD_HEIGHT, CARD_SCALE } from "./card.js";

// canvas.js
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

function applyTransform() {
  els.viewport.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
}

function clampScale(s) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
}

function centerViewport() {
  // Учитываем масштабирование карточки из CSS
  const scaledCardWidth = CARD_WITH * CARD_SCALE;
  const scaledCardHeight = CARD_HEIGHT * CARD_SCALE;

  // Центрируем карточку относительно центра canvas
  // Отрицательные значения сдвигают viewport влево и вверх
  state.x = -scaledCardWidth / 2;
  state.y = -scaledCardHeight / 2;
  state.scale = 1;
  applyTransform();
  // Обновляем перекрестие после центрирования
  // drawCrosshair();
}

function setScale(newScale, pivotClientX = null, pivotClientY = null) {
  const prevScale = state.scale;
  const nextScale = clampScale(newScale);
  if (nextScale === prevScale) return;

  if (pivotClientX !== null && pivotClientY !== null) {
    const rect = els.canvas.getBoundingClientRect();
    const pivotX = pivotClientX - rect.left - rect.width / 2 - state.x;
    const pivotY = pivotClientY - rect.top - rect.height / 2 - state.y;
    state.x -= pivotX * (nextScale - prevScale);
    state.y -= pivotY * (nextScale - prevScale);
  }

  state.scale = nextScale;
  applyTransform();
}

function addToViewport(node, x = 0, y = 0) {
  node.style.left = `${x}px`;
  node.style.top = `${y}px`;
  els.viewport.appendChild(node);
}

function bindPanning() {
  els.canvas.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    if (e.target.closest(".person-card") || e.target.closest(".center-btn"))
      return;

    els.canvas.setPointerCapture(e.pointerId);
    state.isPanning = true;
    state.startX = e.clientX - state.x;
    state.startY = e.clientY - state.y;
  });

  els.canvas.addEventListener("pointermove", (e) => {
    if (!state.isPanning) return;
    state.x = e.clientX - state.startX;
    state.y = e.clientY - state.startY;
    applyTransform();
  });

  els.canvas.addEventListener("pointerup", (e) => {
    if (
      els.canvas.hasPointerCapture &&
      els.canvas.hasPointerCapture(e.pointerId)
    ) {
      els.canvas.releasePointerCapture(e.pointerId);
    }
    state.isPanning = false;
  });

  els.canvas.addEventListener("pointerleave", () => {
    state.isPanning = false;
  });
}

function bindWheelZoom() {
  els.canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const delta = Math.sign(e.deltaY);
      const next = state.scale * (1 - delta * SCALE_STEP);
      setScale(next, e.clientX, e.clientY);
    },
    { passive: false }
  );
}

function bindCenterButton() {
  els.centerBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
  els.centerBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    centerViewport();
  });
}

function drawCrosshair() {
  // Создаем элемент для перекрестия, если его еще нет
  let crosshair = document.getElementById("crosshair");
  if (!crosshair) {
    crosshair = document.createElement("div");
    crosshair.id = "crosshair";
    crosshair.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1;
    `;
    els.canvas.appendChild(crosshair);
  }

  // Получаем размеры canvas
  const rect = els.canvas.getBoundingClientRect();
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;

  // Создаем SVG для перекрестия
  const svg = `
    <svg width="100%" height="100%" style="position: absolute; top: 0; left: 0;">
      <!-- Вертикальная линия -->
      <line x1="${centerX}" y1="0" x2="${centerX}" y2="${rect.height}" 
            stroke="#ff6b6b" stroke-width="1" opacity="0.6"/>
      <!-- Горизонтальная линия -->
      <line x1="0" y1="${centerY}" x2="${rect.width}" y2="${centerY}" 
            stroke="#ff6b6b" stroke-width="1" opacity="0.6"/>
    </svg>
  `;

  crosshair.innerHTML = svg;
}

function initCanvas() {
  els.canvas = document.getElementById("canvas");
  els.viewport = document.getElementById("viewport");
  els.centerBtn = document.getElementById("centerBtn");
  if (!els.canvas || !els.viewport || !els.centerBtn) return;

  centerViewport();
  // drawCrosshair();
  bindPanning();
  bindWheelZoom();
  bindCenterButton();

  // Обновляем перекрестие при изменении размера окна
  // window.addEventListener("resize", drawCrosshair);
}

export default {
  initCanvas,
  centerViewport,
  setScale,
  addToViewport,
};
