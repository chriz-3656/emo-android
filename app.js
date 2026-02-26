const STORAGE_KEY = "emo-andro-state-v5";
const ACTION_KEY = "emo-andro-action-v1";
const INACTIVITY_SLEEP_MS = 20 * 60 * 1000;

const system = {
  mode: "ACTIVE",
  permissionsGranted: false,
  wakeLockActive: false
};

const brain = {
  emotion: "neutral",
  energy: 100,
  curiosity: 40,
  socialNeed: 50,
  speaking: false,
  listening: false,
  batteryLow: false,
  sleeping: false,
  lastInteraction: Date.now(),
  lastWakeTime: Date.now(),
  environment: {
    motionIntensity: 0,
    tiltX: 0,
    tiltY: 0,
    rotation: 0,
    loudness: 0,
    lightApprox: 0,
    loudSound: false,
    faceDetected: false,
    faceX: 0,
    networkOnline: navigator.onLine,
    batteryLevel: null
  }
};

const defaultState = {
  mode: "chill",
  notificationsEnabled: false,
  weatherEnabled: false,
  voiceEnabled: true,
  carePoints: 0,
  notes: [],
  memory: [],
  routine: {
    lastMorningDay: "",
    lastBedtimeDay: "",
    lastHydrationAt: 0,
    lastBreakAt: 0,
    lastWeatherAt: 0
  }
};

const modeProfiles = {
  chill: { moveMin: 14, moveMax: 42 },
  focus: { moveMin: 6, moveMax: 24 },
  night: { moveMin: 2, moveMax: 12 }
};

const emotionClassByBrain = {
  neutral: "emotion-neutral",
  sleepy: "emotion-sleepy",
  wide: "emotion-wide",
  dizzy: "emotion-dizzy-line",
  lowBattery: "emotion-lowBattery",
  listening: "emotion-listening",
  speaking: "emotion-speaking",
  alert: "emotion-side-eye",
  confused: "emotion-spiral",
  annoyed: "emotion-angry",
  curious: "emotion-wide",
  happy: "emotion-happy"
};

let appState = loadState();
let stateVersion = 0;

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
  stateVersion += 1;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...appState, _v: stateVersion }));
}

function stamp() {
  return new Date().toLocaleString();
}

function remember(text) {
  appState.memory.push(`${stamp()} - ${text}`);
  appState.memory = appState.memory.slice(-60);
  saveState();
}

function dispatchAction(action, payload = {}) {
  localStorage.setItem(ACTION_KEY, JSON.stringify({ id: Date.now(), action, payload }));
}

function runControlsPage() {
  const statusLine = document.getElementById("statusLine");
  const moodLine = document.getElementById("moodLine");
  const memoryLine = document.getElementById("memoryLine");
  const notesList = document.getElementById("notesList");
  const commandInput = document.getElementById("commandInput");
  const wakeButton = document.getElementById("wakeButton");
  const sleepButton = document.getElementById("sleepButton");
  const chillButton = document.getElementById("chillButton");
  const focusButton = document.getElementById("focusButton");
  const nightButton = document.getElementById("nightButton");
  const feedButton = document.getElementById("feedButton");
  const voiceButton = document.getElementById("voiceButton");
  const notifyButton = document.getElementById("notifyButton");
  const geoButton = document.getElementById("geoButton");
  const fullscreenButton = document.getElementById("fullscreenButton");
  const backButton = document.getElementById("backButton");
  const commandButton = document.getElementById("commandButton");

  function refresh() {
    appState = loadState();
    statusLine.textContent = `Mode: ${appState.mode} | Voice: ${appState.voiceEnabled ? "on" : "off"} | Net: ${navigator.onLine ? "online" : "offline"}`;
    moodLine.textContent = `Care: ${appState.carePoints} | Battery: ${brain.environment.batteryLevel == null ? "?" : `${Math.round(brain.environment.batteryLevel * 100)}%`}`;
    memoryLine.textContent = appState.memory.length ? appState.memory[appState.memory.length - 1] : "No memory.";
    notesList.innerHTML = "";
    appState.notes.slice(-6).forEach((note) => {
      const li = document.createElement("li");
      li.textContent = note;
      notesList.appendChild(li);
    });
    voiceButton.textContent = `Voice: ${appState.voiceEnabled ? "On" : "Off"}`;
    notifyButton.textContent = appState.notificationsEnabled ? "Notify: On" : "Enable Notify";
    geoButton.textContent = appState.weatherEnabled ? "Weather: On" : "Enable Weather";
  }

  wakeButton.addEventListener("click", () => dispatchAction("wake"));
  sleepButton.addEventListener("click", () => dispatchAction("sleep"));
  chillButton.addEventListener("click", () => dispatchAction("mode", { mode: "chill" }));
  focusButton.addEventListener("click", () => dispatchAction("mode", { mode: "focus" }));
  nightButton.addEventListener("click", () => dispatchAction("mode", { mode: "night" }));
  feedButton.addEventListener("click", () => dispatchAction("feed"));
  voiceButton.addEventListener("click", () => {
    appState = loadState();
    appState.voiceEnabled = !appState.voiceEnabled;
    remember(`Voice ${appState.voiceEnabled ? "enabled" : "disabled"} from controls.`);
    saveState();
    dispatchAction("voice-toggle", { enabled: appState.voiceEnabled });
    refresh();
  });
  notifyButton.addEventListener("click", async () => {
    if (!("Notification" in window)) {
      statusLine.textContent = "Notifications unsupported.";
      return;
    }
    const permission = await Notification.requestPermission();
    appState = loadState();
    appState.notificationsEnabled = permission === "granted";
    saveState();
    refresh();
  });
  geoButton.addEventListener("click", () => {
    if (!navigator.geolocation) {
      statusLine.textContent = "Geolocation unsupported.";
      return;
    }
    navigator.geolocation.getCurrentPosition(() => {
      appState = loadState();
      appState.weatherEnabled = true;
      saveState();
      refresh();
    }, () => {
      statusLine.textContent = "Weather permission denied.";
    }, { timeout: 6000 });
  });
  fullscreenButton.addEventListener("click", async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen().catch(() => {
        statusLine.textContent = "Fullscreen unavailable.";
      });
    }
  });
  backButton.addEventListener("click", () => { window.location.href = "./"; });
  commandButton.addEventListener("click", () => {
    const text = commandInput.value.trim();
    if (!text) {
      return;
    }
    dispatchAction("command", { text });
    commandInput.value = "";
  });
  commandInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }
    const text = commandInput.value.trim();
    if (!text) {
      return;
    }
    dispatchAction("command", { text });
    commandInput.value = "";
  });
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
      refresh();
    }
  });
  refresh();
}

function runEyePage() {
  const eyes = document.getElementById("eyes");
  const sleepContainer = document.getElementById("sleepContainer");
  const navControlsButton = document.getElementById("navControlsButton");
  if (!eyes || !sleepContainer || !navControlsButton) {
    return;
  }

  const allEmotionClasses = Object.values(emotionClassByBrain);

  let wakeLock = null;
  let sensorInitialized = false;
  let currentX = 0;
  let targetX = 0;
  let currentSkew = 0;
  let blinkActive = false;
  let nextBlinkAt = Date.now() + getBlinkDelay("neutral");
  let wakeDoubleBlinkCount = 0;
  let nextLookAt = Date.now() + randomInRange(8000, 15000);
  let nextZAt = Date.now() + 1500;
  let navHideTimer = null;
  let decisionLoop = null;
  let scanSequence = null;
  let cameraStream = null;
  let cameraVideo = null;
  let cameraCanvas = null;
  let cameraCtx = null;
  let audioStream = null;
  let audioContext = null;
  let analyser = null;
  let voiceRecognition = null;
  let voiceActive = false;
  let voiceRestartTimer = null;
  let lastGravityVector = { x: 0, y: 0, z: 0 };

  const transient = {
    motionShockUntil: 0,
    alertUntil: 0,
    confusedUntil: 0,
    happyUntil: 0,
    annoyedUntil: 0,
    speakingUntil: 0,
    listeningUntil: 0,
    wakeGlowUntil: 0,
    stillStartAt: Date.now(),
    noisyScore: 0,
    silentScore: 0
  };

  function showNavButton() {
    navControlsButton.classList.remove("hidden");
    clearTimeout(navHideTimer);
    navHideTimer = setTimeout(() => {
      navControlsButton.classList.add("hidden");
    }, 3500);
  }

  function vibrate(pattern) {
    if ("vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  }

  function setSystemMode(next) {
    system.mode = next;
  }

  async function requestMotionPermission() {
    if (typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function") {
      const response = await DeviceMotionEvent.requestPermission().catch(() => "denied");
      return response === "granted";
    }
    return true;
  }

  async function requestOrientationPermission() {
    if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
      const response = await DeviceOrientationEvent.requestPermission().catch(() => "denied");
      return response === "granted";
    }
    return true;
  }

  async function startMicrophone() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return false;
    }
    if (audioStream) {
      return true;
    }
    try {
      audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(audioStream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      return true;
    } catch (_error) {
      return false;
    }
  }

  async function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return false;
    }
    if (cameraStream) {
      return true;
    }
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 160, height: 120 },
        audio: false
      });
      cameraVideo = document.createElement("video");
      cameraVideo.autoplay = true;
      cameraVideo.playsInline = true;
      cameraVideo.muted = true;
      cameraVideo.srcObject = cameraStream;
      cameraCanvas = document.createElement("canvas");
      cameraCanvas.width = 96;
      cameraCanvas.height = 72;
      cameraCtx = cameraCanvas.getContext("2d", { willReadFrequently: true });
      return true;
    } catch (_error) {
      return false;
    }
  }

  async function enableWakeLock() {
    if (!("wakeLock" in navigator)) {
      return false;
    }
    try {
      wakeLock = await navigator.wakeLock.request("screen");
      system.wakeLockActive = true;
      wakeLock.addEventListener("release", () => {
        system.wakeLockActive = false;
      });
      return true;
    } catch (_error) {
      system.wakeLockActive = false;
      return false;
    }
  }

  async function requestFullscreen() {
    if (document.fullscreenElement) {
      return true;
    }
    try {
      await document.documentElement.requestFullscreen();
      return true;
    } catch (_error) {
      return false;
    }
  }

  function setupMotionListener() {
    window.addEventListener("devicemotion", (event) => {
      const linear = event.acceleration;
      const gravity = event.accelerationIncludingGravity;
      if (!linear && !gravity) {
        return;
      }
      let intensity = 0;
      if (linear && linear.x != null) {
        intensity = Math.abs(linear.x || 0) + Math.abs(linear.y || 0) + Math.abs(linear.z || 0);
      } else {
        const gx = gravity?.x || 0;
        const gy = gravity?.y || 0;
        const gz = gravity?.z || 0;
        intensity = Math.abs(gx - lastGravityVector.x) + Math.abs(gy - lastGravityVector.y) + Math.abs(gz - lastGravityVector.z);
        lastGravityVector = { x: gx, y: gy, z: gz };
      }
      brain.environment.motionIntensity = intensity;
      if (intensity > 18) {
        transient.motionShockUntil = Date.now() + 2200;
        vibrate([100, 50, 100]);
        wake("motion shock");
      } else if (intensity >= 6 && intensity <= 14) {
        transient.alertUntil = Date.now() + 2000;
      }
      if (intensity < 1) {
        if (!transient.stillStartAt) {
          transient.stillStartAt = Date.now();
        }
      } else {
        transient.stillStartAt = Date.now();
      }
    });
  }

  function setupOrientationListener() {
    window.addEventListener("deviceorientation", (event) => {
      brain.environment.tiltX = event.beta || 0;
      brain.environment.tiltY = event.gamma || 0;
      brain.environment.rotation = event.alpha || 0;
      if (Math.abs(event.alpha || 0) > 280) {
        transient.confusedUntil = Date.now() + 1800;
      }
      if (!brain.sleeping && (event.beta || 0) > 30) {
        brain.curiosity = clamp(brain.curiosity + 0.8, 0, 100);
      }
    });
  }

  function setupVoiceRecognition() {
    const speechApi = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!speechApi) {
      return;
    }
    voiceRecognition = new speechApi();
    voiceRecognition.continuous = true;
    voiceRecognition.interimResults = false;
    voiceRecognition.lang = "en-US";
    voiceRecognition.onresult = (event) => {
      transient.listeningUntil = Date.now() + 1800;
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        if (!event.results[i].isFinal) {
          continue;
        }
        const text = event.results[i][0].transcript.toLowerCase().trim();
        handleCommand(text, "voice");
      }
    };
    voiceRecognition.onend = () => {
      voiceActive = false;
      if (appState.voiceEnabled && !document.hidden) {
        clearTimeout(voiceRestartTimer);
        voiceRestartTimer = setTimeout(startVoiceRecognition, 1500);
      }
    };
  }

  function startVoiceRecognition() {
    if (!voiceRecognition || voiceActive || !appState.voiceEnabled) {
      return;
    }
    try {
      voiceRecognition.start();
      voiceActive = true;
    } catch (_error) {}
  }

  function stopVoiceRecognition() {
    clearTimeout(voiceRestartTimer);
    if (voiceRecognition && voiceActive) {
      voiceRecognition.stop();
    }
    voiceActive = false;
  }

  async function initializeSystem() {
    if (system.permissionsGranted) {
      return;
    }
    const motionGranted = await requestMotionPermission();
    const orientationGranted = await requestOrientationPermission();
    await startMicrophone();
    await startCamera();
    await enableWakeLock();
    await requestFullscreen();
    if (motionGranted) {
      setupMotionListener();
    }
    if (orientationGranted) {
      setupOrientationListener();
    }
    setupVoiceRecognition();
    if (appState.voiceEnabled) {
      startVoiceRecognition();
    }
    system.permissionsGranted = true;
    remember("Hardware initialization complete.");
  }

  function handleCommand(text, source) {
    if (!text) {
      return;
    }
    remember(`Command (${source}): ${text}`);
    transient.speakingUntil = Date.now() + 1200;
    if (text.includes("hey emo") || text.includes("wake")) {
      wake("voice command");
      return;
    }
    if (text.includes("sleep")) {
      brain.sleeping = true;
      return;
    }
    if (text.includes("chill")) {
      appState.mode = "chill";
      saveState();
      return;
    }
    if (text.includes("focus")) {
      appState.mode = "focus";
      saveState();
      return;
    }
    if (text.includes("night")) {
      appState.mode = "night";
      brain.sleeping = true;
      saveState();
      return;
    }
    if (text.includes("feed")) {
      appState.carePoints += 1;
      brain.energy = clamp(brain.energy + 6, 0, 100);
      brain.socialNeed = clamp(brain.socialNeed - 12, 0, 100);
      saveState();
    }
  }

  function wake(reason) {
    const wasSleeping = brain.sleeping;
    brain.sleeping = false;
    brain.energy = clamp(brain.energy + 15, 0, 100);
    brain.curiosity = 20;
    brain.lastWakeTime = Date.now();
    brain.lastInteraction = Date.now();
    transient.motionShockUntil = 0;
    transient.wakeGlowUntil = Date.now() + 1800;
    wakeDoubleBlinkCount = 2;
    nextBlinkAt = Date.now() + 80;
    startWakeScan();
    if (wasSleeping) {
      vibrate([100, 50, 100]);
    }
    remember(`Wake: ${reason}`);
  }

  function startWakeScan() {
    const start = currentX;
    const maxMove = getMaxMoveX();
    scanSequence = {
      startedAt: performance.now(),
      points: [
        { t: 0, x: start },
        { t: 800, x: -maxMove },
        { t: 1600, x: maxMove },
        { t: 2500, x: 0 }
      ]
    };
  }

  function getMaxMoveX() {
    const profile = modeProfiles[appState.mode] || modeProfiles.chill;
    const viewportBased = Math.floor(window.innerWidth * 0.05);
    return clamp(viewportBased, profile.moveMin, profile.moveMax);
  }

  function updateNeeds() {
    brain.energy = clamp(brain.energy - 0.3, 0, 100);
    const idleMs = Date.now() - brain.lastInteraction;
    if (idleMs > 30000) {
      brain.curiosity = clamp(brain.curiosity + 0.6, 0, 100);
    } else {
      brain.curiosity = clamp(brain.curiosity - 0.25, 0, 100);
    }
    if (idleMs > 45000) {
      brain.socialNeed = clamp(brain.socialNeed + 0.8, 0, 100);
    } else {
      brain.socialNeed = clamp(brain.socialNeed - 0.3, 0, 100);
    }
    if (brain.energy <= 25) {
      brain.sleeping = true;
    }
    if (idleMs > INACTIVITY_SLEEP_MS) {
      brain.sleeping = true;
    }
    if (brain.sleeping) {
      setSystemMode("SLEEP");
      return;
    }
    if (idleMs > 25000) {
      setSystemMode("IDLE");
    } else {
      setSystemMode("ACTIVE");
    }
  }

  function processSensors() {
    const now = Date.now();
    if (brain.environment.motionIntensity > 18) {
      transient.motionShockUntil = now + 1800;
    }
    if (brain.environment.motionIntensity >= 6 && brain.environment.motionIntensity <= 14) {
      transient.alertUntil = now + 1400;
    }
    if (transient.stillStartAt && now - transient.stillStartAt > INACTIVITY_SLEEP_MS) {
      brain.sleeping = true;
    }

    if (brain.environment.loudness > 72) {
      brain.environment.loudSound = true;
      transient.motionShockUntil = now + 1200;
      wake("loud sound");
    } else {
      brain.environment.loudSound = false;
    }

    if (brain.environment.loudness > 45) {
      transient.noisyScore = Math.min(100, transient.noisyScore + 4);
      transient.silentScore = Math.max(0, transient.silentScore - 3);
    } else if (brain.environment.loudness < 12) {
      transient.silentScore = Math.min(100, transient.silentScore + 3);
      transient.noisyScore = Math.max(0, transient.noisyScore - 2);
    } else {
      transient.noisyScore = Math.max(0, transient.noisyScore - 1);
      transient.silentScore = Math.max(0, transient.silentScore - 1);
    }

    if (transient.noisyScore > 55) {
      transient.annoyedUntil = now + 2200;
    }

    if (transient.silentScore > 50 && !brain.sleeping) {
      brain.energy = clamp(brain.energy - 0.5, 0, 100);
    }

    if (brain.environment.faceDetected) {
      brain.socialNeed = clamp(brain.socialNeed - 2.8, 0, 100);
      brain.lastInteraction = Date.now();
    } else {
      brain.curiosity = clamp(brain.curiosity + 0.2, 0, 100);
    }

    if (transient.confusedUntil > now) {
      brain.curiosity = clamp(brain.curiosity + 0.3, 0, 100);
    }
  }

  function decideBehavior() {
    const now = Date.now();
    brain.listening = now < transient.listeningUntil;
    brain.speaking = now < transient.speakingUntil;

    if (brain.batteryLow) {
      brain.emotion = "lowBattery";
      return;
    }
    if (brain.sleeping) {
      brain.emotion = "sleepy";
      return;
    }
    if (transient.motionShockUntil > now) {
      brain.emotion = "dizzy";
      return;
    }
    if (brain.listening) {
      brain.emotion = "listening";
      return;
    }
    if (brain.speaking) {
      brain.emotion = "speaking";
      return;
    }
    if (brain.environment.faceDetected) {
      brain.emotion = "happy";
      return;
    }
    if (transient.annoyedUntil > now) {
      brain.emotion = "annoyed";
      return;
    }
    if (transient.confusedUntil > now || !brain.environment.networkOnline) {
      brain.emotion = "confused";
      return;
    }
    if (transient.alertUntil > now) {
      brain.emotion = "alert";
      return;
    }
    if (brain.curiosity > 70) {
      brain.emotion = "wide";
      brain.curiosity = 32;
      return;
    }
    if (transient.happyUntil > now) {
      brain.emotion = "happy";
      return;
    }
    brain.emotion = "neutral";
  }

  function renderState() {
    const mapped = emotionClassByBrain[brain.emotion] || "emotion-neutral";
    eyes.classList.remove(...allEmotionClasses, "blink", "glow-pulse", "shake");
    eyes.classList.add(mapped);
    if (blinkActive) {
      eyes.classList.add("blink");
    }
    if (transient.wakeGlowUntil > Date.now()) {
      eyes.classList.add("glow-pulse");
    }
    if (transient.motionShockUntil > Date.now()) {
      eyes.classList.add("shake");
    }
  }

  function getBlinkDelay(emotion) {
    if (emotion === "sleepy") {
      return randomInRange(5000, 7000);
    }
    if (emotion === "wide") {
      return randomInRange(2500, 3600);
    }
    if (emotion === "annoyed") {
      return randomInRange(7000, 9000);
    }
    if (emotion === "dizzy") {
      return randomInRange(1200, 2000);
    }
    return randomInRange(3000, 5000);
  }

  function maybeBlink(now) {
    if (now < nextBlinkAt) {
      return;
    }
    blinkActive = true;
    setTimeout(() => {
      blinkActive = false;
    }, 150);

    if (wakeDoubleBlinkCount > 0) {
      wakeDoubleBlinkCount -= 1;
      nextBlinkAt = now + 230;
      return;
    }

    nextBlinkAt = now + getBlinkDelay(brain.emotion);
  }

  function spawnZ(now) {
    if (!brain.sleeping || now < nextZAt) {
      return;
    }
    nextZAt = now + 1500;
    const z = document.createElement("span");
    z.className = "zzz";
    z.textContent = "Z";
    const edgeBand = Math.random() < 0.5
      ? 12 + Math.random() * 10
      : 78 + Math.random() * 10;
    z.style.left = `${edgeBand}%`;
    sleepContainer.appendChild(z);
    z.addEventListener("animationend", () => z.remove(), { once: true });
  }

  function maybeRandomLook(now) {
    if (brain.sleeping || brain.listening || brain.speaking) {
      targetX = 0;
      return;
    }
    if (scanSequence) {
      return;
    }
    if (brain.environment.faceDetected) {
      const maxMove = getMaxMoveX();
      targetX = (brain.environment.faceX - 0.5) * maxMove * 2;
      return;
    }
    if (now < nextLookAt) {
      return;
    }
    const maxMove = getMaxMoveX();
    targetX = (Math.random() - 0.5) * maxMove * 2;
    nextLookAt = now + randomInRange(3500, 8000);
  }

  function sampleScanX(nowPerf) {
    if (!scanSequence) {
      return null;
    }
    const elapsed = nowPerf - scanSequence.startedAt;
    const points = scanSequence.points;
    if (elapsed >= points[points.length - 1].t) {
      scanSequence = null;
      return 0;
    }
    for (let i = 0; i < points.length - 1; i += 1) {
      const from = points[i];
      const to = points[i + 1];
      if (elapsed >= from.t && elapsed <= to.t) {
        const t = (elapsed - from.t) / (to.t - from.t);
        const eased = easeInOutCubic(t);
        return from.x + (to.x - from.x) * eased;
      }
    }
    return null;
  }

  function updateAudioFrame() {
    if (!analyser) {
      return;
    }
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    const avg = data.reduce((sum, v) => sum + v, 0) / data.length;
    brain.environment.loudness = avg;
  }

  function updateCameraFrame() {
    if (!cameraCtx || !cameraVideo || cameraVideo.readyState < 2) {
      return;
    }
    cameraCtx.drawImage(cameraVideo, 0, 0, cameraCanvas.width, cameraCanvas.height);
    const pixels = cameraCtx.getImageData(0, 0, cameraCanvas.width, cameraCanvas.height).data;
    let brightSum = 0;
    let brightCount = 0;
    let weightedX = 0;
    for (let y = 0; y < cameraCanvas.height; y += 3) {
      for (let x = 0; x < cameraCanvas.width; x += 3) {
        const i = (y * cameraCanvas.width + x) * 4;
        const lum = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
        brightSum += lum;
        if (lum > 150) {
          brightCount += 1;
          weightedX += x;
        }
      }
    }
    const sampleCount = (cameraCanvas.width / 3) * (cameraCanvas.height / 3);
    brain.environment.lightApprox = brightSum / sampleCount;
    if (brightCount > 30) {
      brain.environment.faceDetected = true;
      brain.environment.faceX = weightedX / brightCount / cameraCanvas.width;
    } else {
      brain.environment.faceDetected = false;
      brain.environment.faceX = 0.5;
    }
  }

  function motionFrame(nowPerf) {
    const now = Date.now();
    updateAudioFrame();
    updateCameraFrame();
    maybeBlink(now);
    spawnZ(now);
    maybeRandomLook(now);

    const scanX = sampleScanX(nowPerf);
    if (scanX != null) {
      targetX = scanX;
    }

    const maxMove = getMaxMoveX();
    const tiltOffset = clamp((brain.environment.tiltY || 0) / 38, -1, 1) * (maxMove * 0.9);
    const targetWithTilt = targetX + tiltOffset;

    if (brain.sleeping) {
      targetX = 0;
      eyes.style.opacity = "0.88";
      eyes.style.setProperty("--voice-glow", "28px");
    } else {
      eyes.style.opacity = "1";
      eyes.style.setProperty("--voice-glow", brain.environment.loudSound ? "95px" : "60px");
    }

    currentX += (targetWithTilt - currentX) * 0.12;
    const tiltSkew = clamp((brain.environment.tiltY || 0) / 8, -9, 9);
    currentSkew += (tiltSkew - currentSkew) * 0.12;
    eyes.style.transform = `translateX(${currentX.toFixed(2)}px) skewX(${currentSkew.toFixed(2)}deg)`;
    requestAnimationFrame(motionFrame);
  }

  async function updateWeatherMood() {
    if (!appState.weatherEnabled || !navigator.onLine || !navigator.geolocation) {
      return;
    }
    const now = Date.now();
    if (now - appState.routine.lastWeatherAt < 2 * 60 * 60 * 1000) {
      return;
    }
    if (navigator.permissions?.query) {
      const permission = await navigator.permissions.query({ name: "geolocation" }).catch(() => null);
      if (permission && permission.state !== "granted") {
        return;
      }
    }
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 7000, maximumAge: 3600000 });
    }).catch(() => null);
    if (!pos) {
      return;
    }
    const { latitude, longitude } = pos.coords;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=weather_code`;
    const response = await fetch(url).catch(() => null);
    if (!response || !response.ok) {
      return;
    }
    const data = await response.json().catch(() => null);
    const code = data?.current?.weather_code;
    appState.routine.lastWeatherAt = now;
    if (code != null) {
      if (code >= 61) {
        brain.curiosity = clamp(brain.curiosity - 5, 0, 100);
      } else if (code <= 2) {
        brain.curiosity = clamp(brain.curiosity + 4, 0, 100);
      }
    }
    saveState();
  }

  async function routineTick() {
    const now = new Date();
    const nowMs = Date.now();
    const dayKey = now.toISOString().slice(0, 10);
    if (now.getHours() >= 6 && now.getHours() <= 10 && appState.routine.lastMorningDay !== dayKey) {
      appState.routine.lastMorningDay = dayKey;
      transient.happyUntil = Date.now() + 2600;
      await notify("Emo Andro", "Good morning.", "morning");
    }
    if (now.getHours() >= 22 && now.getMinutes() >= 30 && appState.routine.lastBedtimeDay !== dayKey) {
      appState.routine.lastBedtimeDay = dayKey;
      appState.mode = "night";
      brain.sleeping = true;
    }
    if (nowMs - appState.routine.lastHydrationAt > 2 * 60 * 60 * 1000) {
      appState.routine.lastHydrationAt = nowMs;
      await notify("Hydration", "Drink water.", "hydration");
    }
    if (appState.mode === "focus" && nowMs - appState.routine.lastBreakAt > 45 * 60 * 1000) {
      appState.routine.lastBreakAt = nowMs;
      await notify("Focus break", "Take a short break.", "focus-break");
    }
    await updateWeatherMood();
    saveState();
  }

  async function notify(title, body, tag) {
    if (!appState.notificationsEnabled || !("Notification" in window) || Notification.permission !== "granted") {
      return;
    }
    const reg = await navigator.serviceWorker.getRegistration();
    const options = {
      body,
      tag,
      renotify: true,
      actions: [
        { action: "sleep", title: "Sleep" },
        { action: "wake", title: "Wake" },
        { action: "focus", title: "Focus" },
        { action: "mute-mic", title: "Mute Mic" }
      ]
    };
    if (reg) {
      reg.showNotification(title, options);
      return;
    }
    new Notification(title, options);
  }

  function handleAction(action, payload) {
    if (action === "wake") {
      wake("controls");
      return;
    }
    if (action === "sleep") {
      brain.sleeping = true;
      return;
    }
    if (action === "mode") {
      const next = payload?.mode;
      if (next && modeProfiles[next]) {
        appState.mode = next;
        if (next === "night") {
          brain.sleeping = true;
        }
        saveState();
      }
      return;
    }
    if (action === "feed") {
      appState.carePoints += 1;
      brain.energy = clamp(brain.energy + 8, 0, 100);
      brain.socialNeed = clamp(brain.socialNeed - 15, 0, 100);
      saveState();
      return;
    }
    if (action === "voice-toggle") {
      appState.voiceEnabled = !!payload?.enabled;
      saveState();
      if (appState.voiceEnabled) {
        startVoiceRecognition();
      } else {
        stopVoiceRecognition();
      }
      return;
    }
    if (action === "command") {
      handleCommand(payload?.text?.toLowerCase() || "", "controls");
    }
    if (action === "mute") {
      appState.voiceEnabled = false;
      saveState();
      stopVoiceRecognition();
    }
  }

  function processUrlAction() {
    const action = new URLSearchParams(window.location.search).get("action");
    if (!action) {
      return;
    }
    if (action === "focus") {
      handleAction("mode", { mode: "focus" });
      return;
    }
    handleAction(action, {});
  }

  function masterLoop() {
    updateNeeds();
    processSensors();
    decideBehavior();
    renderState();
  }

  function handleFirstTouch() {
    brain.lastInteraction = Date.now();
    showNavButton();
    initializeSystem();
    wake("user tap");
  }

  navControlsButton.addEventListener("click", () => {
    window.location.href = "./controls.html";
  });
  navControlsButton.classList.add("hidden");

  document.addEventListener("touchstart", handleFirstTouch, { passive: true });
  document.addEventListener("touchmove", () => {
    brain.lastInteraction = Date.now();
    showNavButton();
    if (brain.sleeping) {
      wake("touch move");
    }
  }, { passive: true });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopVoiceRecognition();
      return;
    }
    if (system.permissionsGranted && !system.wakeLockActive) {
      enableWakeLock();
    }
    if (appState.voiceEnabled) {
      startVoiceRecognition();
    }
  });

  window.addEventListener("online", () => {
    brain.environment.networkOnline = true;
    transient.happyUntil = Date.now() + 2000;
  });
  window.addEventListener("offline", () => {
    brain.environment.networkOnline = false;
    transient.confusedUntil = Date.now() + 3500;
  });

  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
      appState = loadState();
      return;
    }
    if (event.key === ACTION_KEY && event.newValue) {
      const packet = JSON.parse(event.newValue);
      handleAction(packet.action, packet.payload);
    }
  });

  if (navigator.getBattery) {
    navigator.getBattery().then((battery) => {
      const updateBattery = () => {
        brain.environment.batteryLevel = battery.level;
        brain.batteryLow = battery.level < 0.2;
        appState.batteryLevel = battery.level;
        saveState();
      };
      battery.addEventListener("levelchange", updateBattery);
      updateBattery();
    }).catch(() => {});
  }

  processUrlAction();
  renderState();
  requestAnimationFrame(motionFrame);
  decisionLoop = setInterval(masterLoop, 2000);
  routineTick();
  setInterval(routineTick, 60 * 1000);
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

if (document.body.classList.contains("eye-page")) {
  runEyePage();
} else if (document.body.classList.contains("controls-page")) {
  runControlsPage();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomInRange(min, max) {
  return min + Math.random() * (max - min);
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
}
