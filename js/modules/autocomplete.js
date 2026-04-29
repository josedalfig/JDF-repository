/**
 * modules/autocomplete.js — Airport search autocomplete + geolocation
 * Depends on: state.js, data/airports.js
 */

const Autocomplete = (() => {

  // ── Search ──────────────────────────────────────────────────────
  function onInput() {
    const q  = document.getElementById('origem').value.trim().toUpperCase();
    const dd = document.getElementById('acDrop');
    AppState.set('acHighlight', -1);

    if (q.length < 1) { dd.style.display = 'none'; return; }

    const matches = AIRPORTS.filter(a =>
      a.iata.startsWith(q) ||
      a.city.toUpperCase().includes(q) ||
      a.airport.toUpperCase().includes(q) ||
      a.state.toUpperCase().includes(q)
    ).slice(0, 7);

    if (!matches.length) { dd.style.display = 'none'; return; }

    dd.innerHTML = matches.map((a, i) =>
      '<div class="ac-item" data-idx="' + i + '" data-iata="' + a.iata + '" data-city="' + a.city + '"' +
      ' onmousedown="Autocomplete.select(\'' + a.iata + '\',\'' + a.city + '\')">' +
      '<span class="ac-code">' + a.iata + '</span>' +
      '<div><div class="ac-city">' + a.city + (a.state ? ' · ' + a.state : '') + '</div>' +
      '<div class="ac-apt">' + a.airport + '</div></div></div>'
    ).join('');

    dd.style.display = 'block';
  }

  function onKeyDown(e) {
    const dd    = document.getElementById('acDrop');
    const items = dd.querySelectorAll('.ac-item');
    if (!items.length) return;

    let hi = AppState.get('acHighlight');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      hi = Math.min(hi + 1, items.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      hi = Math.max(hi - 1, 0);
    } else if (e.key === 'Enter' && hi >= 0) {
      e.preventDefault();
      const item = items[hi];
      select(item.dataset.iata, item.dataset.city);
      return;
    } else if (e.key === 'Escape') {
      dd.style.display = 'none';
      return;
    }
    AppState.set('acHighlight', hi);
    items.forEach((el, i) => el.classList.toggle('hi', i === hi));
  }

  function select(iata, city) {
    AppState.set('originIata', iata);
    document.getElementById('origem').value = city + ' (' + iata + ')';
    document.getElementById('acDrop').style.display = 'none';
  }

  // ── Geolocation ─────────────────────────────────────────────────
  function detectLocation() {
    const btn = document.getElementById('geoBtn');
    btn.textContent = '⟳';
    btn.classList.add('spin');

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          btn.classList.remove('spin'); btn.textContent = '📍';
          _applyNearest(pos.coords.latitude, pos.coords.longitude, true);
        },
        () => {
          btn.classList.remove('spin'); btn.textContent = '📍';
          _fetchByIP();
        },
        { timeout: 7000 }
      );
    } else {
      btn.classList.remove('spin'); btn.textContent = '📍';
      _fetchByIP();
    }
  }

  async function _fetchByIP() {
    try {
      const data = await fetch('https://ipapi.co/json/').then(r => r.json());
      if (data.latitude) _applyNearest(data.latitude, data.longitude, false);
      else select('POA', 'Porto Alegre');
    } catch {
      select('POA', 'Porto Alegre');
    }
  }

  function _applyNearest(lat, lng, precise) {
    let best = AIRPORTS[0], minD = Infinity;
    for (const a of AIRPORTS) {
      const d = Math.hypot(a.lat - lat, a.lng - lng);
      if (d < minD) { minD = d; best = a; }
    }
    select(best.iata, best.city);
    const hint = document.getElementById('geoHint');
    hint.textContent = '📍 ' + (precise ? 'GPS' : 'Aprox.') + ': ' + best.city + ' (' + best.iata + ')';
    hint.style.display = 'block';
  }

  // ── Init ─────────────────────────────────────────────────────────
  function init() {
    // Detect location silently on load
    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then(d => {
        if (d.latitude) _applyNearest(d.latitude, d.longitude, false);
        else select('POA', 'Porto Alegre');
      })
      .catch(() => select('POA', 'Porto Alegre'));

    // Close dropdown on outside click
    document.addEventListener('click', e => {
      if (!document.getElementById('acWrap').contains(e.target))
        document.getElementById('acDrop').style.display = 'none';
    });
  }

  return { onInput, onKeyDown, select, detectLocation, init };
})();

// Expose to global scope
window.Autocomplete = Autocomplete;
