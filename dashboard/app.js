const wsUrlInput = document.getElementById("wsUrl");
const petIdInput = document.getElementById("petId");
const tokenInput = document.getElementById("token");
const connState = document.getElementById("connState");
const stateOutput = document.getElementById("stateOutput");
const connectBtn = document.getElementById("connectBtn");
const disconnectBtn = document.getElementById("disconnectBtn");
const requestStateBtn = document.getElementById("requestStateBtn");

let socket = null;

// Eye drag controller variables
let isDragging = false;
let dragStartX = 0;
let currentEyeX = 0;
const maxEyeMove = 50;

function setState(text) {
  connState.textContent = text;
}

function normalizeWsBase(baseUrl) {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  if (!trimmed) {
    return "";
  }
  return /\/ws$/i.test(trimmed) ? trimmed : `${trimmed}/ws`;
}

function endpoint() {
  const base = normalizeWsBase(wsUrlInput.value);
  const petId = encodeURIComponent((petIdInput.value.trim() || "emo-01"));
  const token = encodeURIComponent(tokenInput.value.trim());
  if (!base || !token) {
    return null;
  }
  return `${base}/dashboard/${petId}?token=${token}`;
}

function send(message) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return;
  }
  socket.send(JSON.stringify(message));
}

function connect() {
  const url = endpoint();
  if (!url) {
    setState("Missing URL/token.");
    return;
  }
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }
  socket = new WebSocket(url);
  socket.onopen = () => setState("Connected");
  socket.onclose = () => setState("Disconnected");
  socket.onerror = () => setState("Connection error");
  socket.onmessage = (event) => {
    let message = null;
    try {
      message = JSON.parse(event.data);
    } catch (_error) {
      return;
    }
    stateOutput.textContent = JSON.stringify(message, null, 2);
  };
}

function disconnect() {
  if (!socket) {
    return;
  }
  socket.close();
  socket = null;
}

connectBtn.addEventListener("click", connect);
disconnectBtn.addEventListener("click", disconnect);
requestStateBtn.addEventListener("click", () => send({ type: "request_state" }));

document.querySelectorAll("button[data-action]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const action = btn.getAttribute("data-action");
    send({ type: "command", action });
  });
});

document.querySelectorAll("button[data-mode]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const mode = btn.getAttribute("data-mode");
    send({ type: "command", action: "mode", payload: { mode } });
  });
});

// Handle emotion buttons - all 22 emotions + auto emotion
document.querySelectorAll("button[data-emotion]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const emotion = btn.getAttribute("data-emotion");
    send({ type: "command", action: "emotion", payload: { emotion } });
  });
});

// Eye drag controller - create a slider control
function createEyeDragController() {
  const wrap = document.querySelector('.wrap');
  
  // Create drag control section
  const dragSection = document.createElement('div');
  dragSection.className = 'row';
  dragSection.innerHTML = `
    <strong>Eye Position Control</strong>
    <div class="eye-drag-container">
      <div class="eye-drag-track">
        <div class="eye-drag-thumb"></div>
      </div>
      <span class="eye-drag-label">← Left | Center | Right →</span>
      <button id="centerEyesBtn" type="button">Center</button>
    </div>
  `;
  
  // Insert after mode buttons
  const modeRow = wrap.querySelector('.row:nth-of-type(5)');
  if (modeRow) {
    modeRow.after(dragSection);
  }
  
  // Add event listeners for drag
  const thumb = dragSection.querySelector('.eye-drag-thumb');
  const track = dragSection.querySelector('.eye-drag-track');
  const centerBtn = dragSection.querySelector('#centerEyesBtn');
  
  // Mouse drag events
  thumb.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragStartX = e.clientX;
    e.preventDefault();
  });
  
  // Touch drag events
  thumb.addEventListener('touchstart', (e) => {
    isDragging = true;
    dragStartX = e.touches[0].clientX;
    e.preventDefault();
  });
  
  // Track click to move thumb
  track.addEventListener('click', (e) => {
    const rect = track.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    updateEyePosition(percent);
  });
  
  // Center button
  centerBtn.addEventListener('click', () => {
    updateEyePosition(0.5);
  });
  
  function updateEyePosition(percent) {
    // Convert 0-1 to -maxEyeMove to +maxEyeMove
    const eyeX = (percent - 0.5) * 2 * maxEyeMove;
    thumb.style.left = `${percent * 100}%`;
    send({ type: "command", action: "eyePosition", payload: { x: eyeX } });
  }
  
  // Global mouse/touch move and up
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const rect = track.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    updateEyePosition(percent);
  });
  
  document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const rect = track.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    updateEyePosition(percent);
  });
  
  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
  
  document.addEventListener('touchend', () => {
    isDragging = false;
  });
}

// Initialize drag controller when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createEyeDragController);
} else {
  createEyeDragController();
}
