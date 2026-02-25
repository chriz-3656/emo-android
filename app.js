const eyes = document.getElementById("eyes");
const micButton = document.getElementById("micButton");
const fullscreenButton = document.getElementById("fullscreenButton");
const stateClasses = ["listening", "angry", "sleepy", "lowBattery", "happy", "wide"];

function setState(state) {
  eyes.classList.remove(...stateClasses);
  if (state) {
    eyes.classList.add(state);
  }
}

function blink() {
  eyes.classList.add("blink");
  setTimeout(() => {
    eyes.classList.remove("blink");
  }, 150);
}

setInterval(() => {
  blink();
}, 3000 + Math.random() * 2000);

const expressions = ["", "happy", "wide", "sleepy"];
setInterval(() => {
  const random = expressions[Math.floor(Math.random() * expressions.length)];
  setState(random);
}, 12000);

let currentX = 0;
let targetX = 0;

function updatePosition() {
  currentX += (targetX - currentX) * 0.08;
  eyes.style.transform = `translateX(${currentX}px)`;
  requestAnimationFrame(updatePosition);
}
updatePosition();

function updateTargetX(clientX) {
  const maxMove = window.innerWidth / 2 - 150;
  targetX = ((clientX / window.innerWidth) - 0.5) * maxMove * 2;
}

document.addEventListener("mousemove", (e) => {
  updateTargetX(e.clientX);
});

document.addEventListener("touchmove", (e) => {
  const touch = e.touches[0];
  if (touch) {
    updateTargetX(touch.clientX);
  }
}, { passive: true });

setInterval(() => {
  const maxMove = window.innerWidth / 2 - 150;
  targetX = (Math.random() - 0.5) * maxMove * 2;
}, 6000);

let scrubCount = 0;
let scrubTimer;

document.addEventListener("touchmove", () => {
  scrubCount += 1;
  clearTimeout(scrubTimer);

  scrubTimer = setTimeout(() => {
    if (scrubCount > 10) {
      eyes.classList.add("giggle");
      setState("happy");
      setTimeout(() => {
        eyes.classList.remove("giggle");
        setState("");
      }, 600);
    }
    scrubCount = 0;
  }, 200);
}, { passive: true });

if (navigator.getBattery) {
  navigator.getBattery().then((battery) => {
    function updateBattery() {
      if (battery.level < 0.2) {
        setState("lowBattery");
      }
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
        eye.style.height = `${140 + volume / 6}px`;
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
      fullscreenButton.textContent = "Exit fullscreen";
    } else {
      await document.exitFullscreen();
      fullscreenButton.textContent = "Fullscreen";
    }
  } catch (error) {
    fullscreenButton.textContent = "Fullscreen unavailable";
    setTimeout(() => {
      fullscreenButton.textContent = "Fullscreen";
    }, 1500);
  }
}

if (document.fullscreenEnabled) {
  fullscreenButton.addEventListener("click", toggleFullscreen);
  document.addEventListener("fullscreenchange", () => {
    fullscreenButton.textContent = document.fullscreenElement ? "Exit fullscreen" : "Fullscreen";
  });
} else {
  fullscreenButton.classList.add("hidden");
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
