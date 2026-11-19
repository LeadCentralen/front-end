import { el, clear, option } from '../utils/dom.js';
import { fmtDate, nf } from '../utils/format.js';

export function renderSettingsFrame(root, { tabs, tab }) {
  const body = el('div');
  clear(root).append(
    el('div', { class: 'page-head' }, el('div', null, el('h1', null, 'Inställningar'))),
    el('div', { class: 'tabs', role: 'tablist' }, tabs.map(([id, label]) =>
      el('button', { role: 'tab', 'aria-selected': String(id === tab), onclick: () => { location.hash = '#/installningar/' + id; } }, label))),
    body);
  return body;
}

export function renderAccountTab(box, { user, exportUrl, onChangePassword, onDelete }) {
  const err = el('p', { class: 'error', role: 'alert' });
  const delErr = el('p', { class: 'error', role: 'alert' });
  const cur = el('input', { id: 'p-cur', type: 'password', autocomplete: 'current-password' });
  const nxt = el('input', { id: 'p-new', type: 'password', autocomplete: 'new-password', minLength: 10 });
  const delPw = el('input', { id: 'd-pw', type: 'password', autocomplete: 'current-password' });
  clear(box).append(
    el('div', { class: 'card prose' }, el('h2', null, 'Profil'),
      el('p', null, el('strong', null, user.name), el('br'), user.email, el('br'), user.org_name && el('span', null, user.org_name, el('br')), el('span', { class: 'muted' }, user.role === 'admin' ? 'Plattformsadmin' : user.role === 'owner' ? 'Kontoägare' : 'Användare'))),
    el('form', { class: 'card', onsubmit: async (e) => {
      e.preventDefault(); err.textContent = '';
      try { await onChangePassword(cur.value, nxt.value); cur.value = nxt.value = ''; } catch (x) { err.textContent = x.message; }
    } },
      el('h2', null, 'Byt lösenord'),
      el('div', { class: 'grid-2' },
        el('div', { class: 'field' }, el('label', { for: 'p-cur' }, 'Nuvarande lösenord'), cur),
        el('div', { class: 'field' }, el('label', { for: 'p-new' }, 'Nytt lösenord (minst 10 tecken)'), nxt)),
      err, el('button', { class: 'btn primary', type: 'submit' }, 'Spara lösenord')),
    el('div', { class: 'card' }, el('h2', null, 'Dina personuppgifter'),
      el('p', { class: 'muted' }, 'Du har rätt att få ut och radera de uppgifter vi har om dig. Läs mer i integritetspolicyn.'),
      el('a', { class: 'btn', href: exportUrl, download: '' }, 'Ladda ner mina uppgifter (JSON)')),
    el('form', { class: 'card', onsubmit: async (e) => {
      e.preventDefault(); delErr.textContent = '';
      if (!confirm('Ta bort ditt konto permanent? Det går inte att ångra.')) return;
      try { await onDelete(delPw.value); } catch (x) { delErr.textContent = x.message; }
    } },
      el('h2', null, 'Ta bort mitt konto'),
      el('p', { class: 'muted' }, 'Ditt konto och din koppling till loggade aktiviteter raderas. Aktivitetstexter på leads finns kvar anonymiserade så att teamets historik inte försvinner.'),
      el('div', { class: 'field' }, el('label', { for: 'd-pw' }, 'Bekräfta med ditt lösenord'), delPw),
      delErr, el('button', { class: 'btn danger', type: 'submit' }, 'Ta bort mitt konto')));
}

const ROLE = { admin: 'Plattformsadmin', owner: 'Kontoägare', user: 'Användare' };

// Användare i en organisation: lista med återaktivera/lösenord/ta bort
function memberRow(u, me, h) {
  return el('li', null,
    el('div', null, el('strong', null, u.name), ' ', el('span', { class: 'muted' }, u.email), ' ', el('span', { class: 'chip' }, ROLE[u.role] || u.role),
      u.suspended_at ? el('span', { class: 'chip danger-chip' }, 'Avstängd') : (u.violations > 0 ? el('span', { class: 'chip' }, u.violations + ' varning(ar)') : null),
      el('div', { class: 'muted small' }, u.last_login_at ? 'Senast inloggad ' + fmtDate(u.last_login_at, true) : 'Har aldrig loggat in')),
    el('div', { class: 'row' },
      (u.suspended_at || u.violations > 0) && el('button', { class: 'btn small', onclick: () => { if (confirm(`Återaktivera ${u.name} och nollställ varningarna?`)) h.onReinstate(u.id); } }, 'Återaktivera'),
      h.onPassword && u.id !== me.id && el('button', { class: 'btn small', onclick: () => { const pw = prompt(`Nytt lösenord för ${u.name} (minst 10 tecken):`); if (pw) h.onPassword(u.id, pw); } }, 'Nytt lösenord'),
      u.id !== me.id && u.role !== 'admin' && el('button', { class: 'btn danger small', onclick: () => { if (confirm(`Ta bort ${u.name}?`)) h.onDelete(u.id); } }, 'Ta bort')));
}

// Team: organisationens uppgifter, användarplatser och användare (kontoägare)
export function renderTeamTab(box, { data, me, onUpdate, onCreate, onDelete, onReinstate, onPassword }) {
  const { org, members, plan } = data;
  const err = el('p', { class: 'error', role: 'alert' });
  const orgErr = el('p', { class: 'error', role: 'alert' });
  const free = Math.max(0, org.seats - org.used);
  const f = {
    name: el('input', { id: 'u-name', type: 'text', required: true }),
    email: el('input', { id: 'u-email', type: 'email', required: true }),
    pw: el('input', { id: 'u-pw', type: 'password', minLength: 10, required: true, autocomplete: 'new-password' }),
    role: el('select', { id: 'u-role' }, option('user', 'Användare'), option('owner', 'Kontoägare (kan hantera teamet)')),
  };
  const o = {
    name: el('input', { id: 'o-name', type: 'text', required: true, value: org.name, maxLength: 120 }),
    email: el('input', { id: 'o-email', type: 'email', value: org.contact_email || '', maxLength: 120 }),
    phone: el('input', { id: 'o-phone', type: 'tel', value: org.phone || '', maxLength: 40 }),
  };
  const pct = plan.limit ? Math.min(100, Math.round((plan.used / plan.limit) * 100)) : 0;
  const meter = el('div', { class: 'meter', role: 'img', 'aria-label': `${plan.used} av ${plan.limit} använda` }, el('i'));
  meter.firstChild.style.width = pct + '%';
  clear(box).append(
    el('div', { class: 'card' },
      el('div', { class: 'row between' }, el('h2', null, 'Ert paket: ' + plan.label), plan.price != null && el('span', { class: 'chip' }, `${plan.price} kr/mån exkl. moms`)),
      plan.limit
        ? [el('p', { class: 'muted small' }, `Nya företag i tavlan denna vecka: ${plan.used} av ${plan.limit}. Kvoten nollställs på måndag.`), meter]
        : el('p', { class: 'muted small' }, 'Ingen veckokvot i ert paket.'),
      el('ul', { class: 'plan-facts' },
        el('li', null, plan.phone ? 'Telefonlänk ingår' : 'Telefonlänk ingår inte, den finns i Team'),
        plan.extraSeat && el('li', null, `Extra användare utöver ${plan.includedSeats}: ${plan.extraSeat} kr/mån vardera`)),
      plan.trialEndsAt && el('p', { class: 'banner warn' }, `Gratis provperiod till och med ${fmtDate(plan.trialEndsAt)}. Därefter spärras kontot tills ni aktiverat ert paket. Era uppgifter finns kvar. Hör av er till oss för att fortsätta.`),
      plan.id !== 'enterprise' && el('p', { class: 'small' }, 'Vill ni byta paket eller ha fler användare? Hör av er till oss.')),
    el('div', { class: 'card' },
      el('div', { class: 'row between' }, el('h2', null, 'Användare'), el('span', { class: free ? 'chip' : 'chip danger-chip' }, `${org.used} av ${org.seats} platser används`)),
      el('ul', { class: 'list-simple' }, members.map((u) => memberRow(u, me, { onDelete, onReinstate, onPassword })))),
    free > 0 ? el('form', { class: 'card', onsubmit: async (e) => {
      e.preventDefault(); err.textContent = '';
      try { await onCreate({ name: f.name.value, email: f.email.value, password: f.pw.value, role: f.role.value }); } catch (x) { err.textContent = x.message; }
    } },
      el('h2', null, 'Lägg till användare'),
      el('p', { class: 'muted small' }, 'Ange ett tillfälligt lösenord och be personen byta det vid första inloggningen. Varje konto kan bara användas på en enhet åt gången.'),
      el('div', { class: 'grid-2' },
        el('div', { class: 'field' }, el('label', { for: 'u-name' }, 'Namn'), f.name),
        el('div', { class: 'field' }, el('label', { for: 'u-email' }, 'E-postadress'), f.email),
        el('div', { class: 'field' }, el('label', { for: 'u-pw' }, 'Tillfälligt lösenord'), f.pw),
        el('div', { class: 'field' }, el('label', { for: 'u-role' }, 'Roll'), f.role)),
      err, el('button', { class: 'btn primary', type: 'submit' }, 'Skapa användare'))
      : el('div', { class: 'card' }, el('h2', null, 'Alla användarplatser är använda'), el('p', { class: 'muted' }, 'Kontakta oss för att utöka antalet användare, eller ta bort någon som slutat.')),
    el('form', { class: 'card', onsubmit: async (e) => {
      e.preventDefault(); orgErr.textContent = '';
      try { await onUpdate({ name: o.name.value, contact_email: o.email.value, phone: o.phone.value }); } catch (x) { orgErr.textContent = x.message; }
    } },
      el('h2', null, 'Organisationen'),
      org.orgnr && el('p', { class: 'muted small' }, 'Organisationsnummer ', el('strong', null, org.orgnr)),
      el('div', { class: 'grid-2' },
        el('div', { class: 'field' }, el('label', { for: 'o-name' }, 'Företagsnamn'), o.name),
        el('div', { class: 'field' }, el('label', { for: 'o-email' }, 'Kontakt e-post'), o.email),
        el('div', { class: 'field' }, el('label', { for: 'o-phone' }, 'Telefon'), o.phone)),
      orgErr, el('button', { class: 'btn primary', type: 'submit' }, 'Spara')));
}

// Plattformsadministratör: alla organisationer, användarplatser och användare
export function renderOrgsTab(box, { orgs, plans, me, onSeats, onDelete, onReinstate }) {
  clear(box).append(
    el('div', { class: 'card' }, el('h2', null, `Organisationer (${orgs.length})`), el('p', { class: 'muted small' }, 'Varje kund är en organisation med egna användare och egen leadtavla. Ändra antal användarplatser här.')),
    orgs.map((o) => {
      const planSel = el('select', { 'aria-label': 'Paket för ' + o.name, class: 'plan-select' }, plans.map((p) => el('option', { value: p.id, selected: p.id === o.plan }, p.label)));
      const left = o.trial_ends_at ? Math.ceil((Date.parse(o.trial_ends_at) - Date.now()) / 86400e3) : null;
      const seats = el('input', { type: 'number', min: 1, max: 10000, value: o.seats, 'aria-label': 'Användarplatser för ' + o.name, class: 'seats-input' });
      return el('div', { class: 'card' },
        el('div', { class: 'row between' },
          el('div', null, el('h3', null, o.name, ' ', o.trial_ends_at ? el('span', { class: left > 0 ? 'chip' : 'chip danger-chip' }, left > 0 ? `Prova, ${left} dagar kvar` : 'Provperioden slut') : el('span', { class: 'chip' }, 'Aktiv kund')), el('div', { class: 'muted small' }, [o.orgnr, o.contact_email, `skapad ${fmtDate(o.created_at)}`, `${nf(o.leads)} leads i tavlan`].filter(Boolean).join(' · '))),
          el('div', { class: 'row' }, planSel, el('label', { class: 'small muted' }, 'Platser '), seats,
            el('button', { class: 'btn small', onclick: () => onSeats(o.id, seats.value, planSel.value) }, 'Spara'),
            o.trial_ends_at && el('button', { class: 'btn small primary', onclick: () => { if (confirm(`Aktivera ${o.name} som betalande kund?`)) onSeats(o.id, seats.value, planSel.value, 'activate'); } }, 'Aktivera'),
            o.trial_ends_at && el('button', { class: 'btn small', onclick: () => onSeats(o.id, seats.value, planSel.value, 'extend') }, 'Förläng prov'))),
        el('ul', { class: 'list-simple' }, o.members.map((u) => memberRow(u, me, { onDelete, onReinstate }))));
    }));
}

export function renderImportTab(box, { stats: s, onImport, onDeleteDemo }) {
  const file = el('input', { id: 'i-file', type: 'file', accept: '.csv,.txt,.tsv,.json,.ndjson,.jsonl' });
  const enc = el('select', { id: 'i-enc' }, option('utf-8', 'UTF-8'), option('windows-1252', 'Windows-1252 (ANSI, vanligt i svenska filer)'));
  const out = el('p', { role: 'status' });
  const btn = el('button', { class: 'btn primary', type: 'button', onclick: async () => {
    const f = file.files[0];
    if (!f) { out.textContent = 'Välj en fil först.'; return; }
    btn.disabled = true; out.className = 'muted'; out.textContent = 'Importerar … (stora filer kan ta en stund)';
    try {
      const data = await onImport(f, enc.value);
      out.className = ''; out.textContent = `Klart: ${nf(data.imported)} poster importerade, ${nf(data.invalid)} ogiltiga rader hoppades över, ${nf(data.suppressed)} spärrade hoppades över.`;
    } catch (e) { out.className = 'error'; out.textContent = e.message; }
    btn.disabled = false;
  } }, 'Importera');
  clear(box).append(
    el('div', { class: 'card' }, el('h2', null, 'I registret just nu'),
      el('div', { class: 'stats' }, [['Företag', s.companies], ['Med telefon', s.withPhone], ['Med e-post', s.withEmail], ['I leadtavlan', s.leads], ['Spärrade', s.suppressed]]
        .map(([l, n]) => el('div', { class: 'stat' }, el('b', null, nf(n)), el('span', null, l)))),
      s.lastImport && el('p', { class: 'muted small spaced-top' }, `Senaste import: ${fmtDate(s.lastImport.at, true)} (${nf(s.lastImport.imported)} poster, källa: ${s.lastImport.source}).`),
      s.demo > 0 && el('div', { class: 'row spaced-top' }, el('span', { class: 'muted' }, `${nf(s.demo)} demoföretag finns kvar.`),
        el('button', { class: 'btn danger small', onclick: () => { if (confirm('Ta bort all demodata?')) onDeleteDemo(); } }, 'Ta bort demodata'))),
    el('div', { class: 'card' }, el('h2', null, 'Importera från SCB'),
      el('p', null, 'Ladda upp en fil med företag från SCB:s företagsregister (CSV/TSV från SCB:s söktjänst eller JSON från SCB:s API). Kolumnerna känns igen automatiskt, till exempel organisationsnummer, företagsnamn, SNI, län, kommun, storleksklass, telefon och e-post. Befintliga företag uppdateras, spärrade företag hoppas över.'),
      el('div', { class: 'grid-2' },
        el('div', { class: 'field' }, el('label', { for: 'i-file' }, 'Fil'), file),
        el('div', { class: 'field' }, el('label', { for: 'i-enc' }, 'Teckenkodning (CSV)'), enc)),
      btn, out,
      el('p', { class: 'muted small spaced-top' }, 'För mycket stora filer (hela registret): kör ', el('code', null, 'npm run import -- fil.csv'), ' i terminalen. Se README för SCB:s API.')));
}

export function renderSuppressionTab(box, { list, requests, onSuppress, onRelease, onHandled }) {
  const err = el('p', { class: 'error', role: 'alert' });
  const org = el('input', { id: 'sp-org', type: 'text', placeholder: '556677-8899', required: true });
  const why = el('input', { id: 'sp-why', type: 'text', placeholder: 'Orsak (valfritt)', maxLength: 200 });
  clear(box).append(
    el('div', { class: 'card' }, el('h2', null, 'Begäranden om borttagning'),
      requests.length === 0 ? el('p', { class: 'muted' }, 'Inga begäranden.') :
        el('ul', { class: 'list-simple' }, requests.map((r) => el('li', null,
          el('div', null, el('strong', null, r.name), ' ', el('a', { href: 'mailto:' + r.email }, r.email), r.orgnr && el('span', { class: 'chip' }, r.orgnr),
            el('div', { class: 'muted small' }, fmtDate(r.created_at, true)), r.message && el('div', { class: 'small' }, r.message)),
          r.handled ? el('span', { class: 'chip' }, 'Hanterad') : el('div', { class: 'row' },
            r.orgnr && el('button', { class: 'btn small', onclick: () => { if (confirm(`Spärra ${r.orgnr} och ta bort det från tavlan?`)) onSuppress(r.orgnr, 'Begäran ' + fmtDate(r.created_at), r.id); } }, 'Spärra företaget'),
            el('button', { class: 'btn small', onclick: () => onHandled(r.id) }, 'Markera som hanterad')))))),
    el('form', { class: 'card', onsubmit: async (e) => {
      e.preventDefault(); err.textContent = '';
      try { await onSuppress(org.value, why.value); } catch (x) { err.textContent = x.message; }
    } },
      el('h2', null, 'Spärra ett företag'),
      el('p', { class: 'muted small' }, 'Spärrade företag visas inte i sök, tavla eller export och hoppas över vid framtida importer. Eventuellt lead och historik raderas.'),
      el('div', { class: 'grid-2' }, el('div', { class: 'field' }, el('label', { for: 'sp-org' }, 'Organisationsnummer'), org), el('div', { class: 'field' }, el('label', { for: 'sp-why' }, 'Orsak'), why)),
      err, el('button', { class: 'btn primary', type: 'submit' }, 'Spärra')),
    el('div', { class: 'card' }, el('h2', null, 'Spärrlista'),
      list.length === 0 ? el('p', { class: 'muted' }, 'Inga spärrade företag.') :
        el('ul', { class: 'list-simple' }, list.map((s) => el('li', null,
          el('div', null, el('strong', null, s.orgnr), ' ', el('span', { class: 'muted small' }, `${fmtDate(s.created_at)}${s.reason ? ' · ' + s.reason : ''}`)),
          el('button', { class: 'btn small', onclick: () => onRelease(s.orgnr) }, 'Ta bort spärr'))))));
}
