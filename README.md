# Abhivriddhi Live Voting

## Run immediately
1. `npm install`
2. `npm run dev`
3. Open `http://localhost:5173/`

If Supabase environment variables are not configured, the app automatically runs in **LOCAL local fallback MODE** so it never shows a blank screen.

local fallback admin:
- Email: `admin@abhivriddhi.local`
- Password: `admin123`

local fallback audience:
- Email: `local fallback@example.com`
- Verification code: `[configured verification code]`

## Real event setup
Create a Supabase project and add `.env` with:

```env
VITE_SUPABASE_URL=YOUR_PROJECT_URL
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

Then run `supabase/schema.sql` in Supabase SQL Editor.

For the real event, the approved email list must come from the Excel upload. The backend RPC `check_allowed_email` is checked before any OTP is sent.
