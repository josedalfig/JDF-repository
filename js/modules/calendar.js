/**
 * modules/calendar.js — Custom date picker
 * Depends on: state.js
 *
 * Manages: open/close, month navigation, day selection,
 * range highlighting, "somente ida" toggle.
 */

const Calendar = (() => {
  const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const DAYS   = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

  // ── Open / Close ────────────────────────────────────────────────
  function open(e) {
    const target = e.target.closest('.df-half');
    if (!target) return;
    if (AppState.get('onewayOnly') && target === document.getElementById('dfVolta')) return;

    let mode = (target === document.getElementById('dfIda')) ? 'ida' : 'volta';
    if (mode === 'volta' && !AppState.get('idaDate')) mode = 'ida';

    AppState.set('calMode', mode);
    const refDate = AppState.get('idaDate') || new Date();
    AppState.set('calViewDate', new Date(refDate.getFullYear(), refDate.getMonth(), 1));

    render();
    _positionPopup();
    document.getElementById('calOverlay').classList.add('open');
    AppState.set('calOpen', true);
  }

  function close() {
    document.getElementById('calOverlay').classList.remove('open');
    AppState.set('calOpen', false);
  }

  function navigate(dir) {
    const cur = AppState.get('calViewDate');
    AppState.set('calViewDate', new Date(cur.getFullYear(), cur.getMonth() + dir, 1));
    render();
  }

  // ── Render ──────────────────────────────────────────────────────
  function render() {
    const vd   = AppState.get('calViewDate');
    const y    = vd.getFullYear();
    const m    = vd.getMonth();
    const ida  = AppState.get('idaDate');
    const volta= AppState.get('voltaDate');

    document.getElementById('calLabel').textContent = MONTHS[m] + ' ' + y;

    const today       = new Date(); today.setHours(0,0,0,0);
    const firstDay    = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    let html = '';
    DAYS.forEach(d => { html += '<div class="cal-dow">' + d + '</div>'; });

    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(y, m, d); dt.setHours(0,0,0,0);
      let cls = 'cal-day';
      if (dt < today) cls += ' disabled';
      if (ida   && dt.getTime() === ida.getTime())   cls += ' selected-start';
      if (volta && dt.getTime() === volta.getTime()) cls += ' selected-end';
      if (ida && volta && dt > ida && dt < volta)    cls += ' in-range';
      if (dt.getTime() === today.getTime())          cls += ' today';
      const colStart = (d === 1 && firstDay > 0) ? ' style="grid-column-start:' + (firstDay + 1) + '"' : '';
      html += '<div class="' + cls + '"' + colStart + ' onclick="Calendar.pickDay(' + y + ',' + m + ',' + d + ')">' + d + '</div>';
    }

    document.getElementById('calGrid').innerHTML = html;
    document.getElementById('calHint').textContent =
      AppState.get('calMode') === 'ida'
        ? 'Selecione a data de ida'
        : 'Agora selecione a data de volta (opcional)';
  }

  function pickDay(y, m, d) {
    const dt = new Date(y, m, d); dt.setHours(0,0,0,0);
    const mode = AppState.get('calMode');

    if (mode === 'ida') {
      AppState.set('idaDate', dt);
      const volta = AppState.get('voltaDate');
      if (volta && volta <= dt) AppState.set('voltaDate', null);
      AppState.set('calMode', 'volta');
      render();
      updateUI();
    } else {
      const ida = AppState.get('idaDate');
      if (ida && dt <= ida) return; // can't pick volta before ida
      AppState.set('voltaDate', dt);
      updateUI();
      close();
    }
  }

  // ── UI helpers ──────────────────────────────────────────────────
  function updateUI() {
    const ida   = AppState.get('idaDate');
    const volta = AppState.get('voltaDate');
    const fmtEl = (id, date, placeholder) => {
      const el = document.getElementById(id);
      if (date) {
        el.textContent = date.toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' });
        el.classList.remove('placeholder');
      } else {
        el.textContent = placeholder;
        el.classList.add('placeholder');
      }
    };
    fmtEl('dfIdaVal',   ida,   'Selecione');
    fmtEl('dfVoltaVal', volta, AppState.get('onewayOnly') ? 'Somente ida' : 'Opcional');

    const clr = document.getElementById('dfClear');
    if (clr) clr.style.display = volta ? 'block' : 'none';
  }

  function clearVolta(e) {
    e.stopPropagation();
    AppState.set('voltaDate', null);
    updateUI();
  }

  function toggleOneway() {
    const checked = document.getElementById('soIda').checked;
    AppState.set('onewayOnly', checked);
    const dfVolta = document.getElementById('dfVolta');
    if (checked) {
      AppState.set('voltaDate', null);
      dfVolta.style.opacity = '.4';
      dfVolta.style.pointerEvents = 'none';
    } else {
      dfVolta.style.opacity = '';
      dfVolta.style.pointerEvents = '';
    }
    updateUI();
  }

  // ── Private helpers ─────────────────────────────────────────────
  function _positionPopup() {
    const rect  = document.getElementById('dateFields').getBoundingClientRect();
    const popup = document.getElementById('calPopup');
    const popH  = 360;
    const top   = (rect.bottom + 4 + popH > window.innerHeight)
      ? Math.max(8, rect.top - popH - 4)
      : rect.bottom + 4;
    popup.style.top  = top + 'px';
    popup.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - 308)) + 'px';
  }

  // Public API
  return { open, close, navigate, render, pickDay, updateUI, clearVolta, toggleOneway };
})();

// Expose to global scope
window.Calendar = Calendar;
