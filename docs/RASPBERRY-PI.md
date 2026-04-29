# Deploying FamilyHub on a Raspberry Pi

End-to-end guide: bare Pi → running app on your home network, with all four mini-apps and optional reminder/WhatsApp integrations configured.

> **Time budget:** 30–60 min for a fresh setup, ~5 min for a re-deploy after a code change.

## Table of contents

1. [Prerequisites](#1-prerequisites)
2. [Prepare the Pi](#2-prepare-the-pi)
3. [Install Docker](#3-install-docker)
4. [(Optional) Install Tailscale](#4-optional-install-tailscale)
5. [Clone the repo](#5-clone-the-repo)
6. [Configure environment](#6-configure-environment)
7. [First boot](#7-first-boot)
8. [Register the first admin user](#8-register-the-first-admin-user)
9. [Initial admin settings](#9-initial-admin-settings)
10. [Configure reminder services (optional)](#10-configure-reminder-services-optional)
11. [Schedule the reminder cron](#11-schedule-the-reminder-cron)
12. [Configure Larder direct-send (optional)](#12-configure-larder-direct-send-optional)
13. [Add family members](#13-add-family-members)
14. [Install as a PWA on phones](#14-install-as-a-pwa-on-phones)
15. [Daily operations](#15-daily-operations)
16. [Updating to a new version](#16-updating-to-a-new-version)
17. [Backups](#17-backups)
18. [Troubleshooting](#18-troubleshooting)

---

## 1. Prerequisites

**Hardware**

- Raspberry Pi 4 (4 GB or 8 GB) — Pi 3 works but the build is slow.
- 32 GB+ microSD card *or* an external USB SSD (recommended for write longevity).
- Reliable PSU (the official one).
- Wired ethernet preferred; Wi-Fi works.

**OS**

- Raspberry Pi OS Lite (64-bit), Bookworm or later. The Lite image is fine — there's no GUI needed.
- Flash with the [Raspberry Pi Imager](https://www.raspberrypi.com/software/). Before writing, click the gear icon and set:
  - hostname (e.g. `familyhub`)
  - username + password
  - enable SSH
  - Wi-Fi credentials (if not using ethernet)
  - locale / keyboard / timezone

**Network**

- Set a DHCP reservation on your router so the Pi keeps a fixed IP, or use Tailscale (step 4).
- Optional: a domain name like `familyhub.home.lan` via your router's local DNS.

---

## 2. Prepare the Pi

SSH in:

```bash
ssh <username>@<pi-hostname>.local
# or: ssh <username>@<pi-ip>
```

Update everything:

```bash
sudo apt update && sudo apt full-upgrade -y
sudo apt install -y git curl
```

Reboot if a kernel update happened:

```bash
sudo reboot
```

---

## 3. Install Docker

The convenience script is the simplest path:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

Log out and back in (or `newgrp docker`) so the group change takes effect, then verify:

```bash
docker --version
docker compose version
docker run --rm hello-world
```

Last command should print "Hello from Docker!". If not, fix Docker before continuing.

---

## 4. (Optional) Install Tailscale

Tailscale gives the family secure access to FamilyHub from anywhere without exposing it to the public internet. Highly recommended.

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

The command prints a URL — open it in a browser, log in, and the Pi joins your tailnet. Note its tailnet name (e.g. `familyhub.tailnet-xxxx.ts.net`).

Each family member installs Tailscale on their phone and signs into the same tailnet. That's it — no port forwarding, no VPN, no DDNS.

---

## 5. Clone the repo

```bash
cd ~
git clone https://github.com/TechBySaiRishith/Family-Hub.git familyhub
cd familyhub
```

If the repo is private, set up an HTTPS personal access token or an SSH key for this Pi.

---

## 6. Configure environment

```bash
cp .env.example .env.local
```

Generate the auth secret:

```bash
openssl rand -base64 32
# example output: 7xPq+...XYZab=
```

Edit `.env.local`:

```bash
nano .env.local
```

Set:

```env
DATABASE_PATH=/app/data/location-manager.db
AUTH_SECRET=<paste the openssl output here>
AUTH_URL=http://<pi-hostname-or-tailnet-name>:3000
```

**Picking the right `AUTH_URL`:**

| Access pattern | `AUTH_URL` |
|---|---|
| Home network only, by IP | `http://192.168.1.42:3000` |
| Home network, by hostname | `http://familyhub.local:3000` |
| Tailscale (recommended) | `http://familyhub:3000` *(MagicDNS)* or `http://familyhub.tailnet-xxxx.ts.net:3000` |

Auth.js validates the host against this URL — getting it wrong causes login redirects to the wrong host. If family members will use multiple paths, pick the most stable one (Tailscale name).

> The map provider keys (`GOOGLE_MAPS_API_KEY`, `MAPBOX_ACCESS_TOKEN`) in `.env.example` are *unused at runtime* — those are configured later in the admin UI. Leave them commented out.

---

## 7. First boot

Build the image and start the container:

```bash
docker compose up -d --build
```

First build takes 5–15 minutes on a Pi (Next.js compiles on ARM). Watch progress:

```bash
docker compose logs -f
```

You're looking for these lines:

```
✓ Ready in <N>ms
- Local:   http://0.0.0.0:3000
```

Press Ctrl+C to detach from logs (the container keeps running).

The data directory is `./data/` and is bind-mounted into the container. The first boot creates:

- `data/location-manager.db` — SQLite database
- `data/uploads/` — coupon screenshots and location photos

The `__drizzle_migrations` table is created automatically on first DB access. **No manual `drizzle-kit push` step needed** — migrations apply on every boot.

---

## 8. Register the first admin user

Open `http://<your-AUTH_URL-host>:3000/register` in a browser.

The very first registered user becomes admin automatically. The invite-code field is required by the form but not validated for the first user — type anything (e.g. `bootstrap`).

After registering you're auto-logged-in and dropped on the dashboard.

---

## 9. Initial admin settings

Go to `/settings`. Walk through these sections in order:

### a. Invite code
- Set a passphrase the family will use to register (e.g. `kumar-family-2026`).
- Click Save.

### b. Map provider
- Default is OpenStreetMap (free, no key). Fine for most users.
- Switch to Google Maps or Mapbox if you want better Indian map coverage — paste the API key in the matching field.

That's the bare minimum. The app is now usable for Locations, Coupons (paste/OCR), Tote, and Larder (with the "Open in WhatsApp" web-link path). Skip ahead to step 13 if you don't need email / push / WhatsApp reminders or Larder direct-send.

---

## 10. Configure reminder services (optional)

These are independent — set up only the ones you want. Each lives in `/settings` under the "Reminder services" form.

### Email (SMTP) — for coupon expiry digests

Use any SMTP provider. Gmail with an App Password is the easy path:

1. Enable 2FA on the Google account.
2. Create an App Password at https://myaccount.google.com/apppasswords.
3. In `/settings`:
   - Host: `smtp.gmail.com`
   - Port: `587`
   - User: `you@gmail.com`
   - Password: the 16-char app password (no spaces)
   - From address: `FamilyHub <you@gmail.com>`
4. Click Save.

### Push notifications (VAPID) — for in-browser alerts

1. In `/settings` → Push (VAPID) → click **Generate keys**.
2. Click Save.
3. Done — family members opt in from their personal `/settings`.

### WhatsApp (Twilio) — for coupon reminders + Larder direct-send

1. Create a free Twilio account at https://twilio.com.
2. Activate the WhatsApp sandbox (Console → Messaging → Try it out → Send a WhatsApp message). Note the `whatsapp:+14155238886`-style sandbox number.
3. Each family member who wants WhatsApp reminders has to send the join code (e.g. `join wisely-lemon`) from their WhatsApp to the sandbox number. This pairs them with the sandbox.
4. In `/settings`:
   - Account SID: from Twilio console
   - Auth token: from Twilio console
   - From: `whatsapp:+14155238886` (the sandbox number)
5. Click Save.

> For production you'd upgrade to a Twilio WhatsApp Business sender, which removes the join-code step. For a household, the sandbox is fine and free.

---

## 11. Schedule the reminder cron

The expiry digest is fired by an HTTP cron, not by an in-app scheduler. This way it works whether the container is restarted or not.

1. In `/settings` → Cron token → click **Generate**. Copy the token.
2. On the Pi:

```bash
crontab -e
```

Add a line (runs daily at 9am):

```cron
0 9 * * * curl -s -H "Authorization: Bearer <YOUR-TOKEN>" http://localhost:3000/api/cron/reminders >/dev/null
```

Save. Verify the cron is registered:

```bash
crontab -l
```

You can manually trigger the cron to test:

```bash
curl -s -H "Authorization: Bearer <YOUR-TOKEN>" http://localhost:3000/api/cron/reminders
```

Should return `{"ok":true,"sent":<N>}`.

---

## 12. Configure Larder direct-send (optional)

Larder ships with two send paths:

- **Open in WhatsApp** — works out of the box. Opens `wa.me` with the formatted list pre-filled. Member picks the chat after it opens.
- **Send to <label>** — admin opt-in. Posts the list straight to a fixed family number with one tap, no browser hop.

To enable the second path:

1. Make sure WhatsApp (Twilio) is configured (step 10 above).
2. In `/settings` → Larder direct-send:
   - **Recipient number** (E.164): `+919876543210` (the WhatsApp number you want the list sent to — typically the family group's main contact, or a personal number that forwards to the family group)
   - **Label**: a short name shown on the Larder page button — e.g. `Mum's WhatsApp`, `Dad`, `Family group`
3. Click Save.
4. Open `/larder` — the **Send to <label>** button appears next to **Open in WhatsApp**.

> The recipient number must have completed the Twilio sandbox join step (step 10 above) or have an active 24-hour session with your sender, otherwise Twilio will reject the send.

---

## 13. Add family members

Share the `AUTH_URL` and the invite code from step 9a. Family members:

1. Open `<AUTH_URL>/register`.
2. Enter their name, email, password, and the invite code.
3. They're created as `member` (not admin) and dropped on the dashboard.
4. They visit their own `/settings` to opt in to push / email / WhatsApp expiry reminders, and pick how many days before expiry they want to be notified (1–14).

Members can use all four mini-apps. Only admin sees the reminder-services config and the invite-code field.

---

## 14. Install as a PWA on phones

FamilyHub is a Progressive Web App. On each family member's phone:

**iOS Safari**
1. Open `<AUTH_URL>` and log in.
2. Tap the Share icon → **Add to Home Screen**.
3. Confirm. The icon now sits on the home screen and opens like a native app.

**Android Chrome**
1. Open `<AUTH_URL>` and log in.
2. Tap the three-dot menu → **Install app** (or **Add to Home Screen**).
3. Confirm.

Once installed, FamilyHub also registers as a share target — long-press a Google Maps link or coupon image in WhatsApp → Share → FamilyHub.

---

## 15. Daily operations

**View logs:**

```bash
cd ~/familyhub
docker compose logs -f --tail=100
```

**Restart the container** (e.g. after editing `.env.local`):

```bash
docker compose restart
```

**Stop / start:**

```bash
docker compose down
docker compose up -d
```

**Container resource usage:**

```bash
docker stats --no-stream
```

Typical idle: ~150 MB RAM, <1% CPU. Active: <300 MB, brief CPU spikes during OCR or map tile loading.

---

## 16. Updating to a new version

Whenever new code is pushed to `master`:

```bash
cd ~/familyhub
git pull
docker compose up -d --build
```

That's it. Migrations apply automatically on container boot — no manual `drizzle-kit push` step.

Verify the new version is up:

```bash
docker compose logs --tail=20 | grep "Ready in"
```

If a build fails, the old container keeps running until the new one is ready, so you don't get downtime from a broken push.

---

## 17. Backups

All persistent state is in `./data/`:

```
data/
├── location-manager.db       # SQLite — users, locations, coupons, events, larder, reviews, settings
├── location-manager.db-wal   # SQLite write-ahead log
├── location-manager.db-shm   # SQLite shared memory
└── uploads/                  # Coupon screenshots, location photos
```

### Quick local snapshot

```bash
cd ~/familyhub
tar czf "../familyhub-backup-$(date +%Y%m%d).tar.gz" data/
```

Move the resulting `.tar.gz` somewhere off the Pi.

### Automated nightly backup to a USB drive

Plug a USB stick into the Pi and find its mount point (`lsblk`), then:

```bash
crontab -e
```

Add:

```cron
30 2 * * * cd /home/<user>/familyhub && tar czf /mnt/usb/familyhub-$(date +\%Y\%m\%d).tar.gz data/ && find /mnt/usb -name "familyhub-*.tar.gz" -mtime +30 -delete
```

(Note `\%` to escape `%` inside crontab.) Keeps the last 30 days, prunes older.

### Restoring

Stop the container, restore the data folder, restart:

```bash
docker compose down
rm -rf data/
tar xzf familyhub-backup-2026-01-15.tar.gz
docker compose up -d
```

---

## 18. Troubleshooting

### Container keeps restarting

```bash
docker compose logs --tail=50
```

Look for the actual error. Common causes:

- **`SqliteError: ...`** — DB is corrupted or migrations failed. Restore from backup.
- **`AUTH_SECRET is not set`** — `.env.local` is missing or malformed. Re-check step 6.
- **Port 3000 already in use** — something else is bound on the Pi. Find it with `sudo lsof -i :3000` and stop it, or change the port in `docker-compose.yml`.

### Family member can't log in

- They're hitting an `AUTH_URL` that doesn't match the one in `.env.local`. Auth.js rejects mismatches as a security measure. Either update `AUTH_URL` and restart, or have them use the configured URL.
- Their cookie cache is stale — try incognito mode.

### `/larder` shows "no such table: larder_items"

This means the auto-migrator didn't run. Should never happen with the current code, but if it does:

```bash
docker compose exec familyhub sh -lc "ls /app/drizzle"
```

Should list `0000_*.sql` and a `meta/` folder. If it doesn't, the Docker image was built before the migrations were added — rebuild with `docker compose up -d --build`.

### Reminders never fire

- `crontab -l` shows the cron is registered.
- `docker compose exec familyhub curl -s -H "Authorization: Bearer <TOKEN>" http://localhost:3000/api/cron/reminders` from inside the container returns `{"ok":true,...}`.
- Each user has actually opted in via their own `/settings`, with at least one channel enabled and a valid email / E.164 number.
- For email: SMTP creds are correct (test with `swaks` if you have it installed).
- For WhatsApp: the recipient has completed the Twilio sandbox join step.

### "Open in WhatsApp" button does nothing on iOS Safari

Should be fixed in the current code (uses a real `<a href>`, not `window.open`). If it still doesn't work:

- Check the browser blocked the popup — some PWA shells do.
- Tap the button while iOS Safari has just been activated by user input (the browser blocks anchor opens during the same gesture as autocomplete in rare cases).

### Build is failing on the Pi

The Pi 3 runs out of RAM during the Next.js build. Workarounds:

- Add 2 GB of swap: `sudo dphys-swapfile swapoff && sudo sed -i 's/^CONF_SWAPSIZE=.*/CONF_SWAPSIZE=2048/' /etc/dphys-swapfile && sudo dphys-swapfile setup && sudo dphys-swapfile swapon`
- Or build the image on a beefier machine and `docker save`/`docker load` to the Pi.

### Want to factory-reset

```bash
docker compose down
rm -rf data/
docker compose up -d --build
```

You'll lose everything but the code. Re-register the first user.
