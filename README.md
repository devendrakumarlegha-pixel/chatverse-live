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
This is a controlled-test prototype, not production-ready. It uses in-memory sessions/tokens, a single OAuth client, and basic SSE; restarts lose auth state. Before public use, implement encrypted persistent token storage, secure HttpOnly/SameSite sessions, CSRF protection, rate limiting, robust origin validation, and error/quota handling. GitHub Pages can host only the static frontend, not this Node backend; deploy the backend to a Node-capable host with HTTPS.
