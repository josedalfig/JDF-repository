/**
 * modules/share.js — Share via WhatsApp, email, and URL params
 * Depends on: state.js, modules/currency.js
 *
 * URL params encode the full search state so recipients open
 * the app with the form pre-filled (no backend required).
 */

const Share = (() => {

  // ── Build shareable URL ──────────────────────────────────────────
  function buildURL() {
    const params = new URLSearchParams();
    const orig   = document.getElementById('origem').value;
    const budget = document.getElementById('budget').value.replace(/\D/g, '');
    const moeda  = AppState.get('currency');
    const pax    = document.getElementById('pessoas').value;
    const dest   = document.getElementById('destType').value;
    const soIda  = AppState.get('onewayOnly');
    const ida    = AppState.get('idaDate');
    const volta  = AppState.get('voltaDate');

    if (orig)   params.set('o',    orig);
    if (budget) params.set('b',    budget);
    params.set('m',    moeda);
    params.set('p',    pax);
    params.set('dt',   dest);
    if (ida)    params.set('ida',  ida.toISOString().split('T')[0]);
    if (!soIda && volta) params.set('volta', volta.toISOString().split('T')[0]);
    if (soIda)  params.set('si',   '1');

    return location.origin + location.pathname + '?' + params.toString();
  }

  // ── Open share modal ─────────────────────────────────────────────
  function open() {
    const url        = buildURL();
    const passengers = document.getElementById('pessoas').value;
    const budget     = document.getElementById('budget').value;
    const moeda      = AppState.get('currency');
    const orig       = document.getElementById('origem').value || 'minha cidade';
    const disclaimer = '\\n\\n⚠️ Preços sujeitos a alteração pelas companhias aéreas.';
    const text       = '✈️ *Viajar sem Destino*\\nSaindo de ' + orig + ' · ' + passengers + ' viajante' + (passengers > 1 ? 's' : '') + ' · ' + moeda + ' ' + budget + '\\n\\nVeja os destinos que encontrei:' + disclaimer + '\\n\\n' + url;

    document.getElementById('shareModal').style.display = 'flex';
    document.getElementById('shareWaLink').href    = 'https://wa.me/?text=' + encodeURIComponent(text);
    document.getElementById('shareEmailLink').href = 'mailto:?subject=Viagem%20-%20Viajar%20sem%20Destino&body=' + encodeURIComponent(text);
    document.getElementById('shareURLInput').value = url;
  }

  function close() {
    document.getElementById('shareModal').style.display = 'none';
  }

  // ── Copy URL ─────────────────────────────────────────────────────
  function copyURL() {
    const input = document.getElementById('shareURLInput');
    navigator.clipboard.writeText(input.value).then(() => {
      const btn = document.getElementById('shareCopyBtn');
      btn.textContent = '✓ Copiado!';
      setTimeout(() => btn.textContent = 'Copiar link', 2000);
    });
  }

  // ── Load params on page open (joint search) ──────────────────────
  function loadFromURL() {
    const params = new URLSearchParams(location.search);
    if (!params.has('o') && !params.has('b')) return; // nothing to load

    if (params.get('o')) document.getElementById('origem').value = params.get('o');

    if (params.get('b')) {
      const m = params.get('m') || 'BRL';
      document.getElementById('moeda').value = m;
      AppState.set('currency', m);
      const n = parseInt(params.get('b'));
      document.getElementById('budget').value = m === 'BRL'
        ? n.toLocaleString('pt-BR')
        : n.toLocaleString('en-US');
    }

    if (params.get('p'))  document.getElementById('pessoas').value    = params.get('p');
    if (params.get('dt')) document.getElementById('destType').value   = params.get('dt');

    if (params.get('ida')) {
      const ida = new Date(params.get('ida') + 'T12:00'); ida.setHours(0,0,0,0);
      AppState.set('idaDate', ida);
    }
    if (params.get('volta')) {
      const volta = new Date(params.get('volta') + 'T12:00'); volta.setHours(0,0,0,0);
      AppState.set('voltaDate', volta);
    }
    if (params.get('si') === '1') {
      document.getElementById('soIda').checked = true;
      Calendar.toggleOneway();
    }

    Calendar.updateUI();
  }

  return { buildURL, open, close, copyURL, loadFromURL };
})();

// Expose to global scope
window.Share = Share;
