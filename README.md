# CHATVERSE LIVE prototype

## Included
- `index.html`: mobile-friendly futuristic game demo.
- `server/index.js`: Node/Express OAuth + YouTube Live Chat bridge scaffold.
- `.env.example`: placeholder environment configuration only. No secrets included.

## Run
Requires Node.js 20+:
1. `npm install`
2. Copy `.env.example` to `.env`.
3. Fill in OAuth values on the server only.
4. `npm start`
5. Open `http://localhost:3000`.

## Google OAuth
Enable YouTube Data API v3. In Google Auth Platform, keep Audience External/Testing and add the channel account as a test user. In the Web OAuth client, add this exact Authorized redirect URI for local tests: `http://localhost:3000/oauth2callback`. Configure the same URI in `GOOGLE_REDIRECT_URI`. Never put `GOOGLE_CLIENT_SECRET` in HTML or commit `.env`.

Scopes requested: `youtube.readonly` and `youtube.force-ssl`. Start an active livestream with chat enabled before clicking Find live chat.

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
