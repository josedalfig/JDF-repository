/**
 * modules/compare.js — Side-by-side destination comparison (up to 3)
 * Depends on: state.js, currency.js, i18n.js, cards.js
 */

const Compare = (() => {

  let _list = []; // destination objects selected for comparison (max 3)

  // ── Toggle a destination by its results index ────────────────────
  function toggleByIdx(idx) {
    const results = AppState.get('results');
    const dest    = results[idx];
    if (!dest) return;

    const pos = _list.findIndex(d => d.city === dest.city);
    if (pos !== -1) {
      _list.splice(pos, 1);
    } else {
      if (_list.length >= 3) return; // max 3
      _list.push(dest);
    }
    _renderBar();
    Cards.render();
  }

  function isSelected(city) {
    return _list.some(d => d.city === city);
  }

  // ── Clear all selected ───────────────────────────────────────────
  function clear() {
    _list = [];
    _renderBar();
    Cards.render();
  }

  // ── Floating comparison bar ──────────────────────────────────────
  function _renderBar() {
    const bar = document.getElementById('cmpBar');
    if (!bar) return;

    if (_list.length === 0) {
      bar.classList.remove('visible');
      return;
    }

    const names      = _list.map(d => d.city).join(' · ');
    const canCompare = _list.length >= 2;

    bar.innerHTML =
        '<span class="cmp-bar-label">' + I18n.t('cmp.comparing') + ':</span>'
      + '<span class="cmp-bar-cities">' + names + '</span>'
      + (canCompare
          ? '<button class="cmp-bar-btn" id="cmpOpenBtn">' + I18n.t('cmp.compare') + ' →</button>'
          : '')
      + '<button class="cmp-bar-clear" id="cmpClearBtn" title="' + I18n.t('detail.close') + '">✕</button>';

    if (canCompare) {
      document.getElementById('cmpOpenBtn').addEventListener('click', openModal);
    }
    document.getElementById('cmpClearBtn').addEventListener('click', clear);

    bar.classList.add('visible');
  }

  // ── Comparison modal ─────────────────────────────────────────────
  function openModal() {
    if (_list.length < 2) return;
    const passengers = parseInt(document.getElementById('pessoas').value) || 1;
    const modal      = document.getElementById('cmpModal');
    if (!modal) return;

    function tTag(tag) {
      const key = 'tag.' + tag.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const val = I18n.t(key);
      return (val && val !== key) ? val : tag;
    }

    const cols = _list.map(d => {
      const tags = d.tags.slice(0, 3)
        .map(t => '<span class="cmp-tag">' + tTag(t) + '</span>')
        .join('');

      return '<div class="cmp-col">'
        + (d.img
            ? '<div class="cmp-col-img" style="background-image:url(\'' + d.img + '\')"></div>'
            : '<div class="cmp-col-img cmp-col-img--none"></div>')
        + '<div class="cmp-col-city">' + d.city + '</div>'
        + '<div class="cmp-col-ctry">' + d.country + ' &nbsp;·&nbsp; ⭐ ' + d.rating + '</div>'
        + '<div class="cmp-sep"></div>'
        + '<div class="cmp-row">'
            + '<span class="cmp-lbl">' + I18n.t('cmp.total') + '</span>'
            + '<span class="cmp-val cmp-hl">' + Currency.format(d.price * passengers) + '</span>'
          + '</div>'
        + '<div class="cmp-row">'
            + '<span class="cmp-lbl">' + I18n.t('cmp.perpax') + '</span>'
            + '<span class="cmp-val">' + Currency.format(d.price) + '</span>'
          + '</div>'
        + '<div class="cmp-row">'
            + '<span class="cmp-lbl">' + I18n.t('cmp.airline') + '</span>'
            + '<span class="cmp-val">' + (d.airlines && d.airlines[0] ? d.airlines[0] : '—') + '</span>'
          + '</div>'
        + '<div class="cmp-tags">' + tags + '</div>'
        + '<button class="cmp-select-btn" data-city="' + d.city + '">'
            + I18n.t('cmp.select') + ' ' + d.city + ' →'
          + '</button>'
      + '</div>';
    }).join('');

    modal.querySelector('.cmp-modal-box').innerHTML =
        '<div class="cmp-modal-head">'
          + '<div class="cmp-modal-title">' + I18n.t('cmp.title') + '</div>'
          + '<button class="cmp-modal-close" id="cmpModalClose">✕</button>'
        + '</div>'
        + '<div class="cmp-cols">' + cols + '</div>';

    document.getElementById('cmpModalClose').addEventListener('click', closeModal);
    modal.querySelectorAll('.cmp-select-btn').forEach(btn => {
      btn.addEventListener('click', () => selectDest(btn.dataset.city));
    });

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    const modal = document.getElementById('cmpModal');
    if (modal) modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  // ── Select a destination from the modal ─────────────────────────
  function selectDest(city) {
    closeModal();
    const results = AppState.get('results');
    const idx     = results.findIndex(d => d.city === city);
    if (idx !== -1) Cards.showDetail(idx);
  }

  // ── Close modal on backdrop click ───────────────────────────────
  document.addEventListener('click', e => {
    const modal = document.getElementById('cmpModal');
    if (modal && e.target === modal) closeModal();
  });

  // ── Re-render bar text on language change ────────────────────────
  document.addEventListener('langchange', () => {
    if (_list.length > 0) _renderBar();
  });

  return { toggleByIdx, isSelected, clear, openModal, closeModal, selectDest };
})();

window.Compare = Compare;
