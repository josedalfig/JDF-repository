/**
 * modules/empty-state.js — Zero results fallback UI
 * Depends on: state.js, data/destinations.js, modules/currency.js
 *
 * Shows three fallback sections:
 *   1. Quase lá    — destinations matching filters but over budget
 *   2. Datas próximas — same search ±7 / ±14 days
 *   3. Sem filtros  — destinations in budget ignoring clima/tipo filters
 */

const EmptyState = (() => {

  function _addDays(date, n) {
    if (!date) return null;
    const d = new Date(date.getTime());
    d.setDate(d.getDate() + n);
    return d;
  }

  function _fmtShort(d) {
    return d ? d.toLocaleDateString('pt-BR', { day:'2-digit', month:'short' }) : '—';
  }

  function _buildQuaseLa(pool, budget, passengers, climaFilter, tipoFilters) {
    const candidates = pool
      .filter(d => {
        // Only show destinations that are OVER budget (that's the whole point)
        if (d.price * passengers <= budget) return false;
        const climaOk = !climaFilter || d.clima.includes(climaFilter);
        const tipoOk  = !tipoFilters.length || tipoFilters.some(t => d.tipo.includes(t));
        return climaOk && tipoOk;
      })
      .sort((a, b) => a.price * passengers - b.price * passengers)
      .slice(0, 3);

    if (!candidates.length) return '';

    const cards = candidates.map(d => {
      const total = d.price * passengers;
      const delta = total - budget;
      const pct   = Math.round((delta / budget) * 100);
      const bg    = d.img ? '<div class="fb-card-bg" style="background-image:url(\'' + d.img + '\')"></div>' : '';
      return '<div class="fb-card" onclick="EmptyState.applyBudget(' + total + ')">'
        + bg
        + '<div class="fb-card-inner">'
          + '<div class="fb-city">' + d.city + '</div>'
          + '<div class="fb-country">' + d.country + '</div>'
          + '<div class="fb-price">' + Currency.format(total) + ' total</div>'
          + '<div class="fb-delta">+' + Currency.format(delta) + ' (+' + pct + '%)</div>'
          + '<div class="fb-reason">Clique para ajustar budget</div>'
        + '</div></div>';
    }).join('');

    return '<div class="fallback-section">'
      + '<div class="fallback-lbl">✦ Quase lá — ajuste o budget</div>'
      + '<div class="fallback-cards">' + cards + '</div>'
    + '</div>';
  }

  function _buildDatasProximas(pool, budget, passengers, climaFilter, tipoFilters) {
    const ida   = AppState.get('idaDate');
    const volta = AppState.get('voltaDate');
    const soIda = AppState.get('onewayOnly');
    if (!ida) return '';

    const alts = [-7, 7, -14, 14].map(shift => {
      const newIda   = _addDays(ida, shift);
      const newVolta = volta ? _addDays(volta, shift) : null;
      if (!newIda || newIda < new Date()) return null;

      const count = pool.filter(d => {
        if (d.price * passengers > budget) return false;
        if (climaFilter && !d.clima.includes(climaFilter)) return false;
        if (tipoFilters.length && !tipoFilters.some(t => d.tipo.includes(t))) return false;
        return true;
      }).length;

      return { shift, newIda, newVolta, count,
        label: Math.abs(shift) + ' dias ' + (shift < 0 ? 'antes' : 'depois') };
    }).filter(Boolean);

    if (!alts.length) return '';

    const rows = alts.slice(0, 3).map(alt => {
      const dateStr  = _fmtShort(alt.newIda) + (alt.newVolta && !soIda ? ' → ' + _fmtShort(alt.newVolta) : '');
      const countTxt = alt.count > 0
        ? alt.count + ' destino' + (alt.count > 1 ? 's' : '') + ' disponíveis'
        : 'Verificar disponibilidade';
      const idaStr   = alt.newIda.toISOString().split('T')[0];
      const voltaStr = alt.newVolta ? alt.newVolta.toISOString().split('T')[0] : '';
      return '<div class="date-alt" data-ida="' + idaStr + '" data-volta="' + voltaStr + '"'
        + ' onclick="EmptyState.applyDates(this.dataset.ida, this.dataset.volta||null)">'
        + '<div><div class="date-alt-dates">' + dateStr + '</div>'
        + '<div class="date-alt-sub">' + alt.label + '</div></div>'
        + '<div class="date-alt-count">' + countTxt + ' →</div>'
      + '</div>';
    }).join('');

    return '<div class="fallback-section">'
      + '<div class="fallback-lbl">📅 Datas próximas disponíveis</div>'
      + '<div class="date-alts">' + rows + '</div>'
    + '</div>';
  }

  function _buildSemFiltros(pool, budget, passengers, hasFilters, cia) {
    if (!hasFilters) return '';

    const candidates = pool
      .filter(d => d.price * passengers <= budget && (!cia || d.airlines.includes(cia)))
      .sort((a, b) => a.price * passengers - b.price * passengers)
      .slice(0, 3);

    if (!candidates.length) return '';

    const cards = candidates.map(d => {
      const bg = d.img ? '<div class="fb-card-bg" style="background-image:url(\'' + d.img + '\')"></div>' : '';
      return '<div class="fb-card" onclick="EmptyState.applyDest()">'
        + bg
        + '<div class="fb-card-inner">'
          + '<div class="fb-city">' + d.city + '</div>'
          + '<div class="fb-country">' + d.country + '</div>'
          + '<div class="fb-price">' + Currency.format(d.price * passengers) + ' total</div>'
          + '<div class="fb-reason">' + d.tags[0] + ' · ' + d.desc.split('—')[0].trim() + '</div>'
        + '</div></div>';
    }).join('');

    return '<div class="fallback-section">'
      + '<div class="fallback-lbl">🌍 Destinos no seu budget (sem filtro de clima)</div>'
      + '<div class="fallback-cards">' + cards + '</div>'
      + '<div class="fallback-action">'
        + '<button class="btn-fallback" onclick="Search.clearFilters(); App.runSearch()">Ver todos os destinos no meu budget →</button>'
      + '</div>'
    + '</div>';
  }

  // ── Public: build full empty state HTML ──────────────────────────
  function build() {
    const budget       = Currency.getBudgetBRL();
    const passengers   = parseInt(document.getElementById('pessoas').value) || 1;
    const climaFilter  = AppState.get('climaFilter');
    const tipoFilters  = AppState.get('tipoFilters');
    const cia          = AppState.get('airlineFilter');
    const hasFilters   = climaFilter || tipoFilters.length || cia;

    const destType = document.getElementById('destType').value;
    let pool = [];
    if (destType !== 'internacional') pool = pool.concat(DESTS.nacional);
    if (destType !== 'nacional')      pool = pool.concat(DESTS.internacional);

    const subtitle = hasFilters
      ? 'Seu budget de ' + Currency.format(budget) + ' para ' + passengers + ' pessoa' + (passengers > 1 ? 's' : '') + ' é válido — os filtros reduziram demais as opções.'
      : 'O budget de ' + Currency.format(budget) + ' para ' + passengers + ' pessoa' + (passengers > 1 ? 's' : '') + ' não cobre nenhum destino. Veja alternativas abaixo.';

    return '<div class="no-results">'
      + '<div style="font-size:2rem;margin-bottom:10px">🔍</div>'
      + '<div class="no-results-title">Nenhum destino encontrado</div>'
      + '<div class="no-results-sub">' + subtitle + '</div>'
      + _buildQuaseLa(pool, budget, passengers, climaFilter, tipoFilters)
      + _buildDatasProximas(pool, budget, passengers, climaFilter, tipoFilters)
      + _buildSemFiltros(pool, budget, passengers, hasFilters, cia)
    + '</div>';
  }

  // ── Public: action handlers ──────────────────────────────────────
  function applyBudget(newTotal) {
    const curr  = AppState.get('currency');
    const value = curr === 'USD' ? Math.ceil(newTotal / 5.7 / 10) * 10
                : curr === 'EUR' ? Math.ceil(newTotal / 6.1 / 10) * 10
                : Math.ceil(newTotal / 100) * 100;
    const input = document.getElementById('budget');
    input.value = curr === 'BRL' ? value.toLocaleString('pt-BR') : value.toLocaleString('en-US');
    AppState.set('budget', value);
    App.runSearch();
  }

  function applyDates(idaStr, voltaStr) {
    const ida = new Date(idaStr + 'T12:00'); ida.setHours(0,0,0,0);
    AppState.set('idaDate', ida);
    if (voltaStr) {
      const volta = new Date(voltaStr + 'T12:00'); volta.setHours(0,0,0,0);
      AppState.set('voltaDate', volta);
    } else {
      AppState.set('voltaDate', null);
    }
    Calendar.updateUI();
    App.runSearch();
  }

  function applyDest() {
    Search.clearFilters();
    App.runSearch();
  }

  return { build, applyBudget, applyDates, applyDest };
})();

// Expose to global scope
window.EmptyState = EmptyState;
