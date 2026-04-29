/**
 * modules/i18n.js — Internationalization (PT / EN / ES)
 * Usage: I18n.t('key') returns translated string for current language.
 * Language stored in localStorage, detected from browser on first visit.
 */

const I18n = (() => {

  // ── Translations ────────────────────────────────────────────────
  const STRINGS = {
    pt: {
      // Nav
      'nav.how':        'Como funciona',
      'nav.destinations':'Destinos',
      'nav.enter':      'Entrar',

      // Hero
      'hero.eyebrow':   'Descubra onde ir',
      'hero.h1':        'Você decide quando.',
      'hero.h1.em':     'A gente descobre onde.',
      'hero.subtitle':  'Informe seu budget, datas e quantas pessoas viajam.',

      // Step 1
      'step1.label':    'O essencial',
      'step1.origin':   'Saindo de',
      'step1.origin.ph':'Cidade ou sigla (ex: GRU)',
      'step1.people':   'Pessoas',
      'step1.dates':    'Datas',
      'step1.ida':      'Ida',
      'step1.volta':    'Volta',
      'step1.optional': 'Opcional',
      'step1.oneway':   'Somente ida — sem data de retorno',
      'step1.budget':   'Budget total',
      'step1.dest':     'Destino',
      'step1.dest.any': 'Qualquer lugar',
      'step1.dest.nat': 'Só Brasil',
      'step1.dest.int': 'Só internacional',
      'step1.search':   'Buscar destinos →',
      'step1.surprise': '✦ Surpresa',

      // Step 2
      'step2.found':    'Encontramos',
      'step2.found2':   'destinos',
      'step2.newSearch':'← Nova busca',
      'step2.orderBy':  'Ordenar por',
      'step2.priceAsc': '↑ Menor preço',
      'step2.priceDesc':'↓ Maior preço',
      'step2.suggest':  '✦ Nossa sugestão',
      'step2.az':       'A → Z',
      'step2.list':     '☰ Lista',
      'step2.map':      '🗺 Mapa',

      // Filters
      'filter.climate': 'Clima',
      'filter.one':     '(um)',
      'filter.airline': 'Cia Aérea',
      'filter.combo':   'Voo combinado',
      'filter.tipo':    'Tipo de viagem',
      'filter.multi':   '(múltiplo)',
      'filter.clear':   '✕ Limpar',
      'filter.any':     'Qualquer',

      // Climate chips
      'clima.calor':    '☀️ Calor',
      'clima.frio':     '❄️ Frio',
      'clima.praia':    '🏖️ Praia',
      'clima.montanha': '⛰️ Serra',
      'clima.temperado':'🍂 Temp.',

      // Tipo chips
      'tipo.gastro':    '🍽️ Gastronomia',
      'tipo.cultura':   '🏛️ Cultura',
      'tipo.aventura':  '🧗 Aventura',
      'tipo.relaxar':   '🧘 Relaxar',
      'tipo.familia':   '👨‍👩‍👧 Família',
      'tipo.romantica': '💑 Romântica',

      // Detail
      'detail.total':   'Total',
      'detail.ida':     'Ida',
      'detail.volta':   'Volta',
      'detail.cia':     'Cia Aérea',
      'detail.oneway':  'Só ida',
      'detail.climate': '🌤️ Clima no destino',
      'detail.now':     'Agora',
      'detail.flights': 'Opções estimadas — preços totais',
      'detail.disclaimer':'⚠️ Preços sujeitos a alteração. Confirme sempre no site da companhia.',
      'detail.book':    'Buscar na',
      'detail.others':  'Ver outros',
      'detail.close':   '✕ Fechar',
      'detail.pess':    'pess.',

      // Weather
      'wx.loading':     '⟳ Carregando clima...',
      'wx.unavail':     '⚠️ Clima indisponível no momento',
      'wx.keyact':      '🔑 Chave de clima em ativação',
      'wx.humidity':    'umidade',
      'wx.forecast':    'Previsão',

      // Empty state
      'empty.title':    'Nenhum destino encontrado',
      'empty.budget':   'O budget de',
      'empty.for':      'para',
      'empty.person':   'pessoa',
      'empty.people':   'pessoas',
      'empty.nocover':  'não cobre nenhum destino. Veja alternativas abaixo.',
      'empty.filters':  'é válido — os filtros reduziram demais as opções.',
      'empty.quasela':  '✦ Quase lá — ajuste o budget',
      'empty.click':    'Clique para ajustar budget',
      'empty.dates':    '📅 Datas próximas disponíveis',
      'empty.before':   'dias antes',
      'empty.after':    'dias depois',
      'empty.avail':    'disponíveis',
      'empty.check':    'Verificar disponibilidade',
      'empty.nofilter': '🌍 Destinos no seu budget (sem filtro de clima)',
      'empty.seeall':   'Ver todos os destinos no meu budget →',

      // Share
      'share.title':    'Compartilhar pesquisa',
      'share.sub':      'Envie sua busca — o link abrirá com todos os dados já preenchidos.',
      'share.wa':       'WhatsApp',
      'share.email':    'E-mail',
      'share.copy':     'Copiar link',
      'share.copied':   '✓ Copiado!',
      'share.disc':     'Os preços exibidos são estimativas e podem variar.',
      'share.btn':      '📤 Compartilhar',

      // Stats
      'stats.dest':     'Destinos',
      'stats.cias':     'Companhias',
      'stats.routes':   'Rotas reais',

      // Results eyebrow
      'results.eyebrow':'Descobertas para você',

      // PWA install
      'pwa.install':    '📲 Instalar app',
      'pwa.installed':  'App instalado!',
      'nossa.sug': '✦ Nossa sugestão',
      'tag.cultura': 'Cultura',
      'tag.praia': 'Praia',
      'tag.natureza': 'Natureza',
      'tag.gastronomia': 'Gastronomia',
      'tag.aventura': 'Aventura',
      'tag.relaxar': 'Relaxar',
      'tag.familia': 'Família',
      'tag.romantica': 'Romântica',
      'tag.compras': 'Compras',
      'tag.hub': 'Hub',
      'tag.montanhas': 'Montanhas',
      'tag.verao': 'Verão',
      'tag.calor': 'Calor',
      'tag.frio': 'Frio',
      'meta.travelers': 'viajante',
      'meta.travelerspl': 'viajantes',
      'meta.until': 'até',
      'meta.oneway': 'somente ida',
      'found.pre': 'Encontramos',
      'found.post': 'destinos',
      'pwa.dismiss': 'Fechar',
      'step2.orderBy': 'Ordenar por',
      'step1.select': 'Selecione',
    },

    en: {
      'nav.how':        'How it works',
      'nav.destinations':'Destinations',
      'nav.enter':      'Sign in',
      'hero.eyebrow':   'Discover where to go',
      'hero.h1':        'You decide when.',
      'hero.h1.em':     'We discover where.',
      'hero.subtitle':  'Enter your budget, dates and how many people are traveling.',
      'step1.label':    'The essentials',
      'step1.origin':   'Flying from',
      'step1.origin.ph':'City or code (e.g. GRU)',
      'step1.people':   'Travelers',
      'step1.dates':    'Dates',
      'step1.ida':      'Departure',
      'step1.volta':    'Return',
      'step1.optional': 'Optional',
      'step1.oneway':   'One way — no return date',
      'step1.budget':   'Total budget',
      'step1.dest':     'Destination',
      'step1.dest.any': 'Anywhere',
      'step1.dest.nat': 'Brazil only',
      'step1.dest.int': 'International only',
      'step1.search':   'Search destinations →',
      'step1.surprise': '✦ Surprise me',
      'step2.found':    'We found',
      'step2.found2':   'destinations',
      'step2.newSearch':'← New search',
      'step2.orderBy':  'Sort by',
      'step2.priceAsc': '↑ Lowest price',
      'step2.priceDesc':'↓ Highest price',
      'step2.suggest':  '✦ Our pick',
      'step2.az':       'A → Z',
      'step2.list':     '☰ List',
      'step2.map':      '🗺 Map',
      'filter.climate': 'Climate',
      'filter.one':     '(one)',
      'filter.airline': 'Airline',
      'filter.combo':   'Combined flight',
      'filter.tipo':    'Trip type',
      'filter.multi':   '(multiple)',
      'filter.clear':   '✕ Clear',
      'filter.any':     'Any',
      'clima.calor':    '☀️ Hot',
      'clima.frio':     '❄️ Cold',
      'clima.praia':    '🏖️ Beach',
      'clima.montanha': '⛰️ Mountains',
      'clima.temperado':'🍂 Mild',
      'tipo.gastro':    '🍽️ Gastronomy',
      'tipo.cultura':   '🏛️ Culture',
      'tipo.aventura':  '🧗 Adventure',
      'tipo.relaxar':   '🧘 Relaxation',
      'tipo.familia':   '👨‍👩‍👧 Family',
      'tipo.romantica': '💑 Romantic',
      'detail.total':   'Total',
      'detail.ida':     'Departure',
      'detail.volta':   'Return',
      'detail.cia':     'Airline',
      'detail.oneway':  'One way',
      'detail.climate': '🌤️ Climate at destination',
      'detail.now':     'Now',
      'detail.flights': 'Estimated options — total prices',
      'detail.disclaimer':'⚠️ Prices subject to change. Always confirm on the airline website.',
      'detail.book':    'Search on',
      'detail.others':  'See others',
      'detail.close':   '✕ Close',
      'detail.pess':    'pax',
      'wx.loading':     '⟳ Loading weather...',
      'wx.unavail':     '⚠️ Weather unavailable',
      'wx.keyact':      '🔑 Weather key activating',
      'wx.humidity':    'humidity',
      'wx.forecast':    'Forecast',
      'empty.title':    'No destinations found',
      'empty.budget':   'The budget of',
      'empty.for':      'for',
      'empty.person':   'person',
      'empty.people':   'people',
      'empty.nocover':  "doesn't cover any destination. See alternatives below.",
      'empty.filters':  'is valid — filters narrowed options too much.',
      'empty.quasela':  '✦ Almost there — adjust budget',
      'empty.click':    'Click to adjust budget',
      'empty.dates':    '📅 Nearby dates available',
      'empty.before':   'days before',
      'empty.after':    'days after',
      'empty.avail':    'available',
      'empty.check':    'Check availability',
      'empty.nofilter': '🌍 Destinations within budget (no climate filter)',
      'empty.seeall':   'See all destinations within my budget →',
      'share.title':    'Share search',
      'share.sub':      'Send your search — the link will open with all data pre-filled.',
      'share.wa':       'WhatsApp',
      'share.email':    'Email',
      'share.copy':     'Copy link',
      'share.copied':   '✓ Copied!',
      'share.disc':     'Prices shown are estimates and may vary.',
      'share.btn':      '📤 Share',
      'stats.dest':     'Destinations',
      'stats.cias':     'Airlines',
      'stats.routes':   'Real routes',
      'results.eyebrow':'Discoveries for you',
      'pwa.install':    '📲 Install app',
      'pwa.installed':  'App installed!',
      'nossa.sug': '✦ Our pick',
      'tag.cultura': 'Culture',
      'tag.praia': 'Beach',
      'tag.natureza': 'Nature',
      'tag.gastronomia': 'Gastronomy',
      'tag.aventura': 'Adventure',
      'tag.relaxar': 'Relaxation',
      'tag.familia': 'Family',
      'tag.romantica': 'Romantic',
      'tag.compras': 'Shopping',
      'tag.hub': 'Hub',
      'tag.montanhas': 'Mountains',
      'tag.verao': 'Summer',
      'tag.calor': 'Hot',
      'tag.frio': 'Cold',
      'meta.travelers': 'traveler',
      'meta.travelerspl': 'travelers',
      'meta.until': 'up to',
      'meta.oneway': 'one way',
      'found.pre': 'We found',
      'found.post': 'destinations',
      'pwa.dismiss': 'Close',
      'step2.orderBy': 'Sort by',
      'step1.select': 'Select',
    },

    es: {
      'nav.how':        'Cómo funciona',
      'nav.destinations':'Destinos',
      'nav.enter':      'Entrar',
      'hero.eyebrow':   'Descubre a dónde ir',
      'hero.h1':        'Tú decides cuándo.',
      'hero.h1.em':     'Nosotros descubrimos dónde.',
      'hero.subtitle':  'Ingresa tu presupuesto, fechas y cuántas personas viajan.',
      'step1.label':    'Lo esencial',
      'step1.origin':   'Saliendo de',
      'step1.origin.ph':'Ciudad o código (ej: GRU)',
      'step1.people':   'Viajeros',
      'step1.dates':    'Fechas',
      'step1.ida':      'Ida',
      'step1.volta':    'Vuelta',
      'step1.optional': 'Opcional',
      'step1.oneway':   'Solo ida — sin fecha de regreso',
      'step1.budget':   'Presupuesto total',
      'step1.dest':     'Destino',
      'step1.dest.any': 'Cualquier lugar',
      'step1.dest.nat': 'Solo Brasil',
      'step1.dest.int': 'Solo internacional',
      'step1.search':   'Buscar destinos →',
      'step1.surprise': '✦ Sorpresa',
      'step2.found':    'Encontramos',
      'step2.found2':   'destinos',
      'step2.newSearch':'← Nueva búsqueda',
      'step2.orderBy':  'Ordenar por',
      'step2.priceAsc': '↑ Menor precio',
      'step2.priceDesc':'↓ Mayor precio',
      'step2.suggest':  '✦ Nuestra sugerencia',
      'step2.az':       'A → Z',
      'step2.list':     '☰ Lista',
      'step2.map':      '🗺 Mapa',
      'filter.climate': 'Clima',
      'filter.one':     '(uno)',
      'filter.airline': 'Aerolínea',
      'filter.combo':   'Vuelo combinado',
      'filter.tipo':    'Tipo de viaje',
      'filter.multi':   '(múltiple)',
      'filter.clear':   '✕ Limpiar',
      'filter.any':     'Cualquiera',
      'clima.calor':    '☀️ Calor',
      'clima.frio':     '❄️ Frío',
      'clima.praia':    '🏖️ Playa',
      'clima.montanha': '⛰️ Montaña',
      'clima.temperado':'🍂 Templado',
      'tipo.gastro':    '🍽️ Gastronomía',
      'tipo.cultura':   '🏛️ Cultura',
      'tipo.aventura':  '🧗 Aventura',
      'tipo.relaxar':   '🧘 Relajación',
      'tipo.familia':   '👨‍👩‍👧 Familia',
      'tipo.romantica': '💑 Romántico',
      'detail.total':   'Total',
      'detail.ida':     'Ida',
      'detail.volta':   'Vuelta',
      'detail.cia':     'Aerolínea',
      'detail.oneway':  'Solo ida',
      'detail.climate': '🌤️ Clima en el destino',
      'detail.now':     'Ahora',
      'detail.flights': 'Opciones estimadas — precios totales',
      'detail.disclaimer':'⚠️ Precios sujetos a cambios. Confirma siempre en el sitio de la aerolínea.',
      'detail.book':    'Buscar en',
      'detail.others':  'Ver otros',
      'detail.close':   '✕ Cerrar',
      'detail.pess':    'pax',
      'wx.loading':     '⟳ Cargando clima...',
      'wx.unavail':     '⚠️ Clima no disponible',
      'wx.keyact':      '🔑 Clave de clima activándose',
      'wx.humidity':    'humedad',
      'wx.forecast':    'Pronóstico',
      'empty.title':    'Ningún destino encontrado',
      'empty.budget':   'El presupuesto de',
      'empty.for':      'para',
      'empty.person':   'persona',
      'empty.people':   'personas',
      'empty.nocover':  'no cubre ningún destino. Ve alternativas abajo.',
      'empty.filters':  'es válido — los filtros redujeron demasiado las opciones.',
      'empty.quasela':  '✦ Casi — ajusta el presupuesto',
      'empty.click':    'Clic para ajustar presupuesto',
      'empty.dates':    '📅 Fechas cercanas disponibles',
      'empty.before':   'días antes',
      'empty.after':    'días después',
      'empty.avail':    'disponibles',
      'empty.check':    'Verificar disponibilidad',
      'empty.nofilter': '🌍 Destinos dentro del presupuesto (sin filtro de clima)',
      'empty.seeall':   'Ver todos los destinos en mi presupuesto →',
      'share.title':    'Compartir búsqueda',
      'share.sub':      'Envía tu búsqueda — el enlace se abrirá con todos los datos prellenados.',
      'share.wa':       'WhatsApp',
      'share.email':    'Correo',
      'share.copy':     'Copiar enlace',
      'share.copied':   '✓ ¡Copiado!',
      'share.disc':     'Los precios mostrados son estimaciones y pueden variar.',
      'share.btn':      '📤 Compartir',
      'stats.dest':     'Destinos',
      'stats.cias':     'Aerolíneas',
      'stats.routes':   'Rutas reales',
      'results.eyebrow':'Descubrimientos para ti',
      'pwa.install':    '📲 Instalar app',
      'pwa.installed':  '¡App instalada!',
      'nossa.sug': '✦ Nuestra sugerencia',
      'tag.cultura': 'Cultura',
      'tag.praia': 'Playa',
      'tag.natureza': 'Naturaleza',
      'tag.gastronomia': 'Gastronomía',
      'tag.aventura': 'Aventura',
      'tag.relaxar': 'Relajación',
      'tag.familia': 'Familia',
      'tag.romantica': 'Romántico',
      'tag.compras': 'Compras',
      'tag.hub': 'Hub',
      'tag.montanhas': 'Montañas',
      'tag.verao': 'Verano',
      'tag.calor': 'Calor',
      'tag.frio': 'Frío',
      'meta.travelers': 'viajero',
      'meta.travelerspl': 'viajeros',
      'meta.until': 'hasta',
      'meta.oneway': 'solo ida',
      'found.pre': 'Encontramos',
      'found.post': 'destinos',
      'pwa.dismiss': 'Cerrar',
      'step2.orderBy': 'Ordenar por',
      'step1.select': 'Seleccionar',
    },
  };

  // ── State ────────────────────────────────────────────────────────
  let _lang = localStorage.getItem('vsd-lang')
    || navigator.language.slice(0, 2)
    || 'pt';

  if (!STRINGS[_lang]) _lang = 'pt';

  // ── Public API ───────────────────────────────────────────────────
  function t(key) {
    return (STRINGS[_lang] && STRINGS[_lang][key]) || STRINGS['pt'][key] || key;
  }

  function setLang(lang) {
    if (!STRINGS[lang]) return;
    _lang = lang;
    localStorage.setItem('vsd-lang', lang);
    applyAll();
    // Notify app to re-render dynamic content
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
  }

  function getLang() { return _lang; }

  // ── Apply translations to DOM ────────────────────────────────────
  // Elements with data-i18n="key" get their textContent replaced
  // Elements with data-i18n-ph="key" get their placeholder replaced
  function applyAll() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      el.textContent = t(key);
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      el.placeholder = t(el.dataset.i18nPh);
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      el.innerHTML = t(el.dataset.i18nHtml);
    });
    // Update html lang attribute
    document.documentElement.lang = _lang === 'pt' ? 'pt-BR' : _lang;
  }

  // ── Init ─────────────────────────────────────────────────────────
  function init() {
    applyAll();
  }

  return { t, setLang, getLang, init, applyAll };
})();

// Expose to global scope
window.I18n = I18n;
