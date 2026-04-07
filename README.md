# MSS Quote App

**Repo:** [github.com/neonwhistle/mss-quote-app](https://github.com/neonwhistle/mss-quote-app)

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
4. **Run command:** `npm start` (runs the standalone server with `HOSTNAME=0.0.0.0` so Docker/Traefik can reach the app; without this, Traefik often shows “no available server”.)
5. Set **HTTP port** / `PORT` to what the platform injects (App Platform sets `PORT` automatically; Next.js respects it).
6. Enable **HTTPS** on the default `ondigitalocean.app` host or attach your domain.

**Droplet + Docker + Caddy (HTTPS)**

1. **DNS:** Create an **A record** (e.g. `quote.yourdomain.com`) pointing to your droplet’s **public IPv4**. Wait for it to resolve before starting Caddy (Let’s Encrypt needs this).

2. **Firewall** (on the droplet, and in the DigitalOcean **cloud firewall** if you use one): allow **22** (SSH), **80** (HTTP challenge), **443** (HTTPS). Example with `ufw`:
   ```bash
   ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw enable
   ```

3. **App container** (should listen only on localhost — you already use `-p 127.0.0.1:3000:3000`):
   ```bash
   docker run -d --name mss-quote --restart unless-stopped -p 127.0.0.1:3000:3000 mss-quote
   ```

4. **Install Caddy** on Ubuntu (official repo — see [caddyserver.com/docs/install](https://caddyserver.com/docs/install)):
   ```bash
   sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
   sudo apt update && sudo apt install caddy
   ```

5. **Caddyfile:** Copy `deploy/Caddyfile.example` to `/etc/caddy/Caddyfile` and replace `quote.yourdomain.com` with your real hostname (one place at the top of the site block).

6. **Validate and apply:**
   ```bash
   sudo caddy validate --config /etc/caddy/Caddyfile
   sudo systemctl enable --now caddy
   sudo systemctl reload caddy
   ```

7. Open **https://quote.yourdomain.com** — Caddy will obtain a certificate automatically on first request.

**Optional — nginx instead of Caddy:** Use `nginx` + `certbot --nginx` on Ubuntu; `proxy_pass http://127.0.0.1:3000;` in your `server` block. More steps than Caddy for TLS; same idea behind the scenes.

**Repo file:** See `deploy/Caddyfile.example` for the site block (and commented **basic auth** if you want a shared password for family-only use).

**Mom’s workflow**

- Send her the **https://** URL, save as a bookmark / home-screen shortcut on her phone.
- This MVP has **no login**; use an obscure subdomain and/or put **HTTP basic auth** in front (nginx/Caddy) or **Cloudflare Access** so strangers can’t use the tool.

**Note:** `next.config.ts` uses `output: "standalone"` for efficient container builds; `Dockerfile` is optional if you use App Platform with Node buildpacks only.
