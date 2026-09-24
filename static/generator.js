const layer = document.getElementById('generator-layer');
const viewport = document.getElementById('generator-viewport');
const wallImage = document.getElementById('generator-wall-image');
const status = document.getElementById('route-status');
const routeList = document.getElementById('route-list');
const inventoryStatus = document.getElementById('inventory-status');
let inventory = [];
let scale = 1;

initialize();

async function initialize() {
  setupZoom();
  try {
    const response = await fetch('/api/holds');
    const data = await readJson(response);
    inventory = data.holds || [];
    inventoryStatus.textContent = `${inventory.length} mentett fogás érhető el.`;
  } catch (error) {
    inventoryStatus.textContent = error.message;
  }
  document.getElementById('generate-btn').addEventListener('click', generate);
}

async function generate() {
  const button = document.getElementById('generate-btn');
  button.disabled = true;
  status.textContent = 'Útvonal összeállítása...';
  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_grade: document.getElementById('grade-select').value,
        target_style: document.getElementById('style-select').value
      })
    });
    const data = await readJson(response);
    renderRoute(data.boulder);
    status.textContent = `${data.boulder.holds.length} fogásos útvonal készült.`;
  } catch (error) {
    status.textContent = error.message;
  } finally {
    button.disabled = false;
  }
}

function renderRoute(route) {
  layer.replaceChildren();
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', route.holds.map((hold, index) => `${index ? 'L' : 'M'} ${hold.x} ${hold.y}`).join(' '));
  path.setAttribute('class', 'route-path');
  layer.appendChild(path);
  route.holds.forEach((hold) => {
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    marker.setAttribute('cx', hold.x);
    marker.setAttribute('cy', hold.y);
    marker.setAttribute('r', '1.8');
    marker.setAttribute('class', `route-marker route-circle ${hold.role}`);
    layer.appendChild(marker);
  });
  routeList.replaceChildren();
  route.holds.forEach((hold, index) => {
    const item = document.createElement('li');
    item.textContent = `${hold.role === 'start' ? 'Start' : hold.role === 'top' ? 'Top' : `#${index}`} · ${hold.id}`;
    routeList.appendChild(item);
  });
}

function setupZoom() {
  document.getElementById('generator-zoom-in').addEventListener('click', () => setScale(scale + .25));
  document.getElementById('generator-zoom-out').addEventListener('click', () => setScale(scale - .25));
  document.getElementById('generator-zoom-reset').addEventListener('click', () => setScale(1));
}

function setScale(value) {
  scale = Math.min(Math.max(value, .75), 3);
  viewport.querySelector('.wall-container').style.transform = `scale(${scale})`;
  document.getElementById('generator-zoom-reset').textContent = `${Math.round(scale * 100)}%`;
}

async function readJson(response) {
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(data.detail || `Szerverhiba (${response.status}).`);
  return data;
}
