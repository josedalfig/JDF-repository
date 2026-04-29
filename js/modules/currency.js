/**
 * modules/currency.js — Currency formatting and conversion
 * Depends on: state.js
 */

const Currency = (() => {
  // Exchange rates (updated manually until a rates API is integrated)
  const RATES = { BRL: 1, USD: 5.7, EUR: 6.1 };

  function toBRL(amount, currency) {
    return amount * (RATES[currency] || 1);
  }

  function fromBRL(brl, currency) {
    return brl / (RATES[currency] || 1);
  }

  function format(brl) {
    const currency = AppState.get('currency');
    if (currency === 'USD') return 'US$ ' + Math.round(fromBRL(brl, 'USD')).toLocaleString('en-US');
    if (currency === 'EUR') return '€ '   + Math.round(fromBRL(brl, 'EUR')).toLocaleString('de-DE');
    return 'R$ ' + brl.toLocaleString('pt-BR');
  }

  function parseBudgetInput(rawStr) {
    // Remove all non-numeric chars and return number
    return parseFloat(rawStr.replace(/\D/g, '')) || 0;
  }

  function formatBudgetInput(input) {
    const currency = AppState.get('currency');
    const raw = input.value.replace(/\D/g, '');
    if (!raw) { input.value = ''; return; }
    const num = parseInt(raw);
    input.value = (currency === 'BRL')
      ? num.toLocaleString('pt-BR')
      : num.toLocaleString('en-US');
  }

  function onCurrencyChange() {
    const currency = document.getElementById('moeda').value;
    AppState.set('currency', currency);
    const placeholders = { BRL: '15.000', USD: '2,500', EUR: '2.300' };
    const input = document.getElementById('budget');
    input.placeholder = placeholders[currency];
    input.value = '';
    AppState.set('budget', 0);
  }

  function getBudgetBRL() {
    const raw  = parseBudgetInput(document.getElementById('budget').value);
    const curr = AppState.get('currency');
    return toBRL(raw, curr);
  }

  return { format, formatBudgetInput, onCurrencyChange, getBudgetBRL, parseBudgetInput };
})();

// Expose to global scope
window.Currency = Currency;
