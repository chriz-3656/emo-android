# Emo Andro

Emo Andro is a sensor-aware autonomous companion PWA.
This edition runs a centralized behavior brain and uses Android-accessible hardware to behave like an artificial organism.

## System Model

- Global system modes:
  - `ACTIVE`
  - `IDLE`
  - `SLEEP`
- Core authority object:
  - `brain` with internal needs + environmental sensor state
- Central behavior loop every 2 seconds:
  - `updateNeeds()`
  - `processSensors()`
  - `decideBehavior()`
  - `renderState()`

## Hardware Utilization

First user touch initializes hardware permissions and startup pipeline:

- DeviceMotion permission
- DeviceOrientation permission
- Microphone stream (analyser)
- Camera stream (face-presence approximation)
- Wake Lock request
- Fullscreen request
- Vibration support (capability-based)

## Brain and Environment

`brain.environment` tracks:

- motion intensity
- tilt X / tilt Y
- rotation
- loudness
- approximate light level
- face presence and horizontal face position
- online/offline state
- battery level

## Behavior Rules

- No random emotion timers.
- Emotion is derived by `decideBehavior()` and rendered only through `renderState()`.
- Priority order:
  1. battery low
  2. sleeping
  3. motion shock
  4. listening
  5. speaking
  6. face detected
  7. curiosity trigger
  8. neutral

## Sleep / Wake Behavior

- Sleep triggers:
  - low energy
  - lying still (flat motion profile) for prolonged duration
- Sleep state:
  - sleepy emotion
  - reduced motion
  - slow blink
  - floating `Z` animation above eyes
  - reduced glow/brightness
- Wake triggers:
  - touch
  - loud sound
  - motion shock
  - wake phrase
- Wake sequence:
  1. stop sleep posture
  2. double blink
  3. scan left/right/center with easing
  4. glow pulse
  5. energy boost

## Sensor Reactions

- Accelerometer:
  - high intensity -> dizzy + shake + vibration
  - medium intensity -> alert state
- Orientation:
  - eye skew based on tilt
  - rapid rotation can trigger confused response
- Audio:
  - loud spikes wake companion
  - persistent noise can raise annoyed tendency
  - sustained silence increases sleep tendency
- Camera:
  - tracks bright-face proxy center (`faceX`)
  - eyes can orient toward detected subject

## Network and Battery

- Offline event raises confused tendency.
- Online event raises happy tendency.
- Low battery elevates `batteryLow` priority behavior.

## Emotion Set

Current emotion classes:

- `emotion-neutral`
- `emotion-sleepy`
- `emotion-happy`
- `emotion-dead`
- `emotion-angry`
- `emotion-yawn`
- `emotion-arc-up`
- `emotion-side-eye`
- `emotion-evil`
- `emotion-dizzy-line`
- `emotion-tilted`
- `emotion-closed-smile`
- `emotion-squeeze`
- `emotion-tiny`
- `emotion-spiral`
- `emotion-love`
- `emotion-wink`
- `emotion-wide`

## Tech Stack

- HTML (`index.html`) for app shell
- CSS (`styles.css`) for visual system and emotion styles
- Vanilla JS (`app.js`) for interactions and runtime behavior
- Web App Manifest (`manifest.webmanifest`) for install metadata
- Service Worker (`sw.js`) for caching and offline support

## Project Structure

- `index.html` - Eye page
- `controls.html` - Controls/actions page
- `dashboard/` - Separate remote web dashboard app
- `cloudflare-worker/` - Serverless WebSocket relay (Worker + Durable Object)
- `styles.css` - Eye + controls-page styling
- `app.js` - Brain, sensor manager, behavior engine, controls actions
- `manifest.webmanifest` - PWA install config (fullscreen, rotation, icons)
- `sw.js` - Cache lifecycle, fetch strategy, notification action routing
- `icons/icon-192.svg` - PWA icon
- `icons/icon-512.svg` - PWA icon
- `README.md` - Project documentation

## Remote Control (Cloudflare Serverless)

This repo now supports a separate remote dashboard using Cloudflare Workers WebSocket relay.

- Pet app connects as role `pet`.
- Dashboard app connects as role `dashboard`.
- Worker routes commands from dashboard -> pet.
- Pet streams live state back to dashboard.

### Step-by-step setup

1. Install Wrangler:

```bash
npm install -g wrangler
```

2. Login:

```bash
wrangler login
```

3. Deploy worker from repo root:

```bash
cd cloudflare-worker
wrangler secret put REMOTE_TOKEN
wrangler deploy
```

4. Open controls page in pet app (`controls.html`) and set:
- Worker URL: `wss://<your-worker-domain>/ws`
- Pet ID: `emo-01` (or your own id)
- Token: same value used in `REMOTE_TOKEN`
- Tap `Save Remote`
- Tap `Remote: On`

5. Open remote dashboard:
- `dashboard/index.html` (host it with your static files)
- Fill same Worker URL, Pet ID, Token
- Tap `Connect`

### WebSocket endpoints

- Pet: `/ws/pet/:petId?token=...`
- Dashboard: `/ws/dashboard/:petId?token=...`

## Voice Commands

Built-in voice commands run locally through browser speech recognition:

- `hey emo` or `wake`
- `sleep`
- `chill`
- `focus`
- `night`
- `battery`
- `feed`

## Local Development

Service workers require `http://localhost` (or HTTPS), not `file://`.

```bash
cd /home/chriz3656/projects/desktopassi
python3 -m http.server 8080
```

Open: `http://localhost:8080`

## Usage Flow

1. Open app.
2. Stay on eye page (`index.html`) for pet display.
3. Touch screen to reveal `Controls` button.
4. Tap `Controls` to open `controls.html`.
5. Use actions/modes/settings, then return to eyes page.

## Android Install (PWA)

1. Open the deployed URL in Chrome.
2. Open browser menu.
3. Tap `Install app` or `Add to Home screen`.
4. Launch from the home screen icon.
5. Use controls page for settings/actions.
6. Use the new Mic/Cam toggles on the controls page to pause sensors when you need to save heat/battery.

## Update Flow (Important)

When you change app assets, bump the service-worker cache name in `sw.js`:

- Example: `emo-andro-v5` -> `emo-andro-v6`
- Commit and deploy
- Reopen app to activate new worker/cache

If old UI is still shown:

1. Close the PWA completely.
2. Reopen once or twice.
3. If still stale, uninstall/reinstall the PWA.

## Behavior Notes

- All emotion class changes are rendered only through `renderState()`.
- Sensor handlers write to `brain.environment` and do not directly switch UI classes.
- Blink timing changes by emotion profile (`neutral/sleepy/wide/annoyed/dizzy`).
- Voice recognition support varies by Android browser.
- On some browsers, voice listening starts after first touch interaction.
- First touch while sleeping wakes the companion immediately.
- Weather reactions need geolocation permission enabled from controls page.
- Fullscreen button is available on controls page for browser-tab usage.

## Customization Quick Guide

- Tune eye visuals: `styles.css` `.eye`, `.eyes`, `emotion-*`
- Tune nav button behavior: `styles.css` `.nav-controls` + `app.js` `showNavButton()`
- Tune needs decay and thresholds: `app.js` `updateNeeds()`
- Tune sensor effects: `app.js` `processSensors()`
- Tune behavior priority: `app.js` `decideBehavior()`
- Tune mode movement range: `app.js` `modeProfiles`
- Tune routines/reminders: `app.js` `routineTick()`
- Add commands: extend `handleCommand()` in `app.js`
