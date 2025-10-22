# Render Chatbot (Firebase Auth + Realtime DB + Express /api/chat)

Deploys as a **Render Web Service**. The server serves `/public` and exposes `/api/chat` (proxy to OpenAI).
The client uses **Firebase Authentication** (Google by default) and **Realtime Database** for per-user history.

## 1) Local dev
```bash
npm i
cp .env.example .env   # put your real OpenAI API key
node server.js
# open http://localhost:3000
```

## 2) Firebase setup (one-time)
- Firebase Console → Project Settings → **Web app** → copy your config
- Authentication → Sign-in method → Enable **Google** (or Email/Password)
- Authentication → Settings → **Authorized domains** → add your Render domain (e.g. YOUR-SERVICE.onrender.com)
- Realtime Database → create DB → publish rules from `database.rules.json`

Paste your config in `public/firebase-config.js`.

## 3) Deploy to Render (Web Service)
- New Web Service → connect this repo/branch
- **Build Command**: `npm ci`  (or `npm install`)
- **Start Command**: `node server.js`
- **Environment Variables**: add `OPENAI_API_KEY`
- Deploy → open your onrender.com URL
