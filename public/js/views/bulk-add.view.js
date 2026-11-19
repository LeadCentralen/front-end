import { el } from '../utils/dom.js';
import { nf } from '../utils/format.js';

// Dialog: lägg alla träffar i det aktuella filtret i leadtavlan i ett svep, som en namngiven lista.
// h = { preview(), add(group, limit) -> { added } }, suggestion = förslag på listnamn
export async function openBulkAdd({ suggestion, h }) {
  const body = el('div', null, el('p', { class: 'muted' }, 'Räknar träffar …'));
  const dlg = el('dialog', { class: 'guide', 'aria-labelledby': 'bulk-h' },
    el('div', { class: 'guide-head' }, el('h2', { id: 'bulk-h' }, 'Lägg träffarna i leadtavlan'), el('button', { class: 'btn ghost', 'aria-label': 'Stäng', onclick: () => dlg.close() }, '✕')),
    body);
  dlg.addEventListener('close', () => dlg.remove());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  document.body.append(dlg);
  dlg.showModal();

  let p;
  try { p = await h.preview(); } catch (e) { body.replaceChildren(el('p', { class: 'error' }, e.message)); return; }

  if (p.toAdd === 0) {
    body.replaceChildren(
      el('p', null, p.total === 0 ? 'Inga företag matchar filtret.' : `Alla ${nf(p.total)} träffar ligger redan i leadtavlan.`),
      el('div', { class: 'guide-foot' }, el('button', { class: 'btn primary', onclick: () => dlg.close() }, 'Stäng')));
    return;
  }
  if (p.canAdd === 0) {
    const weekOut = p.weekLeft === 0;
    body.replaceChildren(
      el('p', { class: 'error' }, weekOut ? `Ert paket ${p.plan} tillåter ${nf(p.weekLimit)} nya företag i tavlan per vecka, och den kvoten är använd. Den nollställs på måndag. Uppgradera paketet för mer.` : 'Du har nått dagens gräns för nya leads. Den nollställs vid midnatt.'),
      el('div', { class: 'guide-foot' }, el('button', { class: 'btn primary', onclick: () => dlg.close() }, 'Stäng')));
    return;
  }

  const name = el('input', { type: 'text', maxLength: 60, value: suggestion || '', 'aria-label': 'Namn på listan', placeholder: 'T.ex. Restauranger i Skåne' });
  const count = el('input', { type: 'number', min: 1, max: p.canAdd, value: p.canAdd, 'aria-label': 'Antal företag att lägga till' });
  const err = el('p', { class: 'error', role: 'alert' });
  const go = el('button', { class: 'btn primary', type: 'button', onclick: async () => {
    err.textContent = '';
    const n = Math.max(1, Math.min(p.canAdd, Math.floor(Number(count.value)) || p.canAdd));
    go.disabled = true; go.textContent = 'Lägger till …';
    try {
      const r = await h.add(name.value, n);
      body.replaceChildren(
        el('p', null, el('strong', null, `${nf(r.added)} företag`), ` lades i leadtavlan${r.group ? ` i listan "${r.group}"` : ''}. De ligger i kolumnen Ny.`),
        el('div', { class: 'guide-foot row' },
          el('button', { class: 'btn', onclick: () => dlg.close() }, 'Stanna här'),
          el('a', { class: 'btn primary', href: '#/tavla', onclick: () => dlg.close() }, 'Öppna Leadtavlan')));
    } catch (e) { err.textContent = e.message; go.disabled = false; go.textContent = 'Lägg i tavlan'; }
  } }, 'Lägg i tavlan');

  body.replaceChildren(...[
    el('div', { class: 'stats' },
      el('div', { class: 'stat' }, el('b', null, nf(p.total)), el('span', null, 'träffar i filtret')),
      el('div', { class: 'stat' }, el('b', null, nf(p.inBoard)), el('span', null, 'ligger redan i tavlan')),
      el('div', { class: 'stat' }, el('b', null, nf(p.canAdd)), el('span', null, 'kan läggas till nu'))),
    p.canAdd < p.toAdd ? el('div', { class: 'banner warn spaced-top' },
      p.weekLeft !== null && p.weekLeft < Math.min(p.toAdd, p.maxPerAction, p.left ?? Infinity)
        ? `Ert paket ${p.plan} tillåter ${nf(p.weekLimit)} nya företag per vecka och ${nf(p.weekLeft)} återstår. De ${nf(p.canAdd)} första enligt din sortering läggs till.`
        : p.left !== null && p.left < Math.min(p.toAdd, p.maxPerAction)
        ? `Du kan lägga till ${nf(p.left)} leads till idag (dagsgräns). De ${nf(p.canAdd)} första enligt din sortering läggs till. Resten kan du lägga till imorgon.`
        : `Högst ${nf(p.maxPerAction)} läggs till åt gången. De ${nf(p.canAdd)} första enligt din sortering läggs till. Kör igen för att lägga till fler.`) : null,
    el('div', { class: 'grid-2 spaced-top' },
      el('div', { class: 'field' }, el('label', null, 'Namn på listan'), name),
      el('div', { class: 'field' }, el('label', null, 'Antal att lägga till'), count)),
    el('p', { class: 'muted small' }, 'Telefonnummer och e-post blir synliga när företagen ligger i tavlan. Listnamnet visas på korten, och du kan filtrera tavlan på det. Sorteringen i sökningen avgör vilka som kommer först, till exempel högst omsättning.'),
    err,
    el('div', { class: 'guide-foot row' }, el('button', { class: 'btn ghost', type: 'button', onclick: () => dlg.close() }, 'Avbryt'), go)].filter(Boolean));
}
