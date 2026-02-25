# Emo Andro

Emo Andro is a lightweight web desktop pet built as a PWA for Android phones and desktop browsers.  
It renders expressive robot-style eyes, reacts to touch/audio, and runs fullscreen as a digital companion.

## Highlights

- 16+ animated eye emotion states inspired by your sprite reference
- Smooth idle behavior with random expression changes and blinking
- Centered random micro-movement (stays near screen center)
- Touch scrub-to-giggle interaction
- 20-minute inactivity sleep mode (`sleepy`) with touch-to-wake
- Microphone-reactive glow mode (tap to enable)
- Low-battery visual tint (when Battery API is available)
- Installable PWA with offline cache and update-safe service worker
- Portrait and landscape rotation enabled

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

- `index.html` - App entry point
- `styles.css` - Eye styles, emotion variants, controls, animations
- `app.js` - State engine, input handling, mic logic, fullscreen logic, SW registration
- `manifest.webmanifest` - PWA install config (fullscreen, rotation, icons)
- `sw.js` - Cache lifecycle and fetch strategy
- `icons/icon-192.svg` - PWA icon
- `icons/icon-512.svg` - PWA icon
- `README.md` - Project documentation

## Local Development

Service workers require `http://localhost` (or HTTPS), not `file://`.

```bash
cd /home/chriz3656/projects/desktopassi
python3 -m http.server 8080
```

Open: `http://localhost:8080`

## Android Install (PWA)

1. Open the deployed URL in Chrome.
2. Open browser menu.
3. Tap `Install app` or `Add to Home screen`.
4. Launch from the home screen icon.
5. If opened in a normal browser tab, use the `Fullscreen` button once.

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

- Mic mode is permission-gated and starts only after user tap.
- Battery status is browser-dependent and may not be available on all Android builds.
- Fullscreen button auto-hides in installed standalone/fullscreen display mode.
- First touch after sleep wakes the pet and does not trigger scrub-giggle instantly.

## Customization Quick Guide

- Change eye size and spacing: `styles.css` `.eye` and `.eyes`
- Tune centered movement range: `app.js` `getMaxMoveX()`
- Tune movement pacing: `app.js` `scheduleRandomMove()`
- Tune sleep timeout: `app.js` `INACTIVITY_MS`
- Tune random expression timing: `app.js` expression interval
- Tune blink timing: `app.js` blink interval
- Add new emotion: create CSS class + include class in `emotionClasses` in `app.js`
