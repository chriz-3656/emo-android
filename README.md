# Emo Andro

Emo Andro is a lightweight web desktop pet built as a PWA for Android phones and desktop browsers.  
It renders expressive robot-style eyes, reacts to touch/audio, and runs fullscreen as a digital companion.

## Highlights

- 16+ animated eye emotion states inspired by your sprite reference
- Wake-word voice commands (`emo` / `andro`) with offline command packs
- Daily routine engine (morning greeting, hydration and focus-break reminders, bedtime mode)
- Memory + personality state persisted in `localStorage`
- Notification assistant with action buttons (`Sleep`, `Wake`, `Focus`, `Mute Mic`)
- Home-screen PWA shortcuts for quick actions
- Camera presence mode (motion wakes and engages pet)
- Ambient sound reactions + microphone glow mode
- Context modes (`Chill`, `Focus`, `Night`) that tune movement/blink/expression behavior
- Touch scrub-to-giggle mini interaction + feed/care points system
- 20-minute inactivity sleep mode with touch-to-wake
- Event-based reactions (time, battery, weather when geolocation permission is granted)
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
- `styles.css` - Eye styles, emotion variants, controls, dashboard panel
- `app.js` - Assistant engine (state, routines, voice/camera, command packs, notifications)
- `manifest.webmanifest` - PWA install config (fullscreen, rotation, icons)
- `sw.js` - Cache lifecycle, fetch strategy, notification action routing
- `icons/icon-192.svg` - PWA icon
- `icons/icon-512.svg` - PWA icon
- `README.md` - Project documentation

## Built-in Commands

Voice/typed commands supported by offline rule pack:

- `sleep`
- `wake`
- `battery`
- `open notes`
- `focus mode`
- `chill mode`
- `night mode`
- `mute mic`
- `unmute mic`
- `camera on`
- `camera off`
- `feed`
- `status`

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

- Voice commands require browser speech-recognition support.
- Wake-word flow: say wake word first (`emo` or `andro`), then command.
- Mic mode is permission-gated and starts only after user tap.
- Camera presence mode is fully local and motion-based.
- Battery status is browser-dependent and may not be available on all Android builds.
- Fullscreen button auto-hides in installed standalone/fullscreen display mode.
- First touch after sleep wakes the pet and does not trigger scrub-giggle instantly.

## Customization Quick Guide

- Change eye size and spacing: `styles.css` `.eye` and `.eyes`
- Tune mode behavior profiles: `app.js` `modeProfiles`
- Tune sleep timeout: `app.js` `INACTIVITY_MS`
- Tune command rules: `app.js` `commandPacks`
- Tune routine schedule: `app.js` `runRoutineEngine()`
- Tune ambient sound reactions: `app.js` `ambientEmotions`
- Add new emotion: create CSS class + include class in `emotionClasses` in `app.js`
