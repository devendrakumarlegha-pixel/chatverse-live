# CHATVERSE LIVE prototype

## Included
- `index.html`: mobile-friendly futuristic game demo.
- `server/index.js`: Node/Express OAuth + YouTube Live Chat bridge scaffold.
- `.env.example`: placeholder environment configuration only. No secrets included.

## Run
Requires Node.js 20+:
1. `npm install`
2. Run `npm test` to execute syntax, frontend-script, persistence, security, and runtime smoke checks.
3. Copy `.env.example` to `.env`.
4. Fill in OAuth values on the server only.
5. `npm start`
6. Open `http://localhost:3000`.

## Google OAuth
Enable YouTube Data API v3. In Google Auth Platform, keep Audience External/Testing and add the channel account as a test user. In the Web OAuth client, add this exact Authorized redirect URI for local tests: `http://localhost:3000/oauth2callback`. Configure the same URI in `GOOGLE_REDIRECT_URI`. Never put `GOOGLE_CLIENT_SECRET` in HTML or commit `.env`.

Scopes requested: `youtube.readonly` and `youtube.force-ssl`. Start an active livestream with chat enabled before clicking Find live chat.

## Pre-live checklist

Complete these checks before using the game on a public stream:

1. Deploy the latest `main` commit to the Node-capable Render service.
2. Confirm `https://chatverse-live.onrender.com/health` returns JSON with `ok: true`.
3. Confirm `BASE_URL`, `GOOGLE_REDIRECT_URI`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`, and `ALLOWED_ORIGINS` are configured in Render. Keep secrets in Render environment settings only.
4. In Google Auth Platform, ensure the account that owns the livestream is allowed as a test user while the app audience is in Testing, and the OAuth client's redirect URI exactly matches `https://chatverse-live.onrender.com/oauth2callback`.
5. Open `https://chatverse-live.onrender.com`, choose **Connect Google**, finish authorization, then return to the game tab.
6. Start a private/unlisted test livestream with Live Chat enabled, then choose **Connect Active Live Chat**.
7. Send `!red`, `!blue`, and one other supported command in the actual livestream chat. Verify the arena changes and the shared leaderboard updates.
8. If using OBS, add `https://chatverse-live.onrender.com/public/overlay.html` as a Browser Source and verify it shows the same chat commands.
9. Check the GitHub Actions workflow and confirm the latest smoke-test run passed before public use.

The assistant has not performed a real YouTube livestream test or confirmed the latest Render deployment from this repository. Do not assume live chat works until the checklist above has been completed.

## Important
The shared leaderboard is now loaded from and saved to a JSON file. Set `LEADERBOARD_FILE` to choose its path (default: `data/leaderboard.json`). This only survives restarts when that path is on persistent storage. Render ephemeral filesystems can lose this data on restart or redeploy; attach a persistent disk and mount it, or use a managed database before relying on permanent scores. The file store is suitable only for a small single-instance prototype; concurrent instances need a shared database.

This is a controlled-test prototype, not production-ready. It uses in-memory sessions/tokens, a single OAuth client, and basic SSE; restarts lose auth state. Before public use, implement encrypted persistent token storage, secure HttpOnly/SameSite sessions, CSRF protection, rate limiting, robust origin validation, and error/quota handling. GitHub Pages can host only the static frontend, not this Node backend; deploy the backend to a Node-capable host with HTTPS.

## OBS browser-source overlay
After deploying the latest commit to your Node host, add a **Browser Source** in OBS:
- URL: `https://chatverse-live.onrender.com/public/overlay.html`
- Width: `900`, Height: `500` (adjust to fit your scene)
- Enable **Shutdown source when not visible** only if you want the overlay connection to stop while hidden; otherwise leave it off.
- Keep the source background transparent. The overlay listens to the same-origin `/api/events` SSE stream and shows real chat commands. The red/blue numbers count received `!red` and `!blue` commands since the overlay page was opened; they are command counts, not the main game's score.
- First connect Google and click **Connect Active Live Chat** in the game page. Then open the overlay URL in OBS.
- Test with a real active YouTube livestream and Live Chat enabled.

Overlay file: `public/overlay.html`. This remains a prototype and should not be treated as production-secure.
