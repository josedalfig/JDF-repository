/**
 * state.js — Centralized application state
 * All modules read/write through AppState.
 * Never import state values directly — always use getters/setters.
 */

const AppState = (() => {
  // ── Private state ──────────────────────────────────────────────
  let _state = {
    // Search form
    originIata:   'POA',
    budget:       0,
    currency:     'BRL',
    passengers:   2,
    destType:     'todos',
    onewayOnly:   false,

    // Dates
    idaDate:      null,   // Date object
    voltaDate:    null,   // Date object | null

    // Filters (step 2)
    climaFilter:  null,   // single string | null
    tipoFilters:  [],     // string[]
    airlineFilter:'',
    comboFlight:  false,

    // Results
    results:      [],
    selectedIdx:  null,

    // Calendar UI
    calMode:      'ida',  // 'ida' | 'volta'
    calViewDate:  new Date(),
    calOpen:      false,

    // Autocomplete UI
    acHighlight:  -1,

    // Map
    mapInstance:  null,
    mapMarkers:   [],

    // Sort
    sortMode:     'preco', // 'preco' | 'sugestao' | 'todos'
  };

  // ── Public API ─────────────────────────────────────────────────
  return {
    get: (key)        => _state[key],
    set: (key, val)   => { _state[key] = val; },
    update: (partial) => { Object.assign(_state, partial); },
    getAll: ()        => ({ ..._state }),

    // Convenience getters used across multiple modules
    getBudgetBRL() {
      const v = _state.budget;
      if (_state.currency === 'USD') return v * 5.7;
      if (_state.currency === 'EUR') return v * 6.1;
      return v;
    },

    resetFilters() {
      _state.climaFilter   = null;
      _state.tipoFilters   = [];
      _state.airlineFilter = '';
      _state.comboFlight   = false;
    },

    resetSearch() {
      _state.results     = [];
      _state.selectedIdx = null;
      _state.sortMode    = 'preco';
    },
  };
})();
