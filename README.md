# Bitcoin Block Mining Simulator

Educational game by **BitPolito** that simulates mempool selection, fee markets, and proof-of-work mining. Play in an accessible **Easy** mode or a **Hard** mode with real SHA-256.

## Features

- **Easy mode:** arithmetic nonce puzzle (great for classrooms)
- **Hard mode:** double SHA-256 hashing with live hash checker
- **Solo play** or **multiplayer rooms** (race to mine N blocks, default 3)
- **Join via room code, link, or QR** in the waiting lobby
- **Italian / English** UI (toggle on menu and lobby screens)
- **Deterministic mempools** in multiplayer: same room code gives the same transactions per block

## Quick start

```bash
cd MiningGame
npm install
npm start        # API (:3001) + frontend (:5173)
```

Dalla root del monorepo (`bitpolito/`) puoi anche usare `npm start` (delega a `MiningGame/`).

Poi apri **http://localhost:5173** nel browser.

### Due terminali (alternativa)

```bash
npm run server   # terminale 1: API
npm run dev      # terminale 2: frontend
```

### Solo giocare senza multiplayer

Basta `npm run dev` e clicca **Play Solo** / **Gioca in solitaria**. Le stanze richiedono l’API: usa **`npm start`** (consigliato) oppure `npm run server` in un secondo terminale. Se il server non è attivo, nel menu compare un avviso rosso.

### Unirsi con QR / link

Dopo aver creato una stanza, nella lobby vedi il **codice**, il **link** e un **QR**: aprendo il link su un altro telefono si arriva direttamente alla schermata di join (`?join=CODICE`).

### Non aprire `dist/index.html` direttamente

Il progetto usa moduli ES: serve Vite (`npm run dev` o `npm start`).

## Deploy (Vercel)

1. Import the repo e imposta **Root Directory** = `MiningGame`.
2. Framework: **Vite** (o lascia rilevare da `vercel.json`).
3. Aggiungi **Vercel KV** (oppure `KV_REST_API_URL` + `KV_REST_API_TOKEN`).
4. Deploy: build `npm run build` → cartella `dist`; le route in `/api` diventano Serverless Functions automaticamente.

In produzione non serve `server.js`: solo in locale con `npm start`.

`vercel.json` include rewrite SPA (`/*` → `index.html` eccetto `/api/*`).

## Project layout

| Path | Role |
|------|------|
| `src/games/` | Easy & Hard game screens |
| `src/lib/` | Mempool generator, SHA-256, tx validation |
| `src/i18n/` | EN/IT strings + locale context |
| `api/room.js` | Multiplayer room API (Vercel serverless) |
| `server.js` | Local Express proxy for `/api` during dev |

## How to play (summary)

See in-app **How to play** or `src/guides/` for full rules in English and Italian.
