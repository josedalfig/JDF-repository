/**
 * modules/flights.js — Air Scraper API (RapidAPI) integration
 *
 * Endpoints used:
 *   - searchFlightEverywhere  → destinos possíveis a partir de uma origem
 *   - searchFlights (v2)      → preços detalhados para rota específica
 *   - getPriceCalendar        → melhores datas/preços no período
 *
 * Replaces static DESTS data when live prices are available.
 */

const Flights = (() => {
  const API_KEY  = '5297a47dd4msh803ff483c3d7fbbp18165bjsn3c4459e7bf84';
  const API_HOST = 'sky-scrapper.p.rapidapi.com';
  const BASE     = 'https://sky-scrapper.p.rapidapi.com/api/v1';

  const HEADERS = {
    'x-rapidapi-key':  API_KEY,
    'x-rapidapi-host': API_HOST,
    'Content-Type':    'application/json',
  };

  // ── Cache — avoid duplicate requests ──────────────────────────────
  const _cache = new Map();
  function _cacheKey(...args){ return args.join('|'); }

  // ── Base fetch with error handling ────────────────────────────────
  async function _fetch(endpoint, params) {
    const url    = BASE + endpoint + '?' + new URLSearchParams(params).toString();
    const cached = _cache.get(url);
    if (cached) return cached;

    try {
      const resp = await fetch(url, { method: 'GET', headers: HEADERS });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const data = await resp.json();
      _cache.set(url, data);
      return data;
    } catch (e) {
      return null;
    }
  }

  // ── 1. Search airport entity ID (needed for other endpoints) ──────
  async function getAirportId(iataCode) {
    const data = await _fetch('/flights/searchAirport', { query: iataCode, locale: 'pt-BR' });
    if (!data || !data.data || !data.data.length) return null;
    // Return the first exact IATA match
    const match = data.data.find(a => a.navigation && a.navigation.relevantFlightParams &&
      a.navigation.relevantFlightParams.skyId === iataCode);
    return match ? {
      skyId:    match.navigation.relevantFlightParams.skyId,
      entityId: match.navigation.relevantFlightParams.entityId,
    } : {
      skyId:    data.data[0].navigation.relevantFlightParams.skyId,
      entityId: data.data[0].navigation.relevantFlightParams.entityId,
    };
  }

  // ── 2. Search flights everywhere (core VsD feature) ───────────────
  // Returns list of destinations with cheapest price from origin
  async function searchEverywhere(originIata, date) {
    const origin = await getAirportId(originIata);
    if (!origin) return null;

    const data = await _fetch('/flights/searchFlightEverywhere', {
      originSkyId:    origin.skyId,
      originEntityId: origin.entityId,
      anytime:        date ? 'false' : 'true',
      date:           date || '',
      currency:       'BRL',
      market:         'BR',
      locale:         'pt-BR',
      countryCode:    'BR',
    });

    if (!data || !data.data) return null;
    return data.data; // array of { destination, price, ... }
  }

  // ── 3. Search specific route (for detail panel) ───────────────────
  async function searchRoute(originIata, destIata, date, returnDate, adults) {
    const [origin, dest] = await Promise.all([
      getAirportId(originIata),
      getAirportId(destIata),
    ]);
    if (!origin || !dest) return null;

    const params = {
      originSkyId:         origin.skyId,
      destinationSkyId:    dest.skyId,
      originEntityId:      origin.entityId,
      destinationEntityId: dest.entityId,
      date,
      adults:              adults || 1,
      currency:            'BRL',
      market:              'BR',
      locale:              'pt-BR',
      countryCode:         'BR',
      cabinClass:          'economy',
      sortBy:              'best',
    };
    if (returnDate) params.returnDate = returnDate;

    const data = await _fetch('/flights/searchFlights', params);
    if (!data || !data.data) return null;
    return data.data;
  }

  // ── 4. Price calendar (for date suggestions in empty state) ───────
  async function getPriceCalendar(originIata, destIata, yearMonth) {
    const [origin, dest] = await Promise.all([
      getAirportId(originIata),
      getAirportId(destIata),
    ]);
    if (!origin || !dest) return null;

    const data = await _fetch('/flights/getPriceCalendar', {
      originSkyId:         origin.skyId,
      destinationSkyId:    dest.skyId,
      originEntityId:      origin.entityId,
      destinationEntityId: dest.entityId,
      yearMonth,
      currency:            'BRL',
      market:              'BR',
      locale:              'pt-BR',
    });

    if (!data || !data.data) return null;
    return data.data;
  }

  // ── 5. Map API response to internal DEST format ───────────────────
  // Bridges between Air Scraper response shape and what cards.js expects
  function mapToDestFormat(apiResults, staticDests) {
    if (!apiResults || !apiResults.length) return null;

    return apiResults
      .map(result => {
        // Try to find matching static dest for metadata (img, desc, tags, etc.)
        const allStatic = [...staticDests.nacional, ...staticDests.internacional];
        const iata      = result.destination && result.destination.skyId;
        const staticDest= allStatic.find(d => d.iata === iata);

        if (!staticDest) return null; // Skip destinations not in our DB

        // Price: API returns per-person, we keep that convention
        const pricePerPerson = result.price
          ? Math.round(result.price.raw || result.price)
          : staticDest.price; // fallback to static if API price missing

        return {
          ...staticDest,
          price:    pricePerPerson,
          isLive:   true,  // flag to show "preço ao vivo" badge
          deepLink: result.deepLink || null,
        };
      })
      .filter(Boolean);
  }

  // ── 6. Main search — called by search.js ──────────────────────────
  // Returns live results or falls back to static DESTS
  async function search(originIata, departureDate, returnDate, adults) {
    try {
      const apiResults = await searchEverywhere(originIata, departureDate);
      if (!apiResults) throw new Error('No results from API');

      const mapped = mapToDestFormat(apiResults, DESTS);
      if (!mapped || mapped.length === 0) throw new Error('No matching destinations');
      return { live: true, results: mapped };
    } catch (e) {
      return { live: false, results: null }; // search.js will use static DESTS
    }
  }

  // ── 7. Get detailed flights for a specific destination ────────────
  // Called by cards.js when user opens detail panel
  async function getDetailFlights(originIata, destIata, departureDate, returnDate, adults) {
    try {
      const data = await searchRoute(originIata, destIata, departureDate, returnDate, adults);
      if (!data || !data.itineraries) return null;

      // Return top 3 itineraries formatted for detail panel
      return data.itineraries.slice(0, 3).map(it => ({
        airline:  it.legs[0].carriers.marketing[0].name,
        logo:     it.legs[0].carriers.marketing[0].logoUrl,
        time:     it.legs[0].departure.slice(11,16) + '→' + it.legs[0].arrival.slice(11,16),
        price:    Math.round(it.price.raw),
        deepLink: it.deepLink || null,
        stops:    it.legs[0].stopCount,
        duration: Math.round(it.legs[0].durationInMinutes / 60) + 'h',
      }));
    } catch (e) {
      return null;
    }
  }

  return {
    search,
    searchEverywhere,
    searchRoute,
    getPriceCalendar,
    getDetailFlights,
    getAirportId,
  };
})();
