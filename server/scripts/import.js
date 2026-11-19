// CLI: npm run import -- fil.csv [--encoding=windows-1252] [--source=scb]
import fs from 'node:fs';
import { ImportService } from '../services/import/import.service.js';
import { csvRecords } from '../services/import/csv-reader.js';
import { jsonRecords } from '../services/import/json-reader.js';
import { CompanyModel } from '../models/company.model.js';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const opt = (n, d) => (args.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || d;
if (!file) {
  console.error('Användning: npm run import -- <fil.csv|fil.json> [--encoding=utf-8|windows-1252] [--source=scb]');
  process.exit(1);
}
const encoding = opt('encoding', 'utf-8');
const source = opt('source', 'scb');
const isJson = /\.(json|ndjson|jsonl)$/i.test(file);
console.log(`Importerar ${file} …`);
const records = isJson ? jsonRecords(fs.readFileSync(file)) : csvRecords(fs.createReadStream(file), encoding);
const t = Date.now();
const stats = await ImportService.importRecords(records, { source });
console.log(`Klart på ${((Date.now() - t) / 1000).toFixed(1)} s:`, stats);
console.log('Totalt i registret:', CompanyModel.total());
