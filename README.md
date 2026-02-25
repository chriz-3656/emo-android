# Emo Andro (Web PWA)

A lightweight web-based desktop assistant pet designed for Android and desktop browsers.

## Features

- Animated eye expressions and blinking
- 16 eye emotion presets based on your reference sprite sheet
- Mouse/touch tracking with idle drift
- Touch scrub "giggle" reaction
- Low battery visual state (when supported by browser)
- Optional mic-reactive eye movement
- Fullscreen mode support from manifest + in-app button
- Installable as a PWA with offline cache

## Project Structure

- `index.html` - App shell
- `styles.css` - Styling and animations
- `app.js` - Pet behavior logic + service worker registration
- `manifest.webmanifest` - PWA manifest
- `sw.js` - Offline caching service worker
- `icons/` - PWA icons

## Run Locally

Service workers require `http://localhost` or HTTPS.

```bash
cd /home/chriz3656/projects/desktopassi
python3 -m http.server 8080
```

Open:

`http://localhost:8080`

## Install on Android

1. Open the app URL in Chrome.
2. Tap browser menu.
3. Tap `Install app` or `Add to Home screen`.
4. Launch from home screen for standalone mode.
5. Tap `Fullscreen` button in app if browser UI is still visible.

## Updating After Changes

- Service worker cache version is bumped when core files change.
- If old assets still appear, close the app and reopen once, or uninstall/reinstall the PWA.

## Notes for Old Android Phones

- Keep screen on while using as a desk pet.
- First launch may ask microphone permission after tapping `Enable mic reaction`.
- Battery API support varies by browser; low-battery state may not appear on all devices.
