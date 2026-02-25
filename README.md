# KIRA Digital Pet (Web PWA)

A lightweight web-based desktop assistant pet designed for Android and desktop browsers.

## Features

- Animated eye expressions and blinking
- Mouse/touch tracking with idle drift
- Touch scrub "giggle" reaction
- Low battery visual state (when supported by browser)
- Optional mic-reactive eye movement
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

## Notes for Old Android Phones

- Keep screen on while using as a desk pet.
- First launch may ask microphone permission after tapping `Enable mic reaction`.
- Battery API support varies by browser; low-battery state may not appear on all devices.
