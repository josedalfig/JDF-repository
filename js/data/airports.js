/**
 * data/airports.js — Static airport database
 * Used by autocomplete and geolocation nearest-airport lookup.
 */

const AIRPORTS = [
  // ── Brasil ──
  { iata:'GRU', city:'São Paulo',       airport:'Guarulhos',                  state:'SP', lat:-23.4356, lng:-46.4731 },
  { iata:'CGH', city:'São Paulo',       airport:'Congonhas',                  state:'SP', lat:-23.6261, lng:-46.6564 },
  { iata:'GIG', city:'Rio de Janeiro',  airport:'Galeão',                     state:'RJ', lat:-22.8099, lng:-43.2505 },
  { iata:'SDU', city:'Rio de Janeiro',  airport:'Santos Dumont',              state:'RJ', lat:-22.9105, lng:-43.1631 },
  { iata:'POA', city:'Porto Alegre',    airport:'Salgado Filho',              state:'RS', lat:-29.9944, lng:-51.1714 },
  { iata:'BSB', city:'Brasília',        airport:'JK Internacional',           state:'DF', lat:-15.8711, lng:-47.9186 },
  { iata:'SSA', city:'Salvador',        airport:'Luís Eduardo Magalhães',     state:'BA', lat:-12.9086, lng:-38.3225 },
  { iata:'FOR', city:'Fortaleza',       airport:'Pinto Martins',              state:'CE', lat:-3.7762,  lng:-38.5326 },
  { iata:'REC', city:'Recife',          airport:'Guararapes',                 state:'PE', lat:-8.1265,  lng:-34.9231 },
  { iata:'MAO', city:'Manaus',          airport:'Eduardo Gomes',              state:'AM', lat:-3.0386,  lng:-60.0497 },
  { iata:'CWB', city:'Curitiba',        airport:'Afonso Pena',                state:'PR', lat:-25.5285, lng:-49.1758 },
  { iata:'FLN', city:'Florianópolis',   airport:'Hercílio Luz',               state:'SC', lat:-27.6703, lng:-48.5525 },
  { iata:'IGU', city:'Foz do Iguaçu',  airport:'Cataratas',                  state:'PR', lat:-25.5962, lng:-54.4872 },
  { iata:'NAT', city:'Natal',           airport:'São Gonçalo do Amarante',    state:'RN', lat:-5.9114,  lng:-35.2477 },
  { iata:'MCZ', city:'Maceió',          airport:'Zumbi dos Palmares',         state:'AL', lat:-9.5109,  lng:-35.7917 },
  { iata:'VIX', city:'Vitória',         airport:'Eurico Salles',              state:'ES', lat:-20.2581, lng:-40.2863 },
  { iata:'BEL', city:'Belém',           airport:'Val-de-Cans',                state:'PA', lat:-1.3792,  lng:-48.4762 },
  // ── América do Sul ──
  { iata:'EZE', city:'Buenos Aires',    airport:'Ministro Pistarini',         state:'Argentina', lat:-34.8222, lng:-58.5358 },
  { iata:'AEP', city:'Buenos Aires',    airport:'Jorge Newbery',              state:'Argentina', lat:-34.5592, lng:-58.4156 },
  { iata:'SCL', city:'Santiago',        airport:'Arturo Merino Benítez',      state:'Chile',     lat:-33.3930, lng:-70.7858 },
  { iata:'MVD', city:'Montevidéu',      airport:'Carrasco',                   state:'Uruguai',   lat:-34.8384, lng:-56.0308 },
  { iata:'BOG', city:'Bogotá',          airport:'El Dorado',                  state:'Colômbia',  lat:4.7016,   lng:-74.1469 },
  { iata:'LIM', city:'Lima',            airport:'Jorge Chávez',               state:'Peru',      lat:-12.0219, lng:-77.1143 },
  // ── América do Norte / Caribe ──
  { iata:'MIA', city:'Miami',           airport:'Miami Internacional',        state:'EUA',    lat:25.7959,  lng:-80.2870 },
  { iata:'JFK', city:'Nova York',       airport:'John F. Kennedy',            state:'EUA',    lat:40.6413,  lng:-73.7781 },
  { iata:'MCO', city:'Orlando',         airport:'Orlando Internacional',      state:'EUA',    lat:28.4312,  lng:-81.3081 },
  { iata:'CUN', city:'Cancún',          airport:'Cancún Internacional',       state:'México', lat:21.0365,  lng:-86.8771 },
  { iata:'PTY', city:'Cidade do Panamá',airport:'Tocumen',                    state:'Panamá', lat:9.0714,   lng:-79.5197 },
  // ── Europa ──
  { iata:'LIS', city:'Lisboa',          airport:'Humberto Delgado',           state:'Portugal',     lat:38.7813, lng:-9.1359 },
  { iata:'OPO', city:'Porto',           airport:'Francisco Sá Carneiro',      state:'Portugal',     lat:41.2481, lng:-8.6814 },
  { iata:'MAD', city:'Madri',           airport:'Barajas',                    state:'Espanha',      lat:40.4719, lng:-3.5626 },
  { iata:'BCN', city:'Barcelona',       airport:'El Prat',                    state:'Espanha',      lat:41.2971, lng:2.0785  },
  { iata:'CDG', city:'Paris',           airport:'Charles de Gaulle',          state:'França',       lat:49.0097, lng:2.5479  },
  { iata:'LHR', city:'Londres',         airport:'Heathrow',                   state:'Reino Unido',  lat:51.4700, lng:-0.4543 },
  { iata:'FCO', city:'Roma',            airport:'Fiumicino',                  state:'Itália',       lat:41.8003, lng:12.2389 },
  { iata:'AMS', city:'Amsterdã',        airport:'Schiphol',                   state:'Holanda',      lat:52.3086, lng:4.7639  },
  { iata:'ATH', city:'Atenas',          airport:'Eleftherios Venizelos',      state:'Grécia',       lat:37.9364, lng:23.9445 },
];
