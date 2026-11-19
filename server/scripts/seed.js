// Skapar DEMODATA (påhittade företag) så att appen går att prova direkt.
// Riktiga uppgifter importeras via Inställningar → Dataimport eller `npm run import`.
import { ImportService } from '../services/import/import.service.js';
import { CompanyModel } from '../models/company.model.js';

let seed = 20261118;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));

const REGIONS = [
  ['Stockholms län', ['Stockholm', 'Solna', 'Sundbyberg', 'Huddinge', 'Nacka', 'Södertälje', 'Täby']],
  ['Östergötlands län', ['Linköping', 'Norrköping', 'Motala', 'Mjölby']],
  ['Västra Götalands län', ['Göteborg', 'Borås', 'Trollhättan', 'Skövde', 'Uddevalla']],
  ['Skåne län', ['Malmö', 'Helsingborg', 'Lund', 'Kristianstad']],
  ['Uppsala län', ['Uppsala', 'Enköping']],
  ['Jönköpings län', ['Jönköping', 'Värnamo', 'Nässjö']],
  ['Örebro län', ['Örebro', 'Karlskoga']],
  ['Västmanlands län', ['Västerås', 'Köping']],
  ['Dalarnas län', ['Falun', 'Borlänge']],
  ['Gävleborgs län', ['Gävle', 'Sandviken']],
  ['Västerbottens län', ['Umeå', 'Skellefteå']],
  ['Norrbottens län', ['Luleå', 'Piteå']],
  ['Hallands län', ['Halmstad', 'Varberg']],
  ['Kalmar län', ['Kalmar', 'Västervik']],
  ['Kronobergs län', ['Växjö']],
  ['Värmlands län', ['Karlstad']],
  ['Södermanlands län', ['Eskilstuna', 'Nyköping']],
  ['Västernorrlands län', ['Sundsvall', 'Örnsköldsvik']],
  ['Jämtlands län', ['Östersund']],
  ['Blekinge län', ['Karlskrona']],
  ['Gotlands län', ['Gotland']],
];
const SNI = [
  ['41200', 'Byggande av bostadshus och andra byggnader', 'Bygg'],
  ['43210', 'Elinstallation', 'El'],
  ['43220', 'VVS-installation', 'VVS'],
  ['43341', 'Målningsarbeten', 'Måleri'],
  ['62010', 'Dataprogrammering', 'Data'],
  ['62020', 'Datakonsultverksamhet', 'IT'],
  ['69201', 'Redovisningsbyråer', 'Redovisning'],
  ['56100', 'Restaurangverksamhet', 'Kök'],
  ['47190', 'Detaljhandel med brett sortiment', 'Handel'],
  ['49410', 'Vägtransport av gods', 'Transport'],
  ['81210', 'Fastighetsskötsel', 'Fastighetsservice'],
  ['74100', 'Specialiserad designverksamhet', 'Design'],
  ['86230', 'Tandläkarverksamhet', 'Tandvård'],
  ['68201', 'Uthyrning av egna bostäder', 'Fastigheter'],
  ['85591', 'Vuxenutbildning', 'Utbildning'],
  ['96020', 'Hårvård', 'Hår'],
  ['80100', 'Bevakningsverksamhet', 'Säkerhet'],
  ['70220', 'Konsultverksamhet avseende företags organisation', 'Konsult'],
  ['73110', 'Reklambyråer', 'Reklam'],
  ['45200', 'Underhåll och reparation av motorfordon', 'Bilverkstad'],
];
const PRE = ['Nordic', 'Norrlands', 'Svea', 'Östra', 'Lilla', 'Gröna', 'Blå', 'Kvarn', 'Vind', 'Strand', 'Berg', 'Skog', 'Fjord', 'Lund', 'Ek', 'Björk', 'Solbacka', 'Havs', 'Klipp', 'Ljus'];
const SIZES = ['0', '0', '1-4', '1-4', '1-4', '5-9', '5-9', '10-19', '20-49', '50-99', '100-199', '200-499'];
const FORMS = ['Aktiebolag', 'Aktiebolag', 'Aktiebolag', 'Aktiebolag', 'Enskild firma', 'Handelsbolag', 'Ekonomisk förening'];
const slug = (s) => s.toLowerCase().replace(/å|ä/g, 'a').replace(/ö/g, 'o').replace(/[^a-z0-9]/g, '');

const out = [];
for (let i = 1; i <= 420; i++) {
  const [county, cities] = pick(REGIONS);
  const city = pick(cities);
  const [sni, sniText, word] = pick(SNI);
  const form = pick(FORMS);
  const base = `${pick(PRE)} ${word}`;
  const name = form === 'Aktiebolag' ? `${base} AB` : form === 'Handelsbolag' ? `${base} HB` : form === 'Ekonomisk förening' ? `${base} ek för` : `${base}`;
  const digits = String(i).padStart(4, '0');
  out.push({
    orgnr: `99${int(1000, 9999)}-${digits}`,
    namn: name,
    juridisk_form: form,
    snikod: sni,
    snitext: sniText,
    lan: county,
    kommun: city,
    gatuadress: `${pick(['Storgatan', 'Industrivägen', 'Kungsgatan', 'Hamngatan', 'Skolgatan', 'Fabriksvägen'])} ${int(1, 99)}`,
    postnr: `${int(100, 999)} ${int(10, 99)}`,
    postort: city,
    storleksklass: pick(SIZES),
    telefon: rnd() < 0.78 ? `070-174 ${String(int(0, 99)).padStart(2, '0')} ${String(int(0, 99)).padStart(2, '0')}` : '',
    epost: rnd() < 0.6 ? `info@${slug(base)}${i}.example.se` : '',
    webbadress: rnd() < 0.4 ? `https://www.${slug(base)}${i}.example.se` : '',
    status: rnd() < 0.95 ? 'Aktiv' : 'Avslutad',
    registreringsdatum: `${int(1990, 2026)}-${String(int(1, 11)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}`,
  });
}
async function* gen() { for (const r of out) yield r; }
const stats = await ImportService.importRecords(gen(), { source: 'demo' });
console.log('Demodata skapad:', stats, 'Totalt:', CompanyModel.total());
