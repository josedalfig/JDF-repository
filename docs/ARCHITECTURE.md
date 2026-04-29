# Viajar sem Destino — Architecture

## Project Structure

```
viajar-sem-destino/
│
├── index.html                  ← Shell HTML only (~150 lines, zero inline JS/CSS)
│
├── css/
│   ├── base.css               ← CSS reset, custom properties, backgrounds, animations
│   ├── layout.css             ← Page, header, hero, card, progress dots
│   ├── forms.css              ← All form inputs, autocomplete, chips, buttons
│   ├── calendar.css           ← Custom date picker popup
│   ├── results.css            ← Filter bar, destination cards, detail panel, map, weather
│   └── modals.css             ← Share modal, empty state fallback, responsive breakpoints
│
├── js/
│   ├── state.js               ← Single source of truth (AppState object)
│   │
│   ├── data/
│   │   ├── airports.js        ← 37 airports with IATA, city, coordinates
│   │   ├── destinations.js    ← 18 destinations (nacional + internacional)
│   │   │                         ⚠️  Replace with Amadeus API when live
│   │   └── coordinates.js     ← COORDS (map) + CITY_COORDS (weather API)
│   │
│   ├── modules/
│   │   ├── currency.js        ← Format, parse, convert BRL/USD/EUR
│   │   ├── calendar.js        ← Custom date picker: open, navigate, pick, range
│   │   ├── autocomplete.js    ← Airport search + geolocation (GPS + IP fallback)
│   │   ├── search.js          ← Filter pool, apply sort, update meta display
│   │   ├── empty-state.js     ← Zero-results fallback: Quase lá, Datas próximas, Sem filtros
│   │   ├── cards.js           ← Render card grid + detail panel + weather injection
│   │   ├── weather.js         ← OpenWeatherMap fetch + HTML builder
│   │   ├── map.js             ← Leaflet map: init, markers, arcs, view toggle
│   │   └── share.js           ← Build URL, WhatsApp/email share, load URL params
│   │
│   └── app.js                 ← Orchestrator: init, event wiring, navigation, search flow
│
└── docs/
    └── ARCHITECTURE.md        ← This file
```

---

## Module Dependency Graph

```
app.js
  ├── state.js
  ├── data/*
  ├── currency.js       (no deps beyond state)
  ├── calendar.js       (state)
  ├── autocomplete.js   (state, airports.js)
  ├── search.js         (state, currency, destinations)
  ├── empty-state.js    (state, currency, destinations, calendar, search, app)
  ├── cards.js          (state, currency, weather, empty-state)
  ├── weather.js        (state, coordinates)
  ├── map.js            (state, currency, coordinates, airports, cards)
  └── share.js          (state, currency, calendar)
```

---

## State Management

All application state lives in `js/state.js` as a single `AppState` object.

**Never** read/write state directly from module-level variables.  
**Always** use `AppState.get(key)` and `AppState.set(key, value)`.

Key state fields:
| Key | Type | Description |
|-----|------|-------------|
| `originIata` | string | Selected departure airport code |
| `idaDate` | Date\|null | Departure date |
| `voltaDate` | Date\|null | Return date (null = one-way) |
| `budget` | number | Raw budget value (in selected currency) |
| `currency` | string | 'BRL' \| 'USD' \| 'EUR' |
| `passengers` | number | Number of travelers |
| `results` | array | Current filtered+sorted destination list |
| `selectedIdx` | number\|null | Index of selected card (floats to top) |
| `climaFilter` | string\|null | Single clima chip value |
| `tipoFilters` | string[] | Multi-select tipo chip values |
| `airlineFilter` | string | Preferred airline or '' |

---

## Adding a New Destination

Edit `js/data/destinations.js` and add an entry to `DESTS.nacional` or `DESTS.internacional`:

```js
{
  city: 'Nome da Cidade',
  country: '🇧🇷 País',
  iata: 'XXX',              // 3-letter airport code
  price: 1500,              // base price per person in BRL
  tags: ['Tag1', 'Tag2'],
  clima: ['calor'],         // calor | frio | praia | montanha | temperado
  tipo: ['relaxar'],        // relaxar | cultura | gastronomia | aventura | familia | romantica
  airlines: ['Latam'],
  desc: 'Descrição curta do destino.',
  rating: 4.7,
  times: ['08:00→10:30'],
  img: 'https://images.unsplash.com/photo-XXXXX?w=800&q=70',
}
```

Then add coordinates to `js/data/coordinates.js`:
```js
'Nome da Cidade': [lat, lng],
```

---

## Amadeus Integration (when approved)

Replace the static `DESTS` object in `js/data/destinations.js` with a live fetch:

```js
// js/data/destinations.js — Amadeus version
async function fetchDestinations(originIata, budgetBRL, departureDate) {
  const token = await getAmadeusToken(); // oauth2 client_credentials
  const resp  = await fetch(
    'https://api.amadeus.com/v2/shopping/flight-offers?...',
    { headers: { Authorization: 'Bearer ' + token } }
  );
  return await resp.json();
}
```

`search.js` already calls `DESTS.nacional` and `DESTS.internacional` —
swap those references to the Amadeus response and the rest of the app
requires no changes.

---

## Weather API

- Provider: OpenWeatherMap (api.openweathermap.org)
- Key: stored in `js/modules/weather.js` — move to environment variable when backend is added
- Endpoints used: `/data/2.5/weather` (current) + `/data/2.5/forecast` (5-day)
- Keys take up to 2h to activate after registration

---

## Deployment

**Vercel (current):**  
Push to GitHub → Vercel auto-deploys.  
Live URL: https://viajar-sem-destino.vercel.app

**Local dev:**  
```bash
# Any static server works — never open index.html directly via file://
npx serve .
# or
python3 -m http.server 8080
```

Note: Opening via `file://` blocks the OpenStreetMap/CartoDB tiles (CORS).
Always use a local server for development.

---

## Roadmap

| Priority | Feature | Module to edit |
|----------|---------|----------------|
| 🔴 High | Amadeus live prices | `data/destinations.js` + `search.js` |
| 🔴 High | User auth (Supabase) | new `modules/auth.js` |
| 🟡 Med  | Save searches | new `modules/saved.js` |
| 🟡 Med  | Destination comparison | new `modules/compare.js` |
| 🟡 Med  | Affiliate links | `modules/cards.js` → `goBook()` |
| 🟢 Low  | Admin dashboard | separate `admin/` app |
| 🟢 Low  | Price alerts | requires backend + Supabase |
