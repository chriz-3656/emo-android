const eyes = document.getElementById("eyes");
const micButton = document.getElementById("micButton");
const fullscreenButton = document.getElementById("fullscreenButton");
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
let activeEmotion = "emotion-neutral";
let isLowBattery = false;
let isSleeping = false;
let inactivityTimer;
const INACTIVITY_MS = 20 * 60 * 1000;

function renderState() {
  eyes.classList.remove(...emotionClasses, "lowBattery");
  eyes.classList.add(activeEmotion);
  if (isLowBattery) {
    eyes.classList.add("lowBattery");
  }
}

function setEmotion(emotion) {
  activeEmotion = emotion;
  renderState();
}

function enterSleepMode() {
  if (isSleeping) {
    return;
  }
  isSleeping = true;
  setEmotion("emotion-sleepy");
  targetX = 0;
}

function wakeFromSleep() {
  if (!isSleeping) {
    return;
  }
  isSleeping = false;
  setEmotion("emotion-neutral");
}

function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(enterSleepMode, INACTIVITY_MS);
}

function registerActivity() {
  wakeFromSleep();
  resetInactivityTimer();
}

function blink() {
  eyes.classList.add("blink");
  setTimeout(() => {
    eyes.classList.remove("blink");
  }, 150);
}

renderState();

setInterval(() => {
  if (isSleeping) {
    return;
  }
  blink();
}, 3000 + Math.random() * 2000);

const expressions = [...emotionClasses];
setInterval(() => {
  if (isSleeping) {
    return;
  }
  const random = expressions[Math.floor(Math.random() * expressions.length)];
  setEmotion(random);
}, 12000);

let currentX = 0;
let targetX = 0;

function updatePosition() {
  currentX += (targetX - currentX) * 0.08;
  eyes.style.transform = `translateX(${currentX}px)`;
  requestAnimationFrame(updatePosition);
}
updatePosition();

function getMaxMoveX() {
  const maxMove = window.innerWidth / 2 - 150;
  return Math.max(80, maxMove);
}

function scheduleRandomMove() {
  if (isSleeping) {
    setTimeout(scheduleRandomMove, 3000);
    return;
  }
  const maxMove = getMaxMoveX();
  targetX = (Math.random() - 0.5) * maxMove * 2;
  const nextMoveMs = 2200 + Math.random() * 3800;
  setTimeout(scheduleRandomMove, nextMoveMs);
}
scheduleRandomMove();

let scrubCount = 0;
let scrubTimer;

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
      setEmotion("emotion-love");
      setTimeout(() => {
        eyes.classList.remove("giggle");
        setEmotion("emotion-neutral");
      }, 600);
    }
    scrubCount = 0;
  }, 200);
}, { passive: true });

document.addEventListener("touchstart", registerActivity, { passive: true });
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    registerActivity();
  }
});
resetInactivityTimer();

if (navigator.getBattery) {
  navigator.getBattery().then((battery) => {
    function updateBattery() {
      isLowBattery = battery.level < 0.2;
      renderState();
    }
    battery.addEventListener("levelchange", updateBattery);
    updateBattery();
  }).catch(() => {});
}

async function startMicReactiveMode() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const mic = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    mic.connect(analyser);
    analyser.fftSize = 128;

    const data = new Uint8Array(analyser.frequencyBinCount);

    function animate() {
      analyser.getByteFrequencyData(data);
      const volume = data.reduce((a, b) => a + b, 0) / data.length;

      document.querySelectorAll(".eye").forEach((eye) => {
        eye.style.setProperty("--voice-glow", `${60 + volume / 2}px`);
      });

      requestAnimationFrame(animate);
    }

    animate();
    micButton.classList.add("hidden");
  } catch (error) {
    micButton.textContent = "Mic unavailable";
    setTimeout(() => {
      micButton.classList.add("hidden");
    }, 2000);
  }
}

if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
  micButton.addEventListener("click", startMicReactiveMode);
} else {
  micButton.classList.add("hidden");
}

async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    }
  } catch (error) {
    fullscreenButton.textContent = "Fullscreen unavailable";
    setTimeout(() => {
      fullscreenButton.textContent = "Fullscreen";
    }, 1500);
  }
}

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

if (document.fullscreenEnabled) {
  fullscreenButton.addEventListener("click", toggleFullscreen);
  updateFullscreenButtonVisibility();
  document.addEventListener("fullscreenchange", updateFullscreenButtonVisibility);
} else {
  fullscreenButton.classList.add("hidden");
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
