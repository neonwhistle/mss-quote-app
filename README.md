# MSS Quote App

Local web app for **The Mobile Scoop Shop** event intake and customer quote drafts. Pair with the master **`•• MSS 2026.xltx`** workbook for final numbers until the formulas are fully mirrored here.

## Requirements

- Node.js 20+ (LTS recommended)
- npm, pnpm, or yarn

## Run locally

```bash
cd mss-quote-app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
npm start
```

## API

`POST /api/quote` with JSON body `{ "input": { ...EventQuoteInput } }` returns `{ ok, quote }`. Include `selectedMenuAddOnIds` (string array) for menu package lines. Same shape a future Gmail automation job can call after OAuth.

Menu add-on IDs and math live in `lib/menu-add-ons.ts` (guest take-rate × price per serving).

## Gmail + Excel today

- **Gmail**: use the in-app “Paste inquiry” box (copy from Gmail). Later: Google Cloud OAuth + Pub/Sub or polling to create draft quotes.
- **Excel**: export still goes through your workbook for COGS, minimums, and add-on rows not yet modeled in code.

## Ship to production (e.g. DigitalOcean)

**Easiest — DigitalOcean App Platform**

1. Push this repo to GitHub/GitLab (or connect the repo DO gives you).
2. Create an **App** → choose the repo, root directory `mss-quote-app`.
3. **Build command:** `npm ci && npm run build`
4. **Run command:** `npm start`
5. Set **HTTP port** / `PORT` to what the platform injects (App Platform sets `PORT` automatically; Next.js respects it).
6. Enable **HTTPS** on the default `ondigitalocean.app` host or attach your domain.

**Alternative — Droplet + Docker**

- Install Docker on a small Ubuntu droplet.
- From `mss-quote-app`: `docker build -t mss-quote .` then `docker run -d -p 3000:3000 --restart unless-stopped mss-quote`
- Put **Caddy** or **nginx** in front with Let’s Encrypt (TLS) and reverse-proxy to `127.0.0.1:3000`.

**Mom’s workflow**

- Send her the **https://** URL, save as a bookmark / home-screen shortcut on her phone.
- This MVP has **no login**; use an obscure subdomain and/or put **HTTP basic auth** in front (nginx/Caddy) or **Cloudflare Access** so strangers can’t use the tool.

**Note:** `next.config.ts` uses `output: "standalone"` for efficient container builds; `Dockerfile` is optional if you use App Platform with Node buildpacks only.
