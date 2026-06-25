# Mike Dash

Mike Dash is a Chrome Dino style side-scrolling jump game. The player controls the original calico cat character mee chan and avoids obstacles by jumping or sliding.

## Controls

- Space / Arrow Up: Jump
- Arrow Down: Duck or slide
- Tap the screen: Start, jump, or restart
- Mobile Duck / Jump buttons: Slide or jump

## Tech Stack

- HTML
- CSS
- JavaScript
- Canvas API
- Web App Manifest
- Service Worker
- localStorage for the high score

## PWA Support

Mike Dash includes `manifest.webmanifest`, `service-worker.js`, and PNG app icons. After it is served over HTTPS, users can install it from supported browsers.

GitHub Pages serves pages over HTTPS, so the PWA install flow works after deployment.

## Publish With GitHub Pages

1. Push this repository to GitHub.
2. Open the repository Settings page.
3. Open Pages.
4. Set Source to `Deploy from a branch`.
5. Select the `main` branch and `/root`, then save.
6. Open the generated GitHub Pages URL.
7. In Chrome or Edge, use the install icon in the address bar or the browser menu to install the PWA.

## Image

`assets/mike-chan-sprite.png` is an AI-generated original cat character sprite sheet.
