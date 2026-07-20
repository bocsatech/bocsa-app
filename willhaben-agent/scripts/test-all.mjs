import { parsePriceChart, lookupPrice } from '../src/price-chart.mjs';
import { applyTemplate } from '../src/store.mjs';

const csv = `marke;modell;baujahr;km;wert
Skoda;Superb;2019;85000;18500`;

const chart = parsePriceChart(csv, 't.csv');
if (chart.rowCount !== 1 || chart.rows[0].wertEur !== 18500) {
  throw new Error('price-chart fail');
}

const match = lookupPrice(chart, { marke: 'Skoda', modell: 'Superb', baujahr: '2019', km: 85000 });
if (!match || match.wertEur !== 18500) throw new Error('lookup fail');

const text = applyTemplate('Hallo {partner}, {angebot_eur} €', { partner: 'Max', angebot_eur: '15000' });
if (!text.includes('Max') || !text.includes('15000')) throw new Error('template fail');

console.log('✓ minden teszt OK');
