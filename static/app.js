const wallImage = document.getElementById('wall-image');
const viewport = document.getElementById('viewport');
const wallContainer = document.getElementById('wall-container');
const holdsLayer = document.getElementById('holds-layer');
const holdCount = document.getElementById('hold-count');
const selectedTypeLabel = document.getElementById('selected-type');
const saveState = document.getElementById('save-state');
const emptyState = document.getElementById('empty-state');

const typeLabels = {
  jug: 'Kancsó',
  crimp: 'Perem',
  sloper: 'Sloper',
  pinch: 'Zseb / Pinch'
};

let holds = [];
let selectedType = 'jug';
let nextId = 1;
let scale = 1;
let draggedMarker = null;
let dragMoved = false;

async function initialize() {
  setupTypePicker();
  setupMapInteraction();
  setupControls();
  await loadHolds();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
  initialize();
}

async function loadHolds() {
  try {
    const response = await fetch('/api/holds');
    const data = await readJson(response);
    holds = data.holds || [];
    nextId = findNextId();
    renderHolds();
    setSaveState('Betöltve', false);
  } catch (error) {
    setSaveState(error.message, true);
    console.error('Hold inventory load failed:', error);
  }
}

function setupTypePicker() {
  document.querySelectorAll('.type-button').forEach((button) => {
    button.addEventListener('click', () => selectType(button.dataset.type));
  });

  document.addEventListener('keydown', (event) => {
    if (event.target.matches('input, textarea, select')) return;
    const button = document.querySelector(`.type-button[data-key="${event.key}"]`);
    if (button) selectType(button.dataset.type);
  });
}

function selectType(type) {
  selectedType = type;
  document.querySelectorAll('.type-button').forEach((button) => {
    button.classList.toggle('active', button.dataset.type === type);
  });
  selectedTypeLabel.textContent = typeLabels[type];
}

function setupMapInteraction() {
  holdsLayer.addEventListener('pointerdown', (event) => {
    const target = event.target instanceof Element ? event.target.closest('.hold-marker') : null;
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    draggedMarker = {
      target,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY
    };
    dragMoved = false;
    target.setPointerCapture?.(event.pointerId);
  });

  holdsLayer.addEventListener('pointermove', (event) => {
    if (!draggedMarker || draggedMarker.pointerId !== event.pointerId) return;
    const distance = Math.hypot(
      event.clientX - draggedMarker.startX,
      event.clientY - draggedMarker.startY
    );
    if (distance < 3) return;
    dragMoved = true;
    const position = getImagePosition(event);
    if (!position) return;
    const target = draggedMarker.target;
    const hold = holds.find((item) => item.id === target.dataset.id);
    if (hold) {
      hold.x = position.x;
      hold.y = position.y;
    }
    renderHolds();
    setSaveState('Módosítva', false);
  });

  holdsLayer.addEventListener('pointerup', (event) => {
    if (!draggedMarker || draggedMarker.pointerId !== event.pointerId) return;
    const target = draggedMarker.target;
    target.releasePointerCapture?.(event.pointerId);
    if (!dragMoved) removeMarker(target);
    draggedMarker = null;
  });

  holdsLayer.addEventListener('pointercancel', () => {
    draggedMarker = null;
  });

  holdsLayer.addEventListener('click', (event) => {
    if (dragMoved) {
      dragMoved = false;
      return;
    }
    const target = event.target instanceof Element ? event.target.closest('.hold-marker') : null;
    if (target) event.stopPropagation();
  });

  viewport.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest('.hold-marker') || event.target.closest('.zoom-controls')) return;
    const rect = wallImage.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    if (x < 0 || x > 100 || y < 0 || y > 100) return;

    holds.push({
      id: `hold-${nextId++}`,
      x: round(x),
      y: round(y),
      type: selectedType
    });
    renderHolds();
    setSaveState('Módosítva', false);
  });
}

function setupControls() {
  document.getElementById('save-btn').addEventListener('click', saveHolds);
  document.getElementById('clear-btn').addEventListener('click', async () => {
    if (!holds.length || confirm('Biztosan törlöd az összes jelölést?')) {
      holds = [];
      nextId = 1;
      renderHolds();
      updateHoldCount();
      await saveHolds();
    }
  });
  document.getElementById('zoom-in').addEventListener('click', () => setScale(scale + 0.25));
  document.getElementById('zoom-out').addEventListener('click', () => setScale(scale - 0.25));
  document.getElementById('zoom-reset').addEventListener('click', () => setScale(1));
}

function removeMarker(target) {
  holds = holds.filter((hold) => hold.id !== target.dataset.id);
  renderHolds();
  setSaveState('Módosítva', false);
}

function getImagePosition(event) {
  const rect = wallImage.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;
  if (x < 0 || x > 100 || y < 0 || y > 100) return null;
  return { x: round(x), y: round(y) };
}

function renderHolds() {
  holdsLayer.replaceChildren();
  holds.forEach((hold) => {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', `hold-marker ${hold.type}`);
    group.dataset.id = hold.id;
    group.setAttribute('transform', `translate(${hold.x} ${hold.y})`);

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('r', '0.85');
    circle.setAttribute('class', 'hold-circle');
    group.appendChild(circle);

    const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    hitArea.setAttribute('r', '2.2');
    hitArea.setAttribute('class', 'hold-hit-area');
    group.appendChild(hitArea);

    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.textContent = hold.id.replace('hold-', '');
    label.setAttribute('class', 'hold-label');
    group.appendChild(label);
    holdsLayer.appendChild(group);
  });
  updateHoldCount();
  emptyState.hidden = holds.length > 0;
}

function updateHoldCount() {
  holdCount.textContent = String(holds.length);
}

async function saveHolds() {
  const button = document.getElementById('save-btn');
  button.disabled = true;
  setSaveState('Mentés...', false);
  try {
    const response = await fetch('/api/holds', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(holds)
    });
    const data = await readJson(response);
    holds = data.holds;
    setSaveState(`Mentve: ${data.total} fogás`, false);
  } catch (error) {
    setSaveState(error.message, true);
    console.error('Hold inventory save failed:', error);
  } finally {
    button.disabled = false;
  }
}

function setScale(value) {
  scale = Math.min(Math.max(value, 0.75), 3);
  wallContainer.style.transform = `scale(${scale})`;
  document.getElementById('zoom-reset').textContent = `${Math.round(scale * 100)}%`;
}

function findNextId() {
  return holds.reduce((highest, hold) => {
    const number = Number(hold.id.replace('hold-', ''));
    return Number.isFinite(number) ? Math.max(highest, number + 1) : highest;
  }, 1);
}

function round(value) {
  return Math.round(value * 10) / 10;
}

function setSaveState(message, isError) {
  saveState.textContent = message;
  saveState.classList.toggle('error', isError);
}

async function readJson(response) {
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`A szerver hibás választ küldött (${response.status}).`);
  }
  if (!response.ok) {
    throw new Error(data.detail || `Szerverhiba (${response.status}).`);
  }
  return data;
}
