const eyes = document.getElementById("eyes");
const micButton = document.getElementById("micButton");
const voiceButton = document.getElementById("voiceButton");
const cameraButton = document.getElementById("cameraButton");
const notifyButton = document.getElementById("notifyButton");
const modeButton = document.getElementById("modeButton");
const feedButton = document.getElementById("feedButton");
const notesButton = document.getElementById("notesButton");
const fullscreenButton = document.getElementById("fullscreenButton");
const statusLine = document.getElementById("statusLine");
const moodLine = document.getElementById("moodLine");
const memoryLine = document.getElementById("memoryLine");
const commandInput = document.getElementById("commandInput");
const commandButton = document.getElementById("commandButton");
const notesList = document.getElementById("notesList");
const cameraFeed = document.getElementById("cameraFeed");

const STORAGE_KEY = "emo-andro-state-v2";
const INACTIVITY_MS = 20 * 60 * 1000;

const emotionClasses = [
  "emotion-neutral",
  "emotion-sleepy",
  "emotion-happy",
  "emotion-dead",
  "emotion-angry",
  "emotion-yawn",
  "emotion-arc-up",
  "emotion-side-eye",
  "emotion-evil",
  "emotion-dizzy-line",
  "emotion-tilted",
  "emotion-closed-smile",
  "emotion-squeeze",
  "emotion-tiny",
  "emotion-spiral",
  "emotion-love",
  "emotion-wink",
  "emotion-wide"
];

const modeProfiles = {
  chill: { label: "Chill", moveMin: 14, moveMax: 32, moveDelayMin: 1200, moveDelayMax: 3200, blinkMin: 2900, blinkVar: 1900, expressionMs: 12000 },
  focus: { label: "Focus", moveMin: 8, moveMax: 20, moveDelayMin: 1800, moveDelayMax: 3600, blinkMin: 3500, blinkVar: 2200, expressionMs: 15000 },
  night: { label: "Night", moveMin: 4, moveMax: 12, moveDelayMin: 2400, moveDelayMax: 4200, blinkMin: 4800, blinkVar: 2600, expressionMs: 18000 }
};

const ambientEmotions = {
  quiet: ["emotion-sleepy", "emotion-closed-smile", "emotion-yawn"],
  noisy: ["emotion-wide", "emotion-angry", "emotion-side-eye"]
};

const defaultState = {
  mode: "chill",
  mood: "calm",
  carePoints: 0,
  notes: [],
  memory: [],
  conversation: [],
  lastCommand: "",
  notificationsEnabled: false,
  micMuted: false,
  routine: {
    lastMorningDay: "",
    lastBedtimeDay: "",
    lastHydrationAt: 0,
    lastBreakAt: 0,
    lastWeatherAt: 0
  }
};

let appState = loadState();
let activeEmotion = "emotion-neutral";
let isLowBattery = false;
let batteryLevel = null;
let isSleeping = false;
let inactivityTimer;
let currentX = 0;
let targetX = 0;
let blinkTimer;
let expressionTimer;
let moveTimer;
let ambientCooldownUntil = 0;
let micStream = null;
let micAnimationHandle = null;
let cameraStream = null;
let cameraTimer = null;
let cameraCanvas = null;
let cameraContext = null;
let previousFrame = null;
let recognition = null;
let voiceEnabled = false;

const speechApi = window.SpeechRecognition || window.webkitSpeechRecognition;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...defaultState };
    }
    const parsed = JSON.parse(raw);
    return {
      ...defaultState,
      ...parsed,
      routine: { ...defaultState.routine, ...(parsed.routine || {}) }
    };
  } catch (_error) {
    return { ...defaultState };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

function nowStamp() {
  return new Date().toLocaleString();
}

function remember(message) {
  const entry = `${nowStamp()} - ${message}`;
  appState.memory.push(entry);
  appState.memory = appState.memory.slice(-30);
  memoryLine.textContent = entry;
  saveState();
}

function addConversation(message) {
  appState.conversation.push(`${nowStamp()} - ${message}`);
  appState.conversation = appState.conversation.slice(-25);
  saveState();
}

function renderNotes() {
  notesList.innerHTML = "";
  const merged = [...appState.notes.slice(-4), ...appState.conversation.slice(-3)];
  merged.slice(-7).forEach((line) => {
    const li = document.createElement("li");
    li.textContent = line;
    notesList.appendChild(li);
  });
}

function updateDashboard(message) {
  if (message) {
    statusLine.textContent = message;
  }
  moodLine.textContent = `Mood: ${appState.mood} | Care: ${appState.carePoints} | Mode: ${modeProfiles[appState.mode].label}`;
  modeButton.textContent = `Mode: ${modeProfiles[appState.mode].label}`;
  renderNotes();
}

function getProfile() {
  const base = modeProfiles[appState.mode];
  if (!isLowBattery) {
    return base;
  }
  return {
    ...base,
    moveMin: Math.max(3, Math.floor(base.moveMin * 0.6)),
    moveMax: Math.max(8, Math.floor(base.moveMax * 0.6)),
    moveDelayMin: base.moveDelayMin + 700,
    moveDelayMax: base.moveDelayMax + 900,
    blinkMin: base.blinkMin + 1200,
    expressionMs: base.expressionMs + 5000
  };
}

function renderState() {
  eyes.classList.remove(...emotionClasses, "lowBattery");
  eyes.classList.add(activeEmotion);
  if (isLowBattery) {
    eyes.classList.add("lowBattery");
  }
}

function setEmotion(emotion) {
  if (isSleeping && emotion !== "emotion-sleepy") {
    return;
  }
  activeEmotion = emotion;
  renderState();
}

function setMood(newMood) {
  appState.mood = newMood;
  updateDashboard();
  saveState();
}

function blink() {
  eyes.classList.add("blink");
  setTimeout(() => {
    eyes.classList.remove("blink");
  }, 150);
}

function setMode(mode, reason) {
  if (!modeProfiles[mode]) {
    return;
  }
  appState.mode = mode;
  remember(`Mode switched to ${modeProfiles[mode].label}${reason ? ` (${reason})` : ""}`);
  saveState();
  scheduleLoops();
  updateDashboard();
}

function scheduleBlink() {
  clearTimeout(blinkTimer);
  if (isSleeping) {
    return;
  }
  const profile = getProfile();
  const delay = profile.blinkMin + Math.random() * profile.blinkVar;
  blinkTimer = setTimeout(() => {
    blink();
    scheduleBlink();
  }, delay);
}

function scheduleExpression() {
  clearTimeout(expressionTimer);
  if (isSleeping) {
    return;
  }
  const profile = getProfile();
  expressionTimer = setTimeout(() => {
    if (Date.now() > ambientCooldownUntil) {
      const random = emotionClasses[Math.floor(Math.random() * emotionClasses.length)];
      setEmotion(random);
    }
    scheduleExpression();
  }, profile.expressionMs);
}

function getMaxMoveX() {
  const profile = getProfile();
  const viewportBased = Math.floor(window.innerWidth * 0.04);
  const clamped = Math.max(profile.moveMin, Math.min(profile.moveMax, viewportBased));
  return clamped;
}

function scheduleRandomMove() {
  clearTimeout(moveTimer);
  if (isSleeping) {
    targetX = 0;
    moveTimer = setTimeout(scheduleRandomMove, 3000);
    return;
  }
  const profile = getProfile();
  const maxMove = getMaxMoveX();
  targetX = (Math.random() - 0.5) * maxMove * 2;
  const nextMoveMs = profile.moveDelayMin + Math.random() * (profile.moveDelayMax - profile.moveDelayMin);
  moveTimer = setTimeout(scheduleRandomMove, nextMoveMs);
}

function scheduleLoops() {
  scheduleBlink();
  scheduleExpression();
  scheduleRandomMove();
}

function updatePosition() {
  currentX += (targetX - currentX) * 0.08;
  eyes.style.transform = `translateX(${currentX}px)`;
  requestAnimationFrame(updatePosition);
}

function enterSleepMode(reason) {
  if (isSleeping) {
    return;
  }
  isSleeping = true;
  setMood("sleepy");
  setEmotion("emotion-sleepy");
  targetX = 0;
  remember(`Sleep mode entered${reason ? ` (${reason})` : ""}`);
  scheduleLoops();
}

function wakeFromSleep(reason) {
  if (!isSleeping) {
    return;
  }
  isSleeping = false;
  setMood("calm");
  setEmotion("emotion-neutral");
  remember(`Woke up${reason ? ` (${reason})` : ""}`);
  scheduleLoops();
}

function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => enterSleepMode("inactivity"), INACTIVITY_MS);
}

function registerActivity() {
  wakeFromSleep("touch activity");
  resetInactivityTimer();
}

function setAmbientEmotion(type) {
  if (isSleeping) {
    return;
  }
  const bucket = ambientEmotions[type];
  if (!bucket || bucket.length === 0) {
    return;
  }
  const random = bucket[Math.floor(Math.random() * bucket.length)];
  ambientCooldownUntil = Date.now() + 5000;
  setEmotion(random);
}

async function stopMicReactiveMode() {
  if (micAnimationHandle) {
    cancelAnimationFrame(micAnimationHandle);
    micAnimationHandle = null;
  }
  if (micStream) {
    micStream.getTracks().forEach((track) => track.stop());
    micStream = null;
  }
  document.querySelectorAll(".eye").forEach((eye) => {
    eye.style.setProperty("--voice-glow", "60px");
  });
  micButton.textContent = "Sound React";
}

async function startMicReactiveMode() {
  if (appState.micMuted || isLowBattery) {
    updateDashboard("Mic mode blocked (muted/low battery).");
    return;
  }
  if (micStream) {
    await stopMicReactiveMode();
    updateDashboard("Mic reactive mode disabled.");
    return;
  }
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const mic = audioContext.createMediaStreamSource(micStream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 128;
    mic.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    micButton.textContent = "Sound React On";
    updateDashboard("Mic reactive mode enabled.");

    const animate = () => {
      analyser.getByteFrequencyData(data);
      const volume = data.reduce((a, b) => a + b, 0) / data.length;
      document.querySelectorAll(".eye").forEach((eye) => {
        eye.style.setProperty("--voice-glow", `${60 + volume / 2}px`);
      });
      if (volume > 82 && Date.now() > ambientCooldownUntil) {
        setAmbientEmotion("noisy");
      } else if (volume < 18 && Date.now() > ambientCooldownUntil) {
        setAmbientEmotion("quiet");
      }
      micAnimationHandle = requestAnimationFrame(animate);
    };
    animate();
  } catch (_error) {
    updateDashboard("Mic unavailable.");
  }
}

function setupVoiceRecognition() {
  if (!speechApi) {
    voiceButton.classList.add("hidden");
    return;
  }
  recognition = new speechApi();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = "en-US";
  recognition.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      if (!event.results[i].isFinal) {
        continue;
      }
      const transcript = event.results[i][0].transcript.trim().toLowerCase();
      if (!transcript) {
        continue;
      }
      handleVoiceTranscript(transcript);
    }
  };
  recognition.onend = () => {
    if (voiceEnabled) {
      recognition.start();
    }
  };
}

function containsWakeWord(text) {
  return text.includes("emo") || text.includes("andro");
}

function handleVoiceTranscript(transcript) {
  addConversation(`voice: ${transcript}`);
  if (!containsWakeWord(transcript)) {
    return;
  }
  const cleaned = transcript
    .replace("emo andro", "")
    .replace("emo", "")
    .replace("andro", "")
    .trim();
  executeCommand(cleaned || "status", "voice");
}

function toggleVoiceCommands() {
  if (!recognition) {
    updateDashboard("Speech recognition is not supported.");
    return;
  }
  voiceEnabled = !voiceEnabled;
  if (voiceEnabled) {
    recognition.start();
    voiceButton.textContent = "Voice Cmd On";
    updateDashboard("Voice commands listening for wake word: emo/andro.");
  } else {
    recognition.stop();
    voiceButton.textContent = "Voice Cmd";
    updateDashboard("Voice commands off.");
  }
}

async function startCameraPresence() {
  if (cameraStream) {
    stopCameraPresence();
    updateDashboard("Camera presence disabled.");
    return;
  }
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: 160, height: 120 }
    });
    cameraFeed.srcObject = cameraStream;
    cameraCanvas = document.createElement("canvas");
    cameraCanvas.width = 64;
    cameraCanvas.height = 48;
    cameraContext = cameraCanvas.getContext("2d", { willReadFrequently: true });
    cameraButton.textContent = "Camera On";
    updateDashboard("Camera presence enabled.");
    monitorCameraPresence();
  } catch (_error) {
    updateDashboard("Camera unavailable.");
  }
}

function stopCameraPresence() {
  if (cameraTimer) {
    clearTimeout(cameraTimer);
    cameraTimer = null;
  }
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }
  previousFrame = null;
  cameraButton.textContent = "Camera Presence";
}

function monitorCameraPresence() {
  if (!cameraStream || !cameraContext) {
    return;
  }
  if (cameraFeed.readyState < 2) {
    cameraTimer = setTimeout(monitorCameraPresence, 1000);
    return;
  }
  cameraContext.drawImage(cameraFeed, 0, 0, cameraCanvas.width, cameraCanvas.height);
  const frame = cameraContext.getImageData(0, 0, cameraCanvas.width, cameraCanvas.height).data;
  if (previousFrame) {
    let diff = 0;
    for (let i = 0; i < frame.length; i += 16) {
      diff += Math.abs(frame[i] - previousFrame[i]);
    }
    const normalizedDiff = diff / (frame.length / 16);
    if (normalizedDiff > 12) {
      registerActivity();
      if (!isSleeping) {
        setEmotion("emotion-happy");
        setMood("engaged");
      }
    }
  }
  previousFrame = new Uint8ClampedArray(frame);
  cameraTimer = setTimeout(monitorCameraPresence, 1300);
}

function openNotesPrompt() {
  const note = window.prompt("Add a note/task for Emo Andro:");
  if (!note || !note.trim()) {
    return;
  }
  appState.notes.push(`${nowStamp()} - ${note.trim()}`);
  appState.notes = appState.notes.slice(-20);
  remember("Saved a new note.");
  saveState();
  renderNotes();
}

function feedPet() {
  appState.carePoints += 1;
  setMood("happy");
  setEmotion("emotion-love");
  remember("Fed pet (+1 care).");
  saveState();
  updateDashboard("Care increased.");
  setTimeout(() => {
    if (!isSleeping) {
      setEmotion("emotion-neutral");
    }
  }, 700);
}

async function ensureNotifications() {
  if (!("Notification" in window)) {
    updateDashboard("Notifications unsupported.");
    return false;
  }
  if (Notification.permission === "granted") {
    appState.notificationsEnabled = true;
    notifyButton.textContent = "Notify On";
    saveState();
    return true;
  }
  const permission = await Notification.requestPermission();
  appState.notificationsEnabled = permission === "granted";
  notifyButton.textContent = appState.notificationsEnabled ? "Notify On" : "Notify";
  saveState();
  updateDashboard(appState.notificationsEnabled ? "Notifications enabled." : "Notifications denied.");
  return appState.notificationsEnabled;
}

async function sendNotification(title, body, tag) {
  if (!appState.notificationsEnabled) {
    return;
  }
  const reg = await navigator.serviceWorker.getRegistration();
  const options = {
    body,
    tag,
    renotify: true,
    data: { timestamp: Date.now() },
    actions: [
      { action: "sleep", title: "Sleep" },
      { action: "wake", title: "Wake" },
      { action: "focus", title: "Focus" },
      { action: "mute-mic", title: "Mute Mic" }
    ]
  };
  if (reg) {
    reg.showNotification(title, options);
  } else {
    new Notification(title, options);
  }
}

function toggleMicMute(value) {
  appState.micMuted = value;
  if (value) {
    stopMicReactiveMode();
    remember("Mic muted.");
    updateDashboard("Mic muted.");
  } else {
    remember("Mic unmuted.");
    updateDashboard("Mic unmuted.");
  }
  saveState();
}

function showBatteryStatus() {
  if (batteryLevel == null) {
    updateDashboard("Battery info unavailable.");
    return;
  }
  const percent = Math.round(batteryLevel * 100);
  updateDashboard(`Battery: ${percent}%`);
  addConversation(`battery ${percent}%`);
}

function rotateMode() {
  const modes = Object.keys(modeProfiles);
  const currentIndex = modes.indexOf(appState.mode);
  const nextMode = modes[(currentIndex + 1) % modes.length];
  setMode(nextMode, "manual");
}

function speak(text) {
  if (!("speechSynthesis" in window)) {
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

async function fetchWeatherMood() {
  if (!navigator.onLine || !navigator.geolocation) {
    return;
  }
  if (navigator.permissions?.query) {
    const permission = await navigator.permissions.query({ name: "geolocation" }).catch(() => null);
    if (permission && permission.state !== "granted") {
      return;
    }
  }
  const now = Date.now();
  if (now - appState.routine.lastWeatherAt < 2 * 60 * 60 * 1000) {
    return;
  }
  const position = await new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, { maximumAge: 60 * 60 * 1000, timeout: 6000 });
  }).catch(() => null);
  if (!position) {
    return;
  }
  const { latitude, longitude } = position.coords;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=weather_code`;
  const response = await fetch(url).catch(() => null);
  if (!response || !response.ok) {
    return;
  }
  const payload = await response.json().catch(() => null);
  const weatherCode = payload?.current?.weather_code;
  appState.routine.lastWeatherAt = now;
  saveState();
  if (weatherCode == null || isSleeping) {
    return;
  }
  if (weatherCode >= 61) {
    setMood("cozy");
    setEmotion("emotion-sleepy");
  } else if (weatherCode <= 2) {
    setMood("bright");
    setEmotion("emotion-happy");
  } else {
    setMood("calm");
    setEmotion("emotion-neutral");
  }
}

const commandPacks = [
  { keywords: ["sleep"], run: () => enterSleepMode("command") },
  { keywords: ["wake"], run: () => wakeFromSleep("command") },
  { keywords: ["battery"], run: () => showBatteryStatus() },
  { keywords: ["open notes"], run: () => commandInput.focus() },
  { keywords: ["focus mode"], run: () => setMode("focus", "command") },
  { keywords: ["chill mode"], run: () => setMode("chill", "command") },
  { keywords: ["night mode"], run: () => setMode("night", "command") },
  { keywords: ["mute mic"], run: () => toggleMicMute(true) },
  { keywords: ["unmute mic"], run: () => toggleMicMute(false) },
  { keywords: ["camera on"], run: () => { if (!cameraStream) { startCameraPresence(); } } },
  { keywords: ["camera off"], run: () => { if (cameraStream) { stopCameraPresence(); } } },
  { keywords: ["feed"], run: () => feedPet() },
  { keywords: ["status"], run: () => updateDashboard("Status report ready.") }
];

function executeCommand(rawText, source) {
  const text = (rawText || "").trim().toLowerCase();
  if (!text) {
    return;
  }
  appState.lastCommand = text;
  saveState();
  addConversation(`${source}: ${text}`);
  const match = commandPacks.find((pack) => pack.keywords.some((keyword) => text.includes(keyword)));
  if (match) {
    match.run();
    remember(`Command executed: "${text}"`);
    speak(`Running ${text}`);
    return;
  }
  remember(`No command rule matched: "${text}"`);
}

function runRoutineEngine() {
  const now = new Date();
  const dayKey = now.toISOString().slice(0, 10);
  const hour = now.getHours();
  const minute = now.getMinutes();
  const nowMs = Date.now();

  if (hour >= 6 && hour <= 10 && appState.routine.lastMorningDay !== dayKey) {
    appState.routine.lastMorningDay = dayKey;
    setMood("bright");
    setEmotion("emotion-happy");
    remember("Morning greeting.");
    sendNotification("Emo Andro", "Good morning. Ready to start your day?", "morning");
  }

  if (hour >= 22 && minute >= 30 && appState.routine.lastBedtimeDay !== dayKey) {
    appState.routine.lastBedtimeDay = dayKey;
    setMode("night", "routine");
    remember("Bedtime mode activated.");
    sendNotification("Emo Andro", "Night mode enabled. Time to wind down.", "bedtime");
  }

  if (nowMs - appState.routine.lastHydrationAt > 2 * 60 * 60 * 1000) {
    appState.routine.lastHydrationAt = nowMs;
    sendNotification("Hydration", "Time for water break.", "hydrate");
    remember("Hydration reminder.");
  }

  if (appState.mode === "focus" && nowMs - appState.routine.lastBreakAt > 45 * 60 * 1000) {
    appState.routine.lastBreakAt = nowMs;
    sendNotification("Focus break", "Stand up and stretch for 2 minutes.", "break");
    remember("Focus break reminder.");
  }

  fetchWeatherMood().catch(() => {});
  saveState();
  updateDashboard();
}

function applyNotificationActionFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const action = params.get("action");
  if (!action) {
    return;
  }
  if (action === "sleep") {
    executeCommand("sleep", "shortcut");
  } else if (action === "wake") {
    executeCommand("wake", "shortcut");
  } else if (action === "focus") {
    executeCommand("focus mode", "shortcut");
  } else if (action === "mute") {
    executeCommand("mute mic", "shortcut");
  }
}

function setupBatteryAwareness() {
  if (!navigator.getBattery) {
    return;
  }
  navigator.getBattery().then((battery) => {
    const updateBattery = () => {
      batteryLevel = battery.level;
      isLowBattery = battery.level < 0.2;
      if (battery.level < 0.12) {
        setMood("low-power");
        enterSleepMode("critical battery");
      }
      if (isLowBattery && micStream) {
        toggleMicMute(true);
      }
      renderState();
      scheduleLoops();
      updateDashboard();
    };
    battery.addEventListener("levelchange", updateBattery);
    updateBattery();
  }).catch(() => {});
}

function setupFullscreenButton() {
  function isStandaloneMode() {
    return window.matchMedia("(display-mode: standalone)").matches
      || window.matchMedia("(display-mode: fullscreen)").matches
      || window.navigator.standalone === true;
  }
  function updateFullscreenButtonVisibility() {
    if (isStandaloneMode() || document.fullscreenElement) {
      fullscreenButton.classList.add("hidden");
    } else {
      fullscreenButton.classList.remove("hidden");
    }
  }
  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (_error) {
      updateDashboard("Fullscreen unavailable.");
    }
  }
  if (document.fullscreenEnabled) {
    fullscreenButton.addEventListener("click", toggleFullscreen);
    updateFullscreenButtonVisibility();
    document.addEventListener("fullscreenchange", updateFullscreenButtonVisibility);
  } else {
    fullscreenButton.classList.add("hidden");
  }
}

function setupEvents() {
  let scrubCount = 0;
  let scrubTimer;

  document.addEventListener("touchstart", registerActivity, { passive: true });
  document.addEventListener("touchmove", () => {
    const wasSleeping = isSleeping;
    registerActivity();
    if (wasSleeping) {
      return;
    }
    scrubCount += 1;
    clearTimeout(scrubTimer);
    scrubTimer = setTimeout(() => {
      if (scrubCount > 10) {
        eyes.classList.add("giggle");
        setMood("playful");
        setEmotion("emotion-love");
        setTimeout(() => {
          eyes.classList.remove("giggle");
          setEmotion("emotion-neutral");
        }, 600);
      }
      scrubCount = 0;
    }, 200);
  }, { passive: true });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      registerActivity();
    }
  });

  micButton.addEventListener("click", startMicReactiveMode);
  voiceButton.addEventListener("click", toggleVoiceCommands);
  cameraButton.addEventListener("click", startCameraPresence);
  notifyButton.addEventListener("click", ensureNotifications);
  modeButton.addEventListener("click", rotateMode);
  feedButton.addEventListener("click", feedPet);
  notesButton.addEventListener("click", openNotesPrompt);
  commandButton.addEventListener("click", () => {
    executeCommand(commandInput.value, "typed");
    commandInput.value = "";
  });
  commandInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      executeCommand(commandInput.value, "typed");
      commandInput.value = "";
    }
  });
}

function bootstrap() {
  if (appState.notificationsEnabled && Notification.permission !== "granted") {
    appState.notificationsEnabled = false;
  }
  notifyButton.textContent = appState.notificationsEnabled ? "Notify On" : "Notify";
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    micButton.classList.add("hidden");
    cameraButton.classList.add("hidden");
  }
  setupVoiceRecognition();
  setupBatteryAwareness();
  setupFullscreenButton();
  setupEvents();
  applyNotificationActionFromUrl();
  renderState();
  renderNotes();
  updateDashboard("Emo Andro ready.");
  updatePosition();
  scheduleLoops();
  resetInactivityTimer();
  runRoutineEngine();
  setInterval(runRoutineEngine, 60 * 1000);
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

bootstrap();
