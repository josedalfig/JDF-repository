/**
 * data/coordinates.js — Geographic coordinates
 *
 * COORDS        — used by Leaflet map to place destination markers
 * CITY_COORDS   — used by OpenWeatherMap API (lat/lon lookup)
 *
 * Both keyed by city name matching DESTS entries.
 */

const COORDS = {
  'Florianópolis':   [-27.5954, -48.5480],
  'Rio de Janeiro':  [-22.9068, -43.1729],
  'São Paulo':       [-23.5505, -46.6333],
  'Fortaleza':       [-3.7172,  -38.5433],
  'Foz do Iguaçu':   [-25.5478, -54.5882],
  'Salvador':        [-12.9714, -38.5014],
  'Recife':          [-8.0476,  -34.8770],
  'Manaus':          [-3.1190,  -60.0217],
  'Buenos Aires':    [-34.6037, -58.3816],
  'Santiago':        [-33.4489, -70.6693],
  'Montevidéu':      [-34.9011, -56.1645],
  'Cancún':          [21.1619,  -86.8515],
  'Miami':           [25.7617,  -80.1918],
  'Lisboa':          [38.7169,   -9.1399],
  'Roma':            [41.9028,   12.4964],
  'Barcelona':       [41.3851,    2.1734],
  'Bogotá':          [4.7110,   -74.0721],
  'Cidade do Panamá':[8.9936,   -79.5197],
};

// OpenWeatherMap uses the same coordinates
const CITY_COORDS = COORDS;
