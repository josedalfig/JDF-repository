/**
 * app.js — Application entry point and orchestrator
 *
 * Responsibilities:
 *   - Initialize all modules
 *   - Wire DOM event listeners (no inline onclick in HTML)
 *   - Navigation between steps
 *   - Coordinate cross-module actions (search → render → map)
 */

const App = (() => {

  // ── Step navigation ──────────────────────────────────────────────
  function _setDots(n) {
    const d1 = document.getElementById('dot1');
    const d2 = document.getElementById('dot2');
    const d3 = document.getElementById('dot3');
    if (d3) d3.style.display = 'none'; // 2-step flow

    [d1, d2].forEach(d => d.classList.remove('active','done'));
    if (n === 1) { d1.classList.add('active'); }
    else         { d1.classList.add('done'); d2.classList.add('active'); }
  }

  function goStep(n) {
    document.getElementById('step1').style.display = n === 1 ? 'block' : 'none';
    document.getElementById('step2').style.display = n === 2 ? 'block' : 'none';
    // Hide hero copy when showing results — show discovery bar instead
    const heroEls = document.querySelectorAll('.eyebrow, h1, .subtitle, .progress');
    const discBar = document.getElementById('discBar');
    heroEls.forEach(el => el.style.display = n === 2 ? 'none' : '');
    if (discBar) discBar.style.display = n === 2 ? 'flex' : 'none';
    // Hide deals carousel on results, show on search
    const dealsSection = document.getElementById('dealsSection');
    if (dealsSection) dealsSection.style.display = n === 2 ? 'none' : '';
    _setDots(n);

    if (n === 1) {
      document.getElementById('detP').innerHTML = '';
      MapView.reset();
      AppState.resetSearch();
      // Reset flex UI
      const flexCheck = document.getElementById('flexDates');
      if (flexCheck) { flexCheck.checked = false; }
      document.getElementById('flexSelector').classList.remove('visible');
      document.querySelectorAll('.flex-btn').forEach(b => b.classList.remove('active'));
      AppState.set('flexDays', null);
    }
  }

  // ── Search flow ──────────────────────────────────────────────────
  async function runSearch() {
    await Search.run();
    Search.updateMeta();
    _updateFilterClearBtn();
    // Reset sort dropdown
    const sel = document.getElementById('sortSel');
    if (sel) sel.value = 'preco-asc';
    Cards.render();
  }

  async function startSearch() {
    const ida    = AppState.get('idaDate');
    const budget = Currency.getBudgetBRL();

    if (!ida) {
      alert('Selecione a data de ida para continuar.');
      return;
    }
    if (budget < 200) {
      alert('Informe um budget válido (mínimo R$ 200).');
      return;
    }

    // Clear filters from previous search
    Search.clearFilters();
    document.querySelectorAll('#climaChips .chip.active, #tipoChips .chip.active')
      .forEach(c => c.classList.remove('active'));

    goStep(2);
    await runSearch();
  }

  function surpresa() {
    const values = [2000, 3500, 5000, 7000, 10000, 15000];
    const budget = values[Math.floor(Math.random() * values.length)];
    const pax    = Math.floor(Math.random() * 3) + 1;

    document.getElementById('budget').value = budget.toLocaleString('pt-BR');
    document.getElementById('pessoas').value = pax;
    AppState.set('budget', budget);
    AppState.set('currency', 'BRL');
    document.getElementById('moeda').value = 'BRL';

    startSearch();
  }

  // ── Filter bar helpers ───────────────────────────────────────────
  function _updateFilterClearBtn() {
    const hasFilters = AppState.get('climaFilter') ||
                       AppState.get('tipoFilters').length ||
                       AppState.get('airlineFilter');
    document.getElementById('fbarClear').style.display = hasFilters ? 'block' : 'none';
  }

  async function clearFilters() {
    Search.clearFilters();
    _updateFilterClearBtn();
    await runSearch();
  }

  // ── Event wiring ─────────────────────────────────────────────────
  function _wireEvents() {
    // Step 1 — CTA buttons
    document.getElementById('btnBuscar').addEventListener('click', startSearch);
    document.getElementById('btnSurpresa').addEventListener('click', surpresa);

    // Logo — go home
    document.querySelector('.logo').addEventListener('click', () => goStep(1));

    // Currency
    document.getElementById('moeda').addEventListener('change', Currency.onCurrencyChange);
    document.getElementById('budget').addEventListener('input', e => Currency.formatBudgetInput(e.target));

    // Date fields
    document.getElementById('dateFields').addEventListener('click', Calendar.open);
    document.getElementById('dfClear').addEventListener('click', Calendar.clearVolta);
    document.getElementById('soIda').addEventListener('change', Calendar.toggleOneway);
    document.querySelector('.cal-backdrop').addEventListener('click', Calendar.close);
    document.getElementById('calPrev').addEventListener('click', () => Calendar.navigate(-1));
    document.getElementById('calNext').addEventListener('click', () => Calendar.navigate(1));

    // Autocomplete
    const origem = document.getElementById('origem');
    origem.addEventListener('input',   Autocomplete.onInput);
    origem.addEventListener('keydown', Autocomplete.onKeyDown);
    origem.addEventListener('focus',   Autocomplete.onInput);
    document.getElementById('geoBtn').addEventListener('click', Autocomplete.detectLocation);

    // Chips — clima (single select)
    document.querySelectorAll('#climaChips .chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const wasActive = chip.classList.contains('active');
        document.querySelectorAll('#climaChips .chip').forEach(c => c.classList.remove('active'));
        if (!wasActive) {
          chip.classList.add('active');
          AppState.set('climaFilter', chip.dataset.val);
        } else {
          AppState.set('climaFilter', null);
        }
        if (AppState.get('results').length || document.getElementById('step2').style.display !== 'none') {
          runSearch();
        }
      });
    });

    // Chips — tipo (multi select)
    document.querySelectorAll('#tipoChips .chip').forEach(chip => {
      chip.addEventListener('click', () => {
        chip.classList.toggle('active');
        const active = Array.from(document.querySelectorAll('#tipoChips .chip.active')).map(c => c.dataset.val);
        AppState.set('tipoFilters', active);
        if (document.getElementById('step2').style.display !== 'none') runSearch();
      });
    });

    // Flex dates checkbox
    document.getElementById('flexDates').addEventListener('change', e => {
      const on = e.target.checked;
      document.getElementById('flexSelector').classList.toggle('visible', on);
      if (!on) {
        AppState.set('flexDays', null);
        document.querySelectorAll('.flex-btn').forEach(b => b.classList.remove('active'));
        if (document.getElementById('step2').style.display !== 'none') runSearch();
      }
    });

    // Flex day buttons
    document.querySelectorAll('.flex-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.flex-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        AppState.set('flexDays', parseInt(btn.dataset.days));
        if (document.getElementById('step2').style.display !== 'none') runSearch();
      });
    });

    // Airline filter
    document.getElementById('ciaP').addEventListener('change', e => {
      AppState.set('airlineFilter', e.target.value);
      if (document.getElementById('step2').style.display !== 'none') runSearch();
    });
    document.getElementById('mesmaCia').addEventListener('change', () => {
      if (document.getElementById('step2').style.display !== 'none') Cards.render();
    });

    // Card click — event delegation (more reliable than inline onclick)
    document.getElementById('dgrid').addEventListener('click', e => {
      // Compare toggle button
      const cmpBtn = e.target.closest('.cmp-toggle');
      if (cmpBtn) {
        Compare.toggleByIdx(parseInt(cmpBtn.dataset.idx));
        return;
      }
      // Open detail panel
      const card = e.target.closest('.dc[data-idx]');
      if (card) Cards.showDetail(parseInt(card.dataset.idx));
    });

    // Sort dropdown
    document.getElementById('sortSel').addEventListener('change', e => {
      Search.setSort(e.target.value);
      Cards.render();
    });

    // View toggle
    document.getElementById('vbL').addEventListener('click', () => MapView.setView('list'));
    document.getElementById('vbM').addEventListener('click', () => MapView.setView('map'));

    // Filter clear
    document.getElementById('fbarClear').addEventListener('click', clearFilters);

    // New search button
    document.getElementById('btnNovaSearch').addEventListener('click', () => goStep(1));

    // PWA dismiss
    const pwaDismiss = document.getElementById('pwaDismiss');
    if (pwaDismiss) pwaDismiss.addEventListener('click', () => {
      document.getElementById('pwaBanner').style.display = 'none';
    });

    // Share
    document.getElementById('btnShare').addEventListener('click', Share.open);
    document.getElementById('shareModalClose').addEventListener('click', Share.close);
    document.getElementById('shareCopyBtn').addEventListener('click', Share.copyURL);
    document.getElementById('shareModal').addEventListener('click', e => {
      if (e.target === document.getElementById('shareModal')) Share.close();
    });
  }

  // ── Init ─────────────────────────────────────────────────────────
  function init() {
    _wireEvents();
    Autocomplete.init();
    Share.loadFromURL();
    Calendar.updateUI();
    I18n.init();

    // Re-render dynamic content on language change
    document.addEventListener('langchange', () => {
      const results = AppState.get('results');
      if (results && results.length) {
        Search.updateMeta();
        Cards.render();
      }
    });
  }

  return { init, goStep, runSearch, startSearch, surpresa, clearFilters };
})();

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', App.init);

// Expose to global scope
window.App = App;
