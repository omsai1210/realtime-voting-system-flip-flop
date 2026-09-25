# Abhivriddhi Live Voting

A debate voting application for the Abhivriddhi event.
Built with **React + Vite**, deployed on **Vercel** — no backend, no database, no external services.

---

## Architecture

```
React + Vite (browser)
       ↓
   Vercel (static hosting)
```

That's it. No database. No backend. No Supabase. No Neon. No SMTP.

---

## How it works

| Feature | Mechanism |
|---|---|
| Voter authorization | Email checked against `src/config/voters.js` |
| Voter session | `localStorage` (persists across page refreshes) |
| Vote storage | `localStorage` (per-browser) |
| Admin session | `localStorage` (credentials in `src/config/admin.js`) |
| Debate state | `localStorage` (created by admin, visible to voters on same device) |

> **Note:** Because this is localStorage-based, votes are per-browser. Clearing localStorage or using another device/browser will allow re-voting. This limitation is intentional and accepted.

---

## Setup & Deployment

### 1. Add your authorized voter emails

Open [`src/config/voters.js`](./src/config/voters.js) and add your emails:

```js
const AUTHORIZED_VOTERS = [
  'voter1@college.edu',
  'voter2@college.edu',
  // ... up to ~50 emails
];
```

### 2. (Optional) Change admin credentials

Open [`src/config/admin.js`](./src/config/admin.js):

```js
export const ADMIN_EMAIL    = 'admin@abhivriddhi.local';
export const ADMIN_PASSWORD = 'Abhivriddhi@2025';
```

Change these to your preferred credentials before deploying.

### 3. Deploy to Vercel

```bash
git add .
git commit -m "Add voter emails and configure admin"
git push
```

Then:
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Framework preset: **Vite**
4. Build command: `npm run build`
5. Output directory: `dist`
6. Click **Deploy**

**No environment variables needed.** The app will work immediately.

---

## Pages

| URL | Description |
|---|---|
| `/vote` | Voter login (email check) + voting |
| `/admin` | Admin login + debate management |
| `/dashboard` | Live vote count view (admin only) |

---

## Admin Usage (Event Day)

1. Go to `/admin` and log in
2. Click **"Add Debate"** — enter round name, topic, participant names
3. Click **"Make Live"** to activate a debate for voters
4. Click **"Open Voting"** when ready for votes
5. Click **"Close Voting"** to stop accepting votes
6. Click **"End Debate"** to complete the round
7. Watch vote counts update in real time on the dashboard

---

## Local Development

```bash
npm install
npm run dev
```
