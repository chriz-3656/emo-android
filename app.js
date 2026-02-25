const STORAGE_KEY = "emo-andro-state-v3";
const ACTION_KEY = "emo-andro-action-v1";
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
  chill: { moveMin: 14, moveMax: 32, moveDelayMin: 1200, moveDelayMax: 3200, blinkMin: 2800, blinkVar: 1800, expressionMs: 12000 },
  focus: { moveMin: 6, moveMax: 18, moveDelayMin: 2000, moveDelayMax: 3600, blinkMin: 3400, blinkVar: 2000, expressionMs: 15000 },
  night: { moveMin: 2, moveMax: 10, moveDelayMin: 2600, moveDelayMax: 4200, blinkMin: 4500, blinkVar: 2600, expressionMs: 18000 }
};

const defaultState = {
  mode: "chill",
  mood: "calm",
  carePoints: 0,
  sleeping: false,
  voiceEnabled: true,
  notificationsEnabled: false,
  weatherEnabled: false,
  batteryLevel: null,
  lastWeatherCode: null,
  memory: [],
  notes: [],
  routine: {
    lastMorningDay: "",
    lastBedtimeDay: "",
    lastHydrationAt: 0,
    lastBreakAt: 0,
    lastWeatherAt: 0
  }
};

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

let appState = loadState();

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

function stamp() {
  return new Date().toLocaleString();
}

function remember(message) {
  const entry = `${stamp()} - ${message}`;
  appState.memory.push(entry);
  appState.memory = appState.memory.slice(-40);
  saveState();
}

function dispatchAction(action, payload = {}) {
  localStorage.setItem(ACTION_KEY, JSON.stringify({
    id: Date.now(),
    action,
    payload
  }));
}

function supportsNotifications() {
  return "Notification" in window;
}

async function sendNotification(title, body, tag) {
  if (!appState.notificationsEnabled || !supportsNotifications() || Notification.permission !== "granted") {
    return;
  }
  const registration = await navigator.serviceWorker.getRegistration();
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
  if (registration) {
    registration.showNotification(title, options);
    return;
  }
  new Notification(title, options);
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
    statusLine.textContent = `Mode: ${appState.mode} | Sleep: ${appState.sleeping ? "yes" : "no"} | Voice: ${appState.voiceEnabled ? "on" : "off"}`;
    moodLine.textContent = `Mood: ${appState.mood} | Care: ${appState.carePoints} | Battery: ${appState.batteryLevel == null ? "?" : `${Math.round(appState.batteryLevel * 100)}%`}`;
    memoryLine.textContent = appState.memory.length ? appState.memory[appState.memory.length - 1] : "No memory yet.";
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
    if (!supportsNotifications()) {
      statusLine.textContent = "Notifications unsupported.";
      return;
    }
    const permission = await Notification.requestPermission();
    appState = loadState();
    appState.notificationsEnabled = permission === "granted";
    remember(appState.notificationsEnabled ? "Notifications enabled." : "Notifications denied.");
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
      remember("Weather-based mood enabled.");
      saveState();
      refresh();
    }, () => {
      statusLine.textContent = "Weather permission denied.";
    }, { timeout: 6000 });
  });

  fullscreenButton.addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (_error) {
      statusLine.textContent = "Fullscreen unavailable.";
    }
  });

  backButton.addEventListener("click", () => {
    window.location.href = "./";
  });

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
  const navControlsButton = document.getElementById("navControlsButton");
  if (!eyes || !navControlsButton) {
    return;
  }

  let currentX = 0;
  let targetX = 0;
  let inactivityTimer;
  let blinkTimer;
  let expressionTimer;
  let moveTimer;
  let isListeningVoice = false;
  let recognition = null;
  let voiceRestartTimer;
  let navHideTimer;
  let scrubCount = 0;
  let scrubTimer;
  const speechApi = window.SpeechRecognition || window.webkitSpeechRecognition;

  function profile() {
    const base = modeProfiles[appState.mode] || modeProfiles.chill;
    if (appState.batteryLevel != null && appState.batteryLevel < 0.2) {
      return {
        ...base,
        moveMin: Math.max(2, Math.floor(base.moveMin * 0.65)),
        moveMax: Math.max(8, Math.floor(base.moveMax * 0.7)),
        moveDelayMin: base.moveDelayMin + 800,
        moveDelayMax: base.moveDelayMax + 1200,
        blinkMin: base.blinkMin + 1000,
        expressionMs: base.expressionMs + 3500
      };
    }
    return base;
  }

  function applyVisualState() {
    const emotional = appState.mood;
    let emotion = "emotion-neutral";
    if (appState.sleeping) {
      emotion = "emotion-sleepy";
    } else if (emotional === "happy") {
      emotion = "emotion-happy";
    } else if (emotional === "engaged") {
      emotion = "emotion-wide";
    } else if (emotional === "cozy") {
      emotion = "emotion-closed-smile";
    } else if (emotional === "low-power") {
      emotion = "emotion-yawn";
    } else if (emotional === "focus") {
      emotion = "emotion-side-eye";
    } else if (emotional === "night") {
      emotion = "emotion-sleepy";
    }

    eyes.classList.remove(...emotionClasses, "lowBattery");
    eyes.classList.add(emotion);
    if (appState.batteryLevel != null && appState.batteryLevel < 0.2) {
      eyes.classList.add("lowBattery");
    }
  }

  function setMood(mood) {
    appState.mood = mood;
    saveState();
    applyVisualState();
  }

  function blink() {
    if (appState.sleeping) {
      return;
    }
    eyes.classList.add("blink");
    setTimeout(() => eyes.classList.remove("blink"), 150);
  }

  function scheduleBlink() {
    clearTimeout(blinkTimer);
    if (appState.sleeping) {
      return;
    }
    const p = profile();
    blinkTimer = setTimeout(() => {
      blink();
      scheduleBlink();
    }, p.blinkMin + Math.random() * p.blinkVar);
  }

  function scheduleExpression() {
    clearTimeout(expressionTimer);
    if (appState.sleeping) {
      return;
    }
    const p = profile();
    expressionTimer = setTimeout(() => {
      const options = emotionClasses.filter((name) => name !== "emotion-dead");
      const random = options[Math.floor(Math.random() * options.length)];
      eyes.classList.remove(...emotionClasses);
      eyes.classList.add(random);
      scheduleExpression();
    }, p.expressionMs);
  }

  function getMaxMoveX() {
    const p = profile();
    const viewport = Math.floor(window.innerWidth * 0.04);
    return Math.max(p.moveMin, Math.min(p.moveMax, viewport));
  }

  function scheduleMove() {
    clearTimeout(moveTimer);
    if (appState.sleeping || appState.mode !== "chill") {
      targetX = 0;
      moveTimer = setTimeout(scheduleMove, 2200);
      return;
    }
    const p = profile();
    const maxMove = getMaxMoveX();
    targetX = (Math.random() - 0.5) * maxMove * 2;
    moveTimer = setTimeout(scheduleMove, p.moveDelayMin + Math.random() * (p.moveDelayMax - p.moveDelayMin));
  }

  function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      appState.sleeping = true;
      setMood("night");
      remember("Sleep by inactivity.");
      saveState();
      applyVisualState();
      scheduleBlink();
      scheduleExpression();
      scheduleMove();
    }, INACTIVITY_MS);
  }

  function wake(reason) {
    if (appState.sleeping) {
      appState.sleeping = false;
      appState.mode = appState.mode || "chill";
      setMood("calm");
      remember(`Woke up (${reason}).`);
      saveState();
    }
    resetInactivityTimer();
    applyVisualState();
    scheduleBlink();
    scheduleExpression();
    scheduleMove();
  }

  function sleep(reason) {
    appState.sleeping = true;
    setMood("night");
    remember(`Sleep (${reason}).`);
    saveState();
    applyVisualState();
    scheduleBlink();
    scheduleExpression();
    scheduleMove();
  }

  function setMode(mode, reason) {
    if (!modeProfiles[mode]) {
      return;
    }
    appState.mode = mode;
    if (mode === "night") {
      appState.sleeping = true;
      setMood("night");
    } else if (!appState.sleeping) {
      setMood(mode === "focus" ? "focus" : "calm");
    }
    remember(`Mode -> ${mode} (${reason}).`);
    saveState();
    applyVisualState();
    scheduleBlink();
    scheduleExpression();
    scheduleMove();
  }

  function doGiggle() {
    if (appState.sleeping) {
      return;
    }
    eyes.classList.add("giggle");
    setMood("happy");
    setTimeout(() => {
      eyes.classList.remove("giggle");
      if (!appState.sleeping) {
        setMood(appState.mode === "focus" ? "focus" : "calm");
      }
    }, 650);
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
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 6500, maximumAge: 60 * 60 * 1000 });
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
    const code = payload?.current?.weather_code;
    if (code == null) {
      return;
    }
    appState.routine.lastWeatherAt = now;
    appState.lastWeatherCode = code;
    if (!appState.sleeping) {
      if (code <= 2) {
        setMood("happy");
      } else if (code >= 61) {
        setMood("cozy");
      } else if (appState.mode === "focus") {
        setMood("focus");
      } else {
        setMood("calm");
      }
    }
    saveState();
  }

  async function routineTick() {
    const now = new Date();
    const dayKey = now.toISOString().slice(0, 10);
    const hour = now.getHours();
    const minute = now.getMinutes();
    const nowMs = Date.now();

    if (hour >= 6 && hour <= 10 && appState.routine.lastMorningDay !== dayKey) {
      appState.routine.lastMorningDay = dayKey;
      if (!appState.sleeping) {
        setMood("happy");
      }
      sendNotification("Emo Andro", "Good morning.", "morning");
      remember("Morning routine.");
    }
    if (hour >= 22 && minute >= 30 && appState.routine.lastBedtimeDay !== dayKey) {
      appState.routine.lastBedtimeDay = dayKey;
      setMode("night", "routine");
      sendNotification("Emo Andro", "Bedtime mode activated.", "bedtime");
    }
    if (nowMs - appState.routine.lastHydrationAt > 2 * 60 * 60 * 1000) {
      appState.routine.lastHydrationAt = nowMs;
      sendNotification("Hydration", "Time to drink water.", "hydration");
    }
    if (appState.mode === "focus" && nowMs - appState.routine.lastBreakAt > 45 * 60 * 1000) {
      appState.routine.lastBreakAt = nowMs;
      sendNotification("Focus Break", "Take a short break.", "focus-break");
    }
    await updateWeatherMood();
    saveState();
  }

  function processCommand(text, source) {
    const cmd = (text || "").trim().toLowerCase();
    if (!cmd) {
      return;
    }
    remember(`Command (${source}): ${cmd}`);
    if (cmd.includes("hey emo") || cmd.includes("wake")) {
      wake("voice/command");
      return;
    }
    if (cmd.includes("sleep")) {
      sleep("voice/command");
      return;
    }
    if (cmd.includes("chill")) {
      appState.sleeping = false;
      setMode("chill", "voice/command");
      return;
    }
    if (cmd.includes("focus")) {
      appState.sleeping = false;
      setMode("focus", "voice/command");
      return;
    }
    if (cmd.includes("night")) {
      setMode("night", "voice/command");
      return;
    }
    if (cmd.includes("battery")) {
      remember(`Battery ${appState.batteryLevel == null ? "unknown" : `${Math.round(appState.batteryLevel * 100)}%`}`);
      return;
    }
    if (cmd.includes("feed")) {
      appState.carePoints += 1;
      setMood("happy");
      saveState();
      return;
    }
  }

  function maybeStartVoiceRecognition() {
    if (!appState.voiceEnabled || !speechApi || isListeningVoice) {
      return;
    }
    recognition = recognition || new speechApi();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        if (!event.results[i].isFinal) {
          continue;
        }
        const transcript = event.results[i][0].transcript.toLowerCase().trim();
        processCommand(transcript, "voice");
      }
    };
    recognition.onend = () => {
      isListeningVoice = false;
      clearTimeout(voiceRestartTimer);
      if (appState.voiceEnabled && !document.hidden) {
        voiceRestartTimer = setTimeout(maybeStartVoiceRecognition, 1800);
      }
    };
    recognition.onerror = () => {};
    try {
      recognition.start();
      isListeningVoice = true;
      remember("Voice listener active.");
    } catch (_error) {}
  }

  function stopVoiceRecognition() {
    clearTimeout(voiceRestartTimer);
    if (recognition && isListeningVoice) {
      recognition.stop();
    }
    isListeningVoice = false;
  }

  function showNavButton() {
    navControlsButton.classList.remove("hidden");
    clearTimeout(navHideTimer);
    navHideTimer = setTimeout(() => {
      navControlsButton.classList.add("hidden");
    }, 3500);
  }

  function handleAction(action, payload) {
    if (action === "wake") {
      wake("controls");
    } else if (action === "sleep") {
      sleep("controls");
    } else if (action === "mode") {
      setMode(payload?.mode || "chill", "controls");
    } else if (action === "feed") {
      appState.carePoints += 1;
      setMood("happy");
      saveState();
      doGiggle();
    } else if (action === "voice-toggle") {
      appState.voiceEnabled = !!payload?.enabled;
      saveState();
      if (appState.voiceEnabled) {
        maybeStartVoiceRecognition();
      } else {
        stopVoiceRecognition();
      }
    } else if (action === "mute") {
      appState.voiceEnabled = false;
      saveState();
      stopVoiceRecognition();
    } else if (action === "command") {
      processCommand(payload?.text || "", "controls");
    }
  }

  function updatePosition() {
    currentX += (targetX - currentX) * 0.08;
    eyes.style.transform = `translateX(${currentX}px)`;
    requestAnimationFrame(updatePosition);
  }

  navControlsButton.addEventListener("click", () => {
    window.location.href = "./controls.html";
  });
  navControlsButton.classList.add("hidden");

  document.addEventListener("touchstart", () => {
    showNavButton();
    wake("touch");
    maybeStartVoiceRecognition();
  }, { passive: true });

  document.addEventListener("touchmove", () => {
    showNavButton();
    if (appState.sleeping) {
      wake("touch");
      return;
    }
    scrubCount += 1;
    clearTimeout(scrubTimer);
    scrubTimer = setTimeout(() => {
      if (scrubCount > 10) {
        doGiggle();
      }
      scrubCount = 0;
    }, 200);
    resetInactivityTimer();
  }, { passive: true });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopVoiceRecognition();
      return;
    }
    appState = loadState();
    applyVisualState();
    maybeStartVoiceRecognition();
    resetInactivityTimer();
  });

  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
      appState = loadState();
      applyVisualState();
      scheduleMove();
      return;
    }
    if (event.key === ACTION_KEY && event.newValue) {
      const packet = JSON.parse(event.newValue);
      handleAction(packet.action, packet.payload);
    }
  });

  const urlAction = new URLSearchParams(window.location.search).get("action");
  if (urlAction) {
    handleAction(urlAction === "focus" ? "mode" : urlAction, urlAction === "focus" ? { mode: "focus" } : {});
  }

  if (navigator.getBattery) {
    navigator.getBattery().then((battery) => {
      const syncBattery = () => {
        appState.batteryLevel = battery.level;
        if (battery.level < 0.12) {
          appState.sleeping = true;
          setMood("low-power");
        }
        saveState();
        applyVisualState();
        scheduleMove();
      };
      battery.addEventListener("levelchange", syncBattery);
      syncBattery();
    }).catch(() => {});
  }

  updatePosition();
  applyVisualState();
  scheduleBlink();
  scheduleExpression();
  scheduleMove();
  resetInactivityTimer();
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
