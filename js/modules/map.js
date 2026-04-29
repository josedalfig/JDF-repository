/**
 * modules/map.js — Leaflet map integration
 * Depends on: state.js, data/coordinates.js, modules/currency.js, Leaflet (CDN)
 */

const MapView = (() => {

  // ── Toggle list / map view ───────────────────────────────────────
  function setView(mode) {
    const mapEl  = document.getElementById('mapBox');
    const gridEl = document.getElementById('dgrid');
    const btnL   = document.getElementById('vbL');
    const btnM   = document.getElementById('vbM');

    if (mode === 'map') {
      gridEl.style.display = 'none';
      mapEl.style.display  = 'block';
      btnL.classList.remove('active');
      btnM.classList.add('active');
      _init();
    } else {
      mapEl.style.display  = 'none';
      gridEl.style.display = 'grid';
      btnL.classList.add('active');
      btnM.classList.remove('active');
    }
  }

  // ── Init / refresh map ──────────────────────────────────────────
  function _init() {
    let mapInst = AppState.get('mapInstance');
    let mapMks  = AppState.get('mapMarkers');

    if (!mapInst) {
      mapInst = L.map('mapBox', { center:[10,0], zoom:2, minZoom:2, maxZoom:10 });
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        { attribution:'© <a href="https://carto.com/">CARTO</a>', subdomains:'abcd', maxZoom:19 }
      ).addTo(mapInst);
      AppState.set('mapInstance', mapInst);
    } else {
      mapMks.forEach(m => m.remove());
      AppState.set('mapMarkers', []);
      mapMks = [];
    }

    const results    = AppState.get('results');
    const passengers = parseInt(document.getElementById('pessoas').value) || 1;
    if (!results.length) return;

    const bounds  = [];
    const origIata= AppState.get('originIata');
    const orig    = AIRPORTS.find(a => a.iata === origIata);

    // Origin marker
    if (orig) {
      const icon = L.divIcon({ className:'', html:'<div class="od"></div>', iconSize:[9,9], iconAnchor:[4,4] });
      const mk   = L.marker([orig.lat, orig.lng], { icon })
        .bindTooltip('✈ Origem: ' + orig.city)
        .addTo(mapInst);
      mapMks.push(mk);
      bounds.push([orig.lat, orig.lng]);
    }

    // Destination markers
    results.forEach((d, i) => {
      const c = COORDS[d.city];
      if (!c) return;

      const best = (i === 0);
      const icon = L.divIcon({
        className: '',
        html: '<div class="pm' + (best ? ' best' : '') + '">' + (best ? '✦ ' : '') + Currency.format(d.price) + '</div>',
        iconSize: null,
        iconAnchor: [44, 30],
      });

      const popHtml =
        '<div class="pc">' + d.city + '</div>'
        + '<div class="pco">' + d.country + '</div>'
        + '<div class="pp">' + Currency.format(d.price) + '/pax &middot; ' + Currency.format(d.price * passengers) + ' total</div>'
        + '<button class="pb" onclick="MapView.selectFromMap(' + i + ')">Ver detalhes →</button>';

      const mk = L.marker(c, { icon }).addTo(mapInst)
        .bindTooltip(d.city, { permanent:false, direction:'top', offset:[0,-8], className:'map-tooltip' })
        .bindPopup(popHtml, { maxWidth:220 });

      // Flight arc from origin
      if (orig) {
        const arc = L.polyline(
          [[orig.lat, orig.lng], c],
          { color: best ? 'rgba(201,98,47,.55)' : 'rgba(255,255,255,.09)', weight: best ? 2 : 1, dashArray:'5,6' }
        ).addTo(mapInst);
        mapMks.push(arc);
      }

      mapMks.push(mk);
      bounds.push(c);
    });

    AppState.set('mapMarkers', mapMks);

    if (bounds.length > 1) mapInst.fitBounds(bounds, { padding:[40,40] });
    else if (bounds.length === 1) mapInst.setView(bounds[0], 5);
  }

  function selectFromMap(idx) {
    setView('list');
    setTimeout(() => Cards.showDetail(idx), 80);
  }

  // ── Reset (called on new search) ─────────────────────────────────
  function reset() {
    const mapMks = AppState.get('mapMarkers');
    mapMks.forEach(m => m.remove());
    AppState.set('mapMarkers', []);
    document.getElementById('mapBox').style.display  = 'none';
    document.getElementById('dgrid').style.display   = 'grid';
    document.getElementById('vbL').classList.add('active');
    document.getElementById('vbM').classList.remove('active');
  }

  return { setView, selectFromMap, reset };
})();

// Expose to global scope
window.MapView = MapView;
