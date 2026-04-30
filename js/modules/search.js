/**
 * modules/search.js — Search, filter and sort logic
 * Depends on: state.js, data/destinations.js, modules/currency.js
 */

const Search = (() => {

  // ── Flexible date search ─────────────────────────────────────────
  // For each destination, find the cheapest departure day within the window.
  // Price varies by day-of-week (weekends cost more) + small city/date jitter.
  // Returns results already budget-filtered, with .flexBestDate and .flexSaving.
  function _flexDates(pool, budget, passengers, idaDate, flexDays) {
    const bpp = budget / passengers;

    // Apply non-price filters first (climate, trip type, airline)
    const climaFilter   = AppState.get('climaFilter');
    const tipoFilters   = AppState.get('tipoFilters');
    const airlineFilter = AppState.get('airlineFilter');
    const filtered = pool.filter(d => {
      if (climaFilter   && !d.clima.includes(climaFilter))                      return false;
      if (tipoFilters.length && !tipoFilters.some(t => d.tipo.includes(t)))     return false;
      if (airlineFilter && !d.airlines.includes(airlineFilter))                  return false;
      return true;
    });

    // Build date window: [ida, ida+1, ..., ida+(flexDays-1)]
    const dates = [];
    for (let i = 0; i < flexDays; i++) {
      const d = new Date(idaDate);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }

    // Day-of-week multipliers (0=Sun … 6=Sat)
    // Mon/Tue/Wed cheapest; Fri/Sat/Sun pricier
    const DOW = [1.07, 0.91, 0.88, 0.90, 0.96, 1.05, 1.09];

    const results = [];
    for (const dest of filtered) {
      let bestPrice = Infinity;
      let bestDate  = idaDate;

      for (const date of dates) {
        // Deterministic jitter per city+day (±4 %)
        const seed    = (dest.city.charCodeAt(0) * 31 + date.getDate()) % 20;
        const jitter  = (seed - 10) * 0.004;
        const price   = Math.round(dest.price * (DOW[date.getDay()] + jitter));
        if (price < bestPrice) { bestPrice = price; bestDate = new Date(date); }
      }

      if (bestPrice <= bpp) {
        const saving = Math.max(0, dest.price - bestPrice);
        results.push({
          ...dest,
          price:        bestPrice,
          flexBestDate: bestDate,
          flexSaving:   saving,
        });
      }
    }
    return results;
  }

  // ── Core filter ─────────────────────────────────────────────────
  function _buildPool() {
    const destType = document.getElementById('destType').value;
    let pool = [];
    if (destType !== 'internacional') pool = pool.concat(DESTS.nacional);
    if (destType !== 'nacional')      pool = pool.concat(DESTS.internacional);
    return pool;
  }

  function _applyFilters(pool, budget, passengers) {
    const bpp          = budget / passengers;
    const climaFilter  = AppState.get('climaFilter');
    const tipoFilters  = AppState.get('tipoFilters');
    const airlineFilter= AppState.get('airlineFilter');

    return pool.filter(d => {
      if (d.price > bpp) return false;
      if (climaFilter && !d.clima.includes(climaFilter)) return false;
      if (tipoFilters.length && !tipoFilters.some(t => d.tipo.includes(t))) return false;
      if (airlineFilter && !d.airlines.includes(airlineFilter)) return false;
      return true;
    });
  }

  function _applySort(results) {
    const mode = AppState.get('sortMode');
    if (mode === 'preco-asc'  || mode === 'preco') return [...results].sort((a,b) => a.price - b.price);
    if (mode === 'preco-desc') return [...results].sort((a,b) => b.price - a.price);
    if (mode === 'az')         return [...results].sort((a,b) => a.city.localeCompare(b.city, 'pt-BR'));
    if (mode === 'sugestao') {
      const maxPrice = Math.max(...results.map(d => d.price));
      return [...results].sort((a, b) => {
        const scoreA = a.rating * (1 - (a.price / maxPrice) * 0.35);
        const scoreB = b.rating * (1 - (b.price / maxPrice) * 0.35);
        return scoreB - scoreA;
      });
    }
    return results;
  }

  // ── Public: run search (tries live API, falls back to static) ────
  async function run() {
    const budget     = Currency.getBudgetBRL();
    const passengers = parseInt(document.getElementById('pessoas').value) || 1;
    const originIata = AppState.get('originIata');
    const idaDate    = AppState.get('idaDate');
    const voltaDate  = AppState.get('voltaDate');

    // Show loading state
    _setLoading(true);

    let pool;
    let isLive = false;

    try {
      // Try live API first
      const departDate = idaDate ? idaDate.toISOString().split('T')[0] : null;
      const returnDate = voltaDate ? voltaDate.toISOString().split('T')[0] : null;
      const liveResult = await Flights.search(originIata, departDate, returnDate, passengers);

      if (liveResult.live && liveResult.results && liveResult.results.length) {
        pool   = liveResult.results;
        isLive = true;
        // Update notice to show live prices
        const notice = document.querySelector('.notice');
        if (notice) notice.textContent = '✅ Preços ao vivo — atualizado agora pela Air Scraper API.';
      } else {
        throw new Error('No live results');
      }
    } catch (e) {
      // Fallback to static data
      pool = _buildPool();
    }

    AppState.set('isLive', isLive);

    const flexDays = AppState.get('flexDays');
    let processed;
    if (flexDays && idaDate && !isLive) {
      // Flexible-date search on static data
      processed = _flexDates(pool, budget, passengers, idaDate, flexDays);
    } else {
      processed = _applyFilters(pool, budget, passengers);
    }

    const sorted = _applySort(processed);

    AppState.set('results', sorted);
    AppState.set('selectedIdx', null);
    _setLoading(false);
    return sorted;
  }

  function _setLoading(on) {
    const btn = document.getElementById('btnBuscar');
    if (btn) {
      btn.textContent = on ? 'Buscando...' : 'Buscar destinos →';
      btn.disabled    = on;
    }
  }

  // ── Public: update sort ──────────────────────────────────────────
  function setSort(mode) {
    AppState.set('sortMode', mode);
    const sorted = _applySort(AppState.get('results'));
    AppState.set('results', sorted);
    AppState.set('selectedIdx', null);
  }

  // ── Public: clear filters ────────────────────────────────────────
  function clearFilters() {
    AppState.resetFilters();
    document.querySelectorAll('#climaChips .chip.active, #tipoChips .chip.active')
      .forEach(x => x.classList.remove('active'));
    document.getElementById('ciaP').value = '';
    document.getElementById('mesmaCia').checked = false;
    document.getElementById('fbarClear').style.display = 'none';
  }

  // ── Public: update result meta display ───────────────────────────
  function updateMeta() {
    const results    = AppState.get('results');
    const passengers = parseInt(document.getElementById('pessoas').value) || 1;
    const budget     = Currency.getBudgetBRL();
    const orig       = document.getElementById('origem').value || 'sua cidade';
    const soIda      = AppState.get('onewayOnly');
    const ida        = AppState.get('idaDate');
    const volta      = AppState.get('voltaDate');
    const lang       = I18n.getLang();
    const locale     = lang === 'pt' ? 'pt-BR' : lang === 'es' ? 'es-ES' : 'en-US';
    const fmtD = d => d ? d.toLocaleDateString(locale, { day:'2-digit', month:'long' }) : '';
    const travelerLabel = passengers > 1 ? I18n.t('meta.travelerspl') : I18n.t('meta.travelers');

    const flexDays = AppState.get('flexDays');
    const flexLabel = flexDays ? ' · ' + I18n.t('flex.meta').replace('{n}', flexDays) : '';

    document.getElementById('numR').textContent = results.length;
    document.getElementById('rMeta').textContent =
      orig + ' · ' + fmtD(ida) +
      (!soIda && volta ? ' → ' + fmtD(volta) : ' · ' + I18n.t('meta.oneway')) +
      ' · ' + passengers + ' ' + travelerLabel +
      ' · ' + I18n.t('meta.until') + ' ' + Currency.format(budget) +
      flexLabel;
  }

  return { run, setSort, clearFilters, updateMeta };
})();

// Expose to global scope
window.Search = Search;
