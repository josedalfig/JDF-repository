/**
 * modules/deals.js — Homepage infinite-scroll deals carousel
 * Shows curated destination deals; clicking pre-fills the search form.
 */

const Deals = (() => {

  // ── Curated deals ────────────────────────────────────────────────
  const DEALS = [
    { city: 'Buenos Aires', countryKey: 'country.argentina', flag: '🇦🇷', tag: 'Cultura',     price: 1490, budget: 2000, iata: 'GRU', days: 7,  img: 'img/buenosaires.jpg' },
    { city: 'Lisboa',       countryKey: 'country.portugal',  flag: '🇵🇹', tag: 'Europa',      price: 3200, budget: 4500, iata: 'GRU', days: 10, img: 'img/lisboa.jpg'      },
    { city: 'Santiago',     countryKey: 'country.chile',     flag: '🇨🇱', tag: 'Aventura',    price: 1100, budget: 1800, iata: 'GRU', days: 5,  img: 'img/santiago.jpg'    },
    { city: 'Cancún',       countryKey: 'country.mexico',    flag: '🇲🇽', tag: 'Praia',       price: 2800, budget: 4000, iata: 'GRU', days: 7,  img: 'img/cancun.jpg'      },
    { city: 'Roma',         countryKey: 'country.italia',    flag: '🇮🇹', tag: 'História',    price: 3600, budget: 5000, iata: 'GRU', days: 10, img: 'img/roma.jpg'        },
    { city: 'Miami',        countryKey: 'country.eua',       flag: '🇺🇸', tag: 'Compras',     price: 2400, budget: 3500, iata: 'GRU', days: 6,  img: 'img/miami.jpg'       },
    { city: 'Barcelona',    countryKey: 'country.espanha',   flag: '🇪🇸', tag: 'Gastronomia', price: 3400, budget: 4800, iata: 'GRU', days: 9,  img: 'img/barcelona.jpg'   },
    { city: 'Bogotá',       countryKey: 'country.colombia',  flag: '🇨🇴', tag: 'Cultura',     price: 1800, budget: 2500, iata: 'GRU', days: 6,  img: 'img/bogota.jpg'      },
  ];

  // ── Locale map for date formatting ───────────────────────────────
  const _LOCALES = { pt: 'pt-BR', en: 'en-US', es: 'es-ES' };

  // ── Format date using current language locale ────────────────────
  function _fmtShort(d) {
    const locale = _LOCALES[I18n.getLang()] || 'pt-BR';
    return d.toLocaleDateString(locale, { day: '2-digit', month: 'short' }).replace('.', '');
  }

  // ── Compute departure / return for this deal ─────────────────────
  function _dealDates(deal) {
    const ida   = new Date(); ida.setDate(ida.getDate() + 30);
    const volta = new Date(ida); volta.setDate(volta.getDate() + deal.days);
    return { ida, volta };
  }

  // ── Build a single card element ──────────────────────────────────
  function _buildCard(d) {
    const { ida, volta } = _dealDates(d);
    const dateStr = _fmtShort(ida) + ' → ' + _fmtShort(volta);

    const div = document.createElement('div');
    div.className = 'deal-card';
    if (d.img) div.style.backgroundImage = 'url(' + d.img + ')';

    // Translate tag using existing tag.* keys
    const tagKey = 'tag.' + d.tag.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const tagLabel = I18n.t(tagKey) !== tagKey ? I18n.t(tagKey) : d.tag;

    div.innerHTML =
        '<div class="deal-overlay"></div>'
      + '<div class="deal-content">'
        + '<div class="deal-top">'
          + '<div class="deal-tag">' + tagLabel + '</div>'
        + '</div>'
        + '<div class="deal-mid">'
          + '<div class="deal-city">' + d.city + '</div>'
          + '<div class="deal-country">' + d.flag + ' ' + I18n.t(d.countryKey) + '</div>'
        + '</div>'
        + '<div class="deal-bot">'
          + '<div class="deal-dates">' + dateStr + '</div>'
          + '<div class="deal-price">' + I18n.t('dest.from') + ' <strong>' + Currency.format(d.price) + '</strong></div>'
        + '</div>'
      + '</div>';

    div.addEventListener('click', () => select(d));
    return div;
  }

  // ── Render carousel into #dealsTrack ────────────────────────────
  function render() {
    const track = document.getElementById('dealsTrack');
    if (!track) return;

    const fragment = document.createDocumentFragment();
    // Duplicate for seamless infinite loop
    [...DEALS, ...DEALS].forEach(d => fragment.appendChild(_buildCard(d)));
    track.innerHTML = '';
    track.appendChild(fragment);

    _initDrag(track);
  }

  // ── Pre-fill form + trigger search, then open the selected card ──
  async function select(deal) {
    const { ida, volta } = _dealDates(deal);

    // Budget — format as pt-BR so Currency.getBudgetBRL() reads it correctly from DOM
    AppState.set('currency', 'BRL');
    const moedaSel = document.getElementById('moeda');
    if (moedaSel) moedaSel.value = 'BRL';
    const budgetInput = document.getElementById('budget');
    if (budgetInput) budgetInput.value = deal.budget.toLocaleString('pt-BR');

    // Passengers
    const pessoasInput = document.getElementById('pessoas');
    if (pessoasInput) pessoasInput.value = 1;

    // Dates — update AppState and the visible date fields
    AppState.set('idaDate',   ida);
    AppState.set('voltaDate', volta);
    const fmtBR = d => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    const dfIdaVal   = document.getElementById('dfIdaVal');
    const dfVoltaVal = document.getElementById('dfVoltaVal');
    if (dfIdaVal)   { dfIdaVal.textContent   = fmtBR(ida);   dfIdaVal.classList.remove('placeholder'); }
    if (dfVoltaVal) { dfVoltaVal.textContent = fmtBR(volta); dfVoltaVal.classList.remove('placeholder'); }

    // Run search and wait for it to complete
    window.scrollTo({ top: 0, behavior: 'smooth' });
    await App.startSearch();

    // Auto-open the card matching this deal's destination
    const results = AppState.get('results');
    const idx = results.findIndex(d => d.city === deal.city);
    if (idx !== -1) Cards.showDetail(idx);
  }

  // ── Touch drag (pause + swipe) ───────────────────────────────────
  function _initDrag(track) {
    let startX = 0, isDragging = false, startScroll = 0;
    const vp = track.parentElement;

    track.addEventListener('mouseenter', () => track.style.animationPlayState = 'paused');
    track.addEventListener('mouseleave', () => track.style.animationPlayState = 'running');

    vp.addEventListener('touchstart', e => {
      startX      = e.touches[0].clientX;
      startScroll = vp.scrollLeft;
      isDragging  = true;
      track.style.animationPlayState = 'paused';
    }, { passive: true });

    vp.addEventListener('touchmove', e => {
      if (!isDragging) return;
      vp.scrollLeft = startScroll - (e.touches[0].clientX - startX);
    }, { passive: true });

    vp.addEventListener('touchend', () => {
      isDragging = false;
      track.style.animationPlayState = 'running';
    });
  }

  return { render, select };
})();

window.Deals = Deals;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Deals.render());
} else {
  Deals.render();
}

// Re-render carousel when language changes
document.addEventListener('langchange', () => Deals.render());
