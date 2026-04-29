/**
 * modules/cards.js — Destination cards and detail panel
 * Depends on: state.js, modules/currency.js, modules/weather.js
 */

const Cards = (() => {

  function tTag(tag) {
    const key = 'tag.' + tag.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const val = I18n.t(key);
    return (val && val !== key) ? val : tag;
  }

  const _IATA = {
    'Gol': 'G3', 'Azul': 'AD', 'Latam': 'LA', 'TAP': 'TP',
    'American': 'AA', 'Copa Airlines': 'CM', 'Avianca': 'AV',
    'Aerolíneas Arg.': 'AR', 'Sky Airline': 'H2', 'Aeromexico': 'AM',
    'ITA Airways': 'AZ', 'Iberia': 'IB',
  };

  function airlineLogo(airline) {
    const code = _IATA[airline];
    if (!code) return '';
    return '<img class="airline-logo" src="https://pics.avs.io/100/30/' + code + '.png"'
      + ' alt="' + airline + '" onerror="this.style.display=\'none\'">';
  }

  // ── Render card grid ─────────────────────────────────────────────
  function render() {
    const results    = AppState.get('results');
    const passengers = parseInt(document.getElementById('pessoas').value) || 1;
    const selectedIdx= AppState.get('selectedIdx');
    const comboFlight= document.getElementById('mesmaCia').checked;
    const ciaFilter  = document.getElementById('ciaP').value;

    if (!results.length) {
      document.getElementById('dgrid').innerHTML = EmptyState.build();
      return;
    }

    // Float selected card to top
    let ordered = [...results];
    if (selectedIdx !== null && selectedIdx < results.length) {
      const sel = ordered.splice(selectedIdx, 1)[0];
      ordered.unshift(sel);
    }

    document.getElementById('dgrid').innerHTML = ordered.map((d, i) => {
      const origIdx = results.indexOf(d);
      const cias    = ciaFilter && d.airlines.includes(ciaFilter)
        ? [ciaFilter, ...d.airlines.filter(a => a !== ciaFilter)]
        : d.airlines;
      const ciaLbl  = comboFlight
        ? cias[0] + ' · ida e volta'
        : cias[0] + (cias[1] ? ' / ' + cias[1] : '');

      const isBest  = i === 0 && selectedIdx === null;
      const isSel   = selectedIdx !== null && results[selectedIdx] === d;
      const isCmp   = (typeof Compare !== 'undefined') && Compare.isSelected(d.city);
      const bg      = d.img ? '<div class="dc-bg" style="background-image:url(\'' + d.img + '\')"></div>' : '';
      const tags    = d.tags.map(t => '<span class="dc-tag">' + tTag(t) + '</span>').join('');
      const cmpBtn  = '<button class="cmp-toggle' + (isCmp ? ' cmp-on' : '') + '" data-idx="' + origIdx + '">'
        + (isCmp ? '✓ ' + I18n.t('cmp.added') : '+ ' + I18n.t('cmp.add'))
        + '</button>';

      return '<div class="dc' + (isBest ? ' feat' : '') + (isSel ? ' dc-selected' : '') + (isCmp ? ' dc-cmp' : '') + '"'
        + ' data-idx="' + origIdx + '">'
        + bg
        + cmpBtn
        + '<div class="dc-inner">'
          + '<div>'
            + '<div class="dc-badge"><span class="bdot"></span>' + (isBest ? I18n.t('nossa.sug') : tTag(d.tags[0])) + '</div>'
            + '<div class="dc-city">' + d.city + '</div>'
            + '<div class="dc-country">' + d.country + ' · ⭐ ' + d.rating + '</div>'
          + '</div>'
          + '<div>'
            + '<div class="dc-bot">'
              + '<div>'
                + '<div class="dc-pm">' + Currency.format(d.price * passengers) + ' <span style="font-size:.62rem;color:var(--mut)">' + passengers + ' pax</span></div>'
                + '<div class="dc-ps">' + Currency.format(d.price) + '/pessoa</div>'
              + '</div>'
              + '<div class="dc-tags">' + tags + '</div>'
            + '</div>'
            + '<div class="dc-cia">✈ ' + ciaLbl + '</div>'
          + '</div>'
        + '</div>'
      + '</div>';
    }).join('');
  }

  // ── Show detail panel ────────────────────────────────────────────
  function showDetail(idx) {
    const results    = AppState.get('results');
    const d          = results[idx];
    const passengers = parseInt(document.getElementById('pessoas').value) || 1;
    const comboFlight= document.getElementById('mesmaCia').checked;
    const ciaFilter  = document.getElementById('ciaP').value;
    const soIda      = AppState.get('onewayOnly');
    const ida        = AppState.get('idaDate');
    const volta      = AppState.get('voltaDate');

    const fmtD = v => v ? v.toLocaleDateString('pt-BR', { day:'2-digit', month:'short' }) : '—';
    const cias = ciaFilter && d.airlines.includes(ciaFilter)
      ? [ciaFilter, ...d.airlines.filter(a => a !== ciaFilter)]
      : d.airlines;

    const flightRows = cias.slice(0, 3).map((a, i) => {
      const mult   = [1, 1.07, 0.96][i] || 1;
      const t      = d.times[i] || d.times[0];
      const retInfo= comboFlight ? ' · volta inclusa' : '';
      return '<div class="fr">'
        + '<div class="fa">' + airlineLogo(a) + a + retInfo + '</div>'
        + '<div class="ftm">' + t + '</div>'
        + '<div class="fp">' + Currency.format(Math.round(d.price * mult * passengers)) + ' <span style="font-size:.65rem;opacity:.7">' + passengers + 'px</span></div>'
      + '</div>';
    }).join('');

    // Update state and re-render cards so selected floats up
    AppState.set('selectedIdx', idx);
    const isCmp = (typeof Compare !== 'undefined') && Compare.isSelected(d.city);
    render();

    // Build panel
    document.getElementById('detP').innerHTML =
      '<div class="dp">'
      + '<div class="dp-head">'
        + '<div style="display:flex;align-items:baseline;gap:.625rem;flex-wrap:wrap;">'
        + '<div class="dp-city">' + d.city + '</div>'
        + '<div class="dp-ctry">' + d.country + ' &nbsp;·&nbsp; ⭐ ' + d.rating + '</div>'
        + '</div>'
        + '<button class="xbtn" onclick="Cards.closeDetail()">✕ Fechar</button>'
      + '</div>'
      + '<p class="dp-desc">' + d.desc + '</p>'
      + '<div class="dp-stats">'
        + '<div class="dst dp-total-stat">'
          + '<div class="dsl">Total da viagem (' + passengers + ' pessoas)</div>'
          + '<div class="dsv dp-total-val">' + Currency.format(d.price * passengers) + '</div>'
          + '<div class="dsl" style="margin-top:3px">' + Currency.format(d.price) + ' por pessoa</div>'
        + '</div>'
        + '<div class="dst"><div class="dsl">Ida</div><div class="dsv">' + fmtD(ida) + '</div></div>'
        + (function() {
            if (!volta) {
              const sug = new Date(ida); sug.setDate(sug.getDate() + 7);
              return '<div class="dst"><div class="dsl">Volta</div>'
                + '<div class="dsv" style="color:var(--accl);opacity:.75;font-size:.8rem">' + fmtD(sug) + '</div>'
                + '<div class="dsl" style="font-size:.55rem;opacity:.5">sugestão +7d</div></div>';
            }
            return '<div class="dst"><div class="dsl">Volta</div><div class="dsv">' + fmtD(volta) + '</div></div>';
          })()
        + '<div class="dst"><div class="dsl">Cia Aérea</div><div class="dsv" style="font-size:.82rem">' + cias[0] + '</div></div>'
      + '</div>'
      + '<div class="ft-ttl" style="margin-bottom:10px">' + I18n.t('detail.climate') + '</div>'
      + '<div id="wxSlot"><div class="wx-loading">⟳ Carregando clima...</div></div>'
      + '<div class="ft-ttl" style="margin-top:16px" id="ftTtlSlot">Opções estimadas — preços totais (' + passengers + ' pessoas)</div>'
      + '<div id="ftSlot">' + flightRows + '</div>'
      + '<div class="dp-disclaimer">' + I18n.t('detail.disclaimer') + '</div>'
      + '<div class="dp-cta">'
        + '<button class="btn-book" onclick="Cards.goBook(\'' + d.city + '\',\'' + cias[0] + '\')">' + I18n.t('detail.book') + ' ' + cias[0] + ' →</button>'
        + '<button class="btn-o btn-cmp' + (isCmp ? ' cmp-on' : '') + '" onclick="Compare.toggleByIdx(' + idx + ');Cards.showDetail(' + idx + ')">'
          + (isCmp ? '✓ ' + I18n.t('cmp.added') : I18n.t('cmp.add'))
        + '</button>'
      + '</div>'
    + '</div>';

    document.getElementById('detP').scrollIntoView({ behavior:'smooth', block:'nearest' });

    // Load weather and live flights async — never blocks UI
    Weather.inject(d.city);
    _injectLiveFlights(d, passengers);
  }

  function closeDetail() {
    AppState.set('selectedIdx', null);
    document.getElementById('detP').innerHTML = '';
    render();
  }

  function goBook(city, airline) {
    const ida   = AppState.get('idaDate');
    let   volta = AppState.get('voltaDate');
    if (!volta && ida) { volta = new Date(ida); volta.setDate(volta.getDate() + 7); }
    const iataStr  = AppState.get('originIata');
    const idaStr   = ida   ? ida.toISOString().split('T')[0]   : '';
    const voltaStr = volta ? volta.toISOString().split('T')[0] : '';
    const q = encodeURIComponent('voos ' + iataStr + ' ' + city + ' ' + idaStr + (voltaStr ? ' volta ' + voltaStr : ''));
    window.open('https://www.google.com/travel/flights?q=' + q, '_blank');
  }

  // ── Inject live flight options into open detail panel ────────────
  async function _injectLiveFlights(d, passengers) {
    const originIata = AppState.get('originIata');
    const idaDate    = AppState.get('idaDate');
    const voltaDate  = AppState.get('voltaDate');
    if (!idaDate) return;

    const departDate = idaDate.toISOString().split('T')[0];
    const returnDate = voltaDate ? voltaDate.toISOString().split('T')[0] : null;

    const liveFlights = await Flights.getDetailFlights(
      originIata, d.iata, departDate, returnDate, passengers
    );
    if (!liveFlights || !liveFlights.length) return;

    // Replace estimated flight rows with live ones
    const ftSlot = document.getElementById('ftSlot');
    if (!ftSlot) return;

    ftSlot.innerHTML = liveFlights.map(f => {
      const stops   = f.stops === 0 ? 'Direto' : f.stops + ' parada' + (f.stops > 1 ? 's' : '');
      const bookUrl = f.deepLink || ('https://www.google.com/travel/flights?q=' +
        encodeURIComponent('voos ' + originIata + ' ' + d.iata + ' ' + departDate));
      const onclk = 'window.open(' + JSON.stringify(bookUrl) + ',\'_blank\')';
      return '<div class="fr">'
        + '<div class="fa">' + f.airline + ' <span style="font-size:.65rem;opacity:.6">' + stops + ' · ' + f.duration + '</span></div>'
        + '<div class="ftm">' + f.time + '</div>'
        + '<div class="fp" style="cursor:pointer" onclick="' + onclk + '">'
          + Currency.format(f.price * passengers) + ' →'
        + '</div>'
      + '</div>';
    }).join('');

    // Update the title to show live prices
    const ftTtl = document.getElementById('ftTtlSlot');
    if (ftTtl) ftTtl.textContent = '✅ Voos disponíveis — preços ao vivo (' + passengers + ' pax)';
  }

  return { render, showDetail, closeDetail, goBook };
})();

// Expose to global scope for inline onclick handlers
window.Cards = Cards;

// Safety: if Cards.showDetail is called before modules are ready, queue it
window._cardQueue = [];
const _origShow = Cards.showDetail.bind(Cards);
Cards.showDetail = function(idx) {
  if (AppState && AppState.get('results') && AppState.get('results').length) {
    _origShow(idx);
  }
};
