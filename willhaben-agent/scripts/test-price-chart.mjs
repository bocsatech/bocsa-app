import { parsePriceChartText } from '../src/price-chart.mjs';

const csv = `marke;modell;baujahr;km;wert
Skoda;Superb;2019;85000;18500
VW;Passat;2018;92000;17200`;

const chart = parsePriceChartText(csv, 'test.csv');
if (chart.rowCount !== 2) throw new Error('row count');
if (chart.rows[0].wertEur !== 18500) throw new Error('wert parse');
console.log('price-chart ok');
