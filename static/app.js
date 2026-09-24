// RouteSetter AI - Vision Frontend Application

let currentBoulder = null;
let currentFeedback = {
  result: null,
  difficulty: "just_right"
};

// Pan & Zoom state
let scale = 1;
let translateX = 0;
let translateY = 0;
let isPanning = false;
let startX = 0;
let startY = 0;
let initialDistance = 0;
let initialScale = 1;

let showLines = false;

// Elements
const wallContainer = document.getElementById('wall-container');
const viewport = document.getElementById('viewport');
const routeSvg = document.getElementById('route-svg');
const generateBtn = document.getElementById('generate-btn');
const gradeSelect = document.getElementById('grade-select');
const styleSelect = document.getElementById('style-select');
const statusOverlay = document.getElementById('status-overlay');
const statusText = document.getElementById('status-text');
const showLinesToggle = document.getElementById('show-lines-toggle');

// Boulder card elements
const boulderCard = document.getElementById('boulder-card');
const boulderName = document.getElementById('boulder-name');
const boulderGrade = document.getElementById('boulder-grade');
const boulderStyle = document.getElementById('boulder-style');
const boulderMode = document.getElementById('boulder-mode');
const boulderDesc = document.getElementById('boulder-desc');
const holdsList = document.getElementById('holds-list');

// Feedback elements
const feedbackButtons = document.querySelectorAll('.fb-btn');
const difficultyFeedback = document.getElementById('difficulty-feedback');
const diffButtons = document.querySelectorAll('.diff-btn');
const submitFeedbackBtn = document.getElementById('submit-feedback-btn');
const feedbackSuccessMsg = document.getElementById('feedback-success-msg');
const historyBadge = document.getElementById('history-count-badge');

// Modals
const settingsBtn = document.getElementById('settings-btn');
const historyBtn = document.getElementById('history-btn');
const settingsModal = document.getElementById('settings-modal');
const historyModal = document.getElementById('history-modal');
const apiKeyInput = document.getElementById('api-key-input');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const historySummary = document.getElementById('history-summary');
const historyList = document.getElementById('history-list');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupPanZoom();
  setupEventListeners();
  loadSettings();
  loadHistoryCount();
});

// Load settings from localStorage
function loadSettings() {
  const savedKey = localStorage.getItem('routesetter_gemini_key') || '';
  apiKeyInput.value = savedKey;
}

function saveSettings() {
  const key = apiKeyInput.value.trim();
  localStorage.setItem('routesetter_gemini_key', key);
  closeAllModals();
  alert('Beállítások elmentve!');
}

// Pan & Zoom Implementation (Mouse & Touch)
function setupPanZoom() {
  function updateTransform() {
    wallContainer.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
  }

  // Wheel zoom
  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    const newScale = Math.min(Math.max(scale * zoomFactor, 0.7), 4.5);
    
    // Zoom toward pointer
    const rect = viewport.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - rect.width / 2;
    const mouseY = e.clientY - rect.top - rect.height / 2;

    translateX -= (mouseX / scale) * (newScale - scale);
    translateY -= (mouseY / scale) * (newScale - scale);
    scale = newScale;
    updateTransform();
  }, { passive: false });

  // Mouse pan
  viewport.addEventListener('mousedown', (e) => {
    if (e.target.closest('.hold-ring')) return;
    isPanning = true;
    startX = e.clientX - translateX;
    startY = e.clientY - translateY;
  });

  window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    translateX = e.clientX - startX;
    translateY = e.clientY - startY;
    updateTransform();
  });

  window.addEventListener('mouseup', () => {
    isPanning = false;
  });

  // Touch Support (pan and pinch-to-zoom)
  viewport.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      isPanning = true;
      startX = e.touches[0].clientX - translateX;
      startY = e.touches[0].clientY - translateY;
    } else if (e.touches.length === 2) {
      isPanning = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      initialDistance = Math.hypot(dx, dy);
      initialScale = scale;
    }
  }, { passive: true });

  viewport.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && isPanning) {
      translateX = e.touches[0].clientX - startX;
      translateY = e.touches[0].clientY - startY;
      updateTransform();
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (initialDistance > 0) {
        scale = Math.min(Math.max(initialScale * (dist / initialDistance), 0.7), 4.5);
        updateTransform();
      }
    }
  }, { passive: true });

  viewport.addEventListener('touchend', () => {
    isPanning = false;
    initialDistance = 0;
  });

  // Zoom button controls
  document.getElementById('zoom-in').addEventListener('click', () => {
    scale = Math.min(scale * 1.25, 4.5);
    updateTransform();
  });

  document.getElementById('zoom-out').addEventListener('click', () => {
    scale = Math.max(scale / 1.25, 0.7);
    updateTransform();
  });

  document.getElementById('zoom-reset').addEventListener('click', () => {
    scale = 1;
    translateX = 0;
    translateY = 0;
    updateTransform();
  });
}

function setupEventListeners() {
  generateBtn.addEventListener('click', handleGenerateBoulder);

  if (showLinesToggle) {
    showLinesToggle.addEventListener('change', (e) => {
      showLines = e.target.checked;
      if (currentBoulder) {
        renderSvgHolds(currentBoulder.holds);
      }
    });
  }

  // Feedback buttons
  feedbackButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      feedbackButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFeedback.result = btn.dataset.result;
      difficultyFeedback.style.display = 'block';
      feedbackSuccessMsg.style.display = 'none';
    });
  });

  diffButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      diffButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFeedback.difficulty = btn.dataset.diff;
    });
  });

  submitFeedbackBtn.addEventListener('click', handleSubmitFeedback);

  // Modals
  settingsBtn.addEventListener('click', () => openModal(settingsModal));
  historyBtn.addEventListener('click', () => {
    loadHistoryData();
    openModal(historyModal);
  });

  document.querySelectorAll('.close-modal-btn').forEach(btn => {
    btn.addEventListener('click', closeAllModals);
  });

  saveSettingsBtn.addEventListener('click', saveSettings);

  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      closeAllModals();
    }
  });
}

function openModal(modal) {
  closeAllModals();
  modal.classList.add('active');
}

function closeAllModals() {
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
}

// Generate Boulder API Call
async function handleGenerateBoulder() {
  const targetGrade = gradeSelect.value;
  const targetStyle = styleSelect.value;
  const apiKey = localStorage.getItem('routesetter_gemini_key') || '';

  showLoading(apiKey ? "AI elemzi a képet és fogásokat keres..." : "Demó boulder betöltése...");

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_grade: targetGrade,
        target_style: targetStyle,
        api_key: apiKey || null
      })
    });

    const data = await res.json();
    hideLoading();

    if (!res.ok || !data.success) {
      alert(`Hiba: ${data.detail || data.error || 'Nem sikerült utat generálni.'}`);
      return;
    }

    currentBoulder = data.boulder;
    renderBoulder(data.boulder, data.mode);

  } catch (err) {
    hideLoading();
    alert(`Hálózati hiba: ${err.message}`);
  }
}

// Render Boulder on SVG and Card
function renderBoulder(boulder, mode) {
  // Update Card
  boulderName.textContent = boulder.name;
  boulderGrade.textContent = boulder.grade;
  boulderStyle.textContent = boulder.style;
  boulderDesc.textContent = boulder.description || "Nincs leírás.";
  boulderMode.textContent = mode === 'ai_live' ? '⚡ AI Live' : '💡 Demo Mód';
  boulderMode.style.background = mode === 'ai_live' ? 'rgba(0, 230, 118, 0.2)' : 'rgba(255, 171, 0, 0.2)';
  boulderMode.style.color = mode === 'ai_live' ? '#00e676' : '#ffab00';

  // Holds list
  holdsList.innerHTML = '';
  boulder.holds.forEach((hold, idx) => {
    const li = document.createElement('li');
    let label = '';
    if (hold.role === 'start') label = `🟢 Start: ${hold.note || (hold.hand ? hold.hand + ' kéz' : '')}`;
    else if (hold.role === 'top') label = `🔴 Top: ${hold.note || 'Kétkezes top'}`;
    else label = `🔵 #${hold.sequence || idx}: ${hold.note || 'Köztes fogás'}`;

    li.innerHTML = `<span class="hold-pill ${hold.role}"></span> <span>${label}</span>`;
    holdsList.appendChild(li);
  });

  // Reset feedback
  feedbackButtons.forEach(b => b.classList.remove('active'));
  difficultyFeedback.style.display = 'none';
  feedbackSuccessMsg.style.display = 'none';
  currentFeedback.result = null;

  boulderCard.style.display = 'block';

  // Render SVG Elements
  renderSvgHolds(boulder.holds);
}

function renderSvgHolds(holds) {
  routeSvg.innerHTML = '';

  // 1. Draw dashed connecting lines between sequence
  const sortedHolds = [...holds].sort((a, b) => {
    const roleOrder = { start: 1, intermediate: 2, top: 3 };
    if (roleOrder[a.role] !== roleOrder[b.role]) {
      return roleOrder[a.role] - roleOrder[b.role];
    }
    return (a.sequence || 0) - (b.sequence || 0);
  });

  if (sortedHolds.length > 1 && showLines) {
    let pathD = `M ${sortedHolds[0].x} ${sortedHolds[0].y}`;
    for (let i = 1; i < sortedHolds.length; i++) {
      pathD += ` L ${sortedHolds[i].x} ${sortedHolds[i].y}`;
    }
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathD);
    path.setAttribute('class', 'route-path-line');
    path.setAttribute('fill', 'none');
    routeSvg.appendChild(path);
  }

  // 2. Draw hold rings and labels
  holds.forEach((hold, idx) => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    const radius = hold.role === 'top' ? 3.6 : (hold.role === 'start' ? 3.2 : 2.7);

    // Circle ring
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', hold.x);
    circle.setAttribute('cy', hold.y);
    circle.setAttribute('r', radius);
    circle.setAttribute('class', `hold-ring ${hold.role}`);

    // If top, add outer double ring
    if (hold.role === 'top') {
      const outerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      outerCircle.setAttribute('cx', hold.x);
      outerCircle.setAttribute('cy', hold.y);
      outerCircle.setAttribute('r', radius + 1.2);
      outerCircle.setAttribute('class', 'hold-ring top');
      g.appendChild(outerCircle);
    }

    // Label tag
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', hold.x);
    text.setAttribute('y', hold.y);
    text.setAttribute('class', 'hold-label-text');
    
    let textContent = '';
    if (hold.role === 'start') textContent = 'S';
    else if (hold.role === 'top') textContent = 'TOP';
    else textContent = `${hold.sequence || idx}`;
    text.textContent = textContent;

    g.appendChild(circle);
    g.appendChild(text);

    // Hold click inspection
    g.addEventListener('click', (e) => {
      e.stopPropagation();
      alert(`Fogás: ${hold.role.toUpperCase()}\n${hold.note || ''}\nPozíció: X=${hold.x.toFixed(1)}%, Y=${hold.y.toFixed(1)}%`);
    });

    routeSvg.appendChild(g);
  });
}

// Feedback submission
async function handleSubmitFeedback() {
  if (!currentBoulder || !currentFeedback.result) return;

  try {
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        boulder_id: currentBoulder.id,
        name: currentBoulder.name,
        grade: currentBoulder.grade,
        result: currentFeedback.result,
        perceived_difficulty: currentFeedback.difficulty
      })
    });

    const data = await res.json();
    if (data.success) {
      difficultyFeedback.style.display = 'none';
      feedbackSuccessMsg.style.display = 'block';
      loadHistoryCount();
    }
  } catch (err) {
    alert(`Nem sikerült menteni a visszajelzést: ${err.message}`);
  }
}

// History loading
async function loadHistoryCount() {
  try {
    const res = await fetch('/api/history');
    const data = await res.json();
    historyBadge.textContent = data.total_climbs || 0;
  } catch (e) {
    console.warn("History load error:", e);
  }
}

async function loadHistoryData() {
  try {
    const res = await fetch('/api/history');
    const data = await res.json();
    historySummary.textContent = `Összesen ${data.total_climbs} mászás naplózva a falon.`;
    
    historyList.innerHTML = '';
    if (!data.history || data.history.length === 0) {
      historyList.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 20px;">Még nincs rögzített mászás.</div>';
      return;
    }

    data.history.forEach(item => {
      const div = document.createElement('div');
      div.className = `history-item ${item.result}`;
      div.innerHTML = `
        <div>
          <strong>${item.name}</strong> (${item.grade})
          <div style="font-size: 0.75rem; color: var(--text-muted);">
            Érzékelt: ${item.perceived_difficulty === 'too_easy' ? 'Túl könnyű' : item.perceived_difficulty === 'too_hard' ? 'Túl nehéz' : 'Pont jó'}
          </div>
        </div>
        <div>
          ${item.result === 'sent' ? '✅ Megmászva' : '❌ Nem sikerült'}
        </div>
      `;
      historyList.appendChild(div);
    });
  } catch (e) {
    historyList.innerHTML = `<div style="color: red;">Hiba az előzmények lekérésekor.</div>`;
  }
}

function showLoading(msg) {
  statusText.textContent = msg;
  statusOverlay.style.display = 'flex';
}

function hideLoading() {
  statusOverlay.style.display = 'none';
}
