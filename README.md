# Emo Andro

Emo Andro is a local-first PWA digital pet for Android and desktop.
It now uses a two-page architecture:

- `index.html`: clean eye page (no control overlay)
- `controls.html`: control and assistant actions page

## What Changed

- Controls are separated from the eye screen to avoid overlaying visuals.
- Eye page stays focused on pet behavior only.
- Added a small semi-transparent `Controls` button on the eye page.
- `Controls` button auto-hides after no touch and reappears on touch.
- Removed unstable continuous mic-reactive open/close behavior.
- Kept sleep logic and scrub-giggle.

## Core Features

- 16+ eye emotions
- 20-minute inactivity sleep mode
- Touch wake from sleep
- Scrub gesture -> giggle reaction
- Voice commands:
  - `hey emo` or `wake` -> wake
  - `sleep` -> sleep
  - `chill` -> chill/random mode
  - `focus`, `night`, `battery`, `feed`
- Context modes: `chill`, `focus`, `night`
- Environment-based mood shifts from:
  - battery level
  - weather (when enabled + permission granted)
  - time/routine windows
- Local memory/personality state in `localStorage`
- PWA notifications with quick actions

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
- `styles.css` - Eye + controls-page styling
- `app.js` - Shared state + eye engine + controls actions + routines
- `manifest.webmanifest` - PWA install config (fullscreen, rotation, icons)
- `sw.js` - Cache lifecycle, fetch strategy, notification action routing
- `icons/icon-192.svg` - PWA icon
- `icons/icon-512.svg` - PWA icon
- `README.md` - Project documentation

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

- Voice recognition support varies by Android browser.
- On some browsers, voice listening starts after first touch interaction.
- Low battery automatically slows behavior and can force sleep on critical levels.
- First touch while sleeping wakes the pet immediately.
- Weather reactions need geolocation permission enabled from controls page.
- Fullscreen button is available on controls page for browser-tab usage.

## Customization Quick Guide

- Tune eye visuals: `styles.css` `.eye`, `.eyes`, `emotion-*`
- Tune nav button behavior: `styles.css` `.nav-controls` + `app.js` `showNavButton()`
- Tune sleep timeout: `app.js` `INACTIVITY_MS`
- Tune mode movement/blink: `app.js` `modeProfiles`
- Tune routines/reminders: `app.js` `routineTick()`
- Add commands: extend `processCommand()` in `app.js`
