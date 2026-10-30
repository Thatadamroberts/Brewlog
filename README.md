# Brewlog ☕

A check-in app for coffee, in the spirit of beer check-in apps. Log every cup you drink and every bag of beans you buy, with a photo, rating, and where it came from.

**Local only.** Everything, including photos, is stored in your browser's IndexedDB on your own device. Nothing is uploaded anywhere.

## Features

- **Check in a coffee**: type of coffee (espresso, flat white, pour over, beans…), date, and a 0–5 rating in quarter steps
- **Bean information**: roaster, origin country and region, farm or producer, variety, process, roast level, roast date, tasting notes
- **Where you got it**: place or seller, kind of place (café, roaster, online…), location, price and currency, quantity
- **Photo** per check-in, resized on the device to keep storage small
- **Feed** with search and sorting by date, rating, or price
- **Log again** copies a coffee's bean and source details into a new check-in
- **Stats**: check-ins, unique coffees, roasters, origins, average rating, total spend, top origins, roasters, drinks, and shops
- **Backup**: export everything (photos included) to a JSON file and import it on another device
- **Installable PWA** that works offline. Add it to your phone's home screen.

## Getting started

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open the URL Vite prints. To try it on your phone over the local network, run `npm run dev -- --host` and open the network URL.

### Production build

```bash
npm run build
npm run preview
```

The `dist/` folder is a static site and can be served from anywhere. Offline support and "install to home screen" need HTTPS (or `localhost`).

## Live app

https://thatadamroberts.github.io/Brewlog/

Deploys are manual: on GitHub, go to **Actions → Deploy to GitHub Pages → Run workflow** to publish the current `main` (`.github/workflows/deploy.yml`). Pushing to `main` does not deploy. On your phone, open the link and use **Add to Home Screen** (Safari share menu, or the Chrome menu) to install it. Your data still stays on your device. GitHub only hosts the app's code.

## Tech

- React + TypeScript + Vite
- [Dexie](https://dexie.org) over IndexedDB for storage (`src/db.ts`)
- `vite-plugin-pwa` for the service worker and manifest

## Project layout

```
src/
  db.ts            data model and database
  image.ts         photo resizing and thumbnails
  backup.ts        JSON export/import
  options.ts       dropdown values and formatting
  pages/           Feed, Detail, CoffeeForm, Stats, Settings
  components/      rating and image helpers
```

## Data and privacy

Your data lives in this browser's storage for the site. Clearing site data, or uninstalling the app, deletes it, so use **Settings → Export backup** regularly. Data is not shared between browsers or devices unless you export and import a backup.
