const wsUrlInput = document.getElementById("wsUrl");
const petIdInput = document.getElementById("petId");
const tokenInput = document.getElementById("token");
const connState = document.getElementById("connState");
const stateOutput = document.getElementById("stateOutput");
const connectBtn = document.getElementById("connectBtn");
const disconnectBtn = document.getElementById("disconnectBtn");
const requestStateBtn = document.getElementById("requestStateBtn");

let socket = null;

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
