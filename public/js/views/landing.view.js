import { el, clear } from '../utils/dom.js';

const shot = (name, alt, { eager = false } = {}) => el('figure', { class: 'shot' },
  el('div', { class: 'shot-bar', 'aria-hidden': 'true' }, el('i'), el('i'), el('i')),
  el('img', { src: `/assets/img/shots/${name}.webp`, alt, width: 1440, height: 900, loading: eager ? 'eager' : 'lazy', decoding: 'async' }));

const STEPS = [
  { n: 1, title: 'Sök och filtrera', shot: 'sok', alt: 'Sökning bland företag med filter för bransch, plats, omsättning och storlek.',
    text: 'Kombinera bransch, län och kommun, omsättning, storlek och bolagsform och bläddra bland alla företag. Varje träff har minst ett telefonnummer eller en e-postadress, så ni slipper döda spår. Kontaktuppgifterna visas när ni lägger företaget i tavlan.' },
  { n: 2, title: 'Lägg hela urvalet på tavlan', shot: 'bulk', alt: 'Dialogen där alla träffar i ett filter läggs i leadtavlan som en namngiven lista.',
    text: 'Alla restauranger i Skåne med en viss omsättning? Ett klick lägger hela urvalet på leadtavlan som en namngiven lista. Ni slipper lägga till ett företag i taget och kan filtrera tavlan på listan.' },
  { n: 3, title: 'Ring från din egen telefon', shot: 'tavla', alt: 'Leadtavlan med samtalsfält ovanför kolumnerna och en kopplad telefon.',
    text: 'Koppla mobilen en gång, Android eller iPhone. Ingen app behövs. Samtalen går via ert vanliga abonnemang och samtalstiden loggas på riktigt. Välj hur samtalet gick så flyttas kortet till rätt kolumn.' },
  { n: 4, title: 'Se vad som ger affärer', shot: 'statistik', alt: 'Statistiksida med leadtavlans fördelning, samtal per dag och svarsfrekvens.',
    text: 'Se hur många som svarar, vilka tider som fungerar bäst, vilka branscher som leder till möten och hur varje lista presterar. Justera säljstrategin utifrån fakta.' },
];

const FEATURES = [
  ['Leadtavla', 'Dra korten från Ny till Vunnen. Sätt ansvarig, värde och nästa steg, och se direkt vilka uppföljningar som är försenade.'],
  ['Listor för kampanjer', 'Namnge varje urval, till exempel "Bygg i Västra Götaland", och jämför hur listorna presterar i statistiken.'],
  ['Telefonlänk', 'Slå numret från webben i din egen mobil. Vid ett samtal öppnas uppringaren, och när du är tillbaka loggas tiden.'],
  ['Team under en organisation', 'Skapa kontot med organisationsnummer och lägg till kollegor. Alla arbetar i samma tavla, och kontoägaren ser teamets statistik.'],
  ['Statistik per säljare', 'Samtal, svarsfrekvens, möten och offerter, per person och för hela teamet.'],
  ['Trygg hantering', 'Ett konto, en enhet. Automatisk utloggning vid inaktivitet. Företag som vill bort kan spärras, och uppgifterna kommer från SCB:s företagsregister.'],
];

const FAQ = [
  ['Var kommer företagsuppgifterna ifrån?', 'Från SCB:s företagsregister. Alla kan bläddra bland alla företag. Telefonnummer och e-postadresser visas när ni lagt företaget i leadtavlan, och bara för företag som har minst en av dem. Enskilda firmors personnummer visas aldrig.'],
  ['Behöver vi en särskild telefon eller ett telefonabonnemang hos er?', 'Nej. Ni ringer med era egna mobiler och betalar bara det ert abonnemang redan kostar. Telefonen kopplas via en länk i mobilens webbläsare, utan app.'],
  ['Hur lägger vi till kollegor?', 'Den som skapar kontot blir kontoägare. Under Inställningar → Team lägger ni till användare, och alla får samma tavla. Start har en användare. Team har tre och därefter en fast avgift per extra användare.'],
  ['Hur fungerar den kostnadsfria provperioden?', 'Ni prövar i 3 dagar utan att betala och utan att ange kort. När tiden är slut spärras kontot tills vi har aktiverat ert paket. Era leads och uppgifter finns kvar.'],
  ['Vad händer med företag som inte vill kontaktas?', 'De kan skicka en begäran om borttagning. Vi spärrar då företaget, och det försvinner ur sök och tavlor. Läs mer i vår integritetspolicy.'],
];

const kr = (n) => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')}\u00a0kr`;

const PLAN_TEXT = {
  start: { tagline: 'För startups i ett tidigt skede och enmansföretag', more: (p) => `Start passar dig som precis har börjat och driver företaget själv. Du söker och filtrerar bland Sveriges företag, lägger upp till ${p.leadsPerWeek} nya företag i veckan på leadtavlan och följer upp dem i listor och statistik. Vill du ansluta din telefon till plattformen och ha fler användare väljer du Team.`, items: (p) => [`${p.seats} användare`, `${p.leadsPerWeek} nya företag i tavlan per vecka`, 'Sök, filtrera och leadtavla', 'Listor och statistik', { text: 'Anslut din telefon till plattformen', no: true }] },
  team: { tagline: 'För startups och företag med färre säljare, och för er som är i en tillväxtfas', more: (p) => `Team passar startups och företag med några få säljare, och er som växer. Ni är ${p.seats} användare på samma tavla, lägger upp till ${p.leadsPerWeek} nya företag i veckan, ansluter era mobiler till plattformen så att samtalstiden loggas på riktigt, och ser statistik per säljare. Behöver ni fler användare tillkommer ${kr(p.extraSeat)} i månaden per användare.`, items: (p) => [`${p.seats} användare ingår, därefter ${kr(p.extraSeat)}/mån per användare`, `${p.leadsPerWeek} nya företag i tavlan per vecka`, 'Anslut din telefon till plattformen och ring från din egen mobil', 'Statistik per säljare och för teamet', 'Allt i Start'] },
  enterprise: { tagline: 'För större organisationer och företag med flera säljare som jobbar åt dem', more: () => 'Enterprise är för större organisationer och för företag som har flera säljare som jobbar åt dem. Vi bokar ett möte, går igenom ert behov, antal användare och volymer, och tar fram en offert.', items: () => ['Fler användare och högre kvoter', 'Anpassat avtal och upplägg', 'Vi bokar ett möte och tar fram en offert', 'Allt i Team'] },
};

// "Läs mer" öppnar en popup med paketets beskrivning och knapp vidare (Prova gratis eller Boka möte)
function openPlan(p, t, signup, meet) {
  const dlg = el('dialog', { class: 'guide plan-dialog', 'aria-labelledby': 'plan-h' },
    el('div', { class: 'guide-head' }, el('h2', { id: 'plan-h' }, p.label), el('button', { class: 'btn ghost', 'aria-label': 'Stäng', onclick: () => dlg.close() }, '✕')),
    el('p', { class: 'plan-tag' }, t.tagline),
    el('div', { class: 'plan-price' }, p.price == null ? 'Offert' : [el('b', null, kr(p.price)), el('span', null, ' / mån exkl. moms')]),
    el('p', null, t.more ? t.more(p) : ''),
    el('ul', { class: 'plan-list' }, t.items(p).map((x) => (typeof x === 'string' ? el('li', null, x) : el('li', { class: x.no ? 'no' : '' }, x.text)))),
    p.id === 'enterprise'
      ? el('a', { class: 'btn big primary', href: meet, target: meet.startsWith('http') ? '_blank' : null, rel: 'noopener', onclick: () => dlg.close() }, 'Boka möte')
      : el('a', { class: 'btn big primary', href: signup ? '#/skapa-konto/' + p.id : '#/logga-in', onclick: () => dlg.close() }, 'Prova gratis i 3 dagar'),
    p.id !== 'enterprise' && signup && el('p', { class: 'muted small spaced-top' }, 'Ingen betalning eller kort behövs för att prova.'));
  dlg.addEventListener('close', () => dlg.remove());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  document.body.append(dlg);
  dlg.showModal();
}

function pricing(plans, signup, contact) {
  const meet = contact ? `mailto:${contact}?subject=${encodeURIComponent('Enterprise, boka möte')}` : 'https://www.ithjalparna.se';
  return el('section', { class: 'band', id: 'priser' }, el('div', { class: 'wrap' },
    el('h2', { class: 'sec-title' }, 'Välj paket'),
    el('p', { class: 'sec-sub' }, 'Priser per månad, exklusive moms.'),
    el('div', { class: 'plans' }, plans.map((p) => {
      const t = PLAN_TEXT[p.id] || { tagline: '', items: () => [] };
      const featured = p.id === 'team';
      return el('div', { class: 'plan' + (featured ? ' featured' : '') },
        el('h3', null, p.label), el('p', { class: 'plan-tag' }, t.tagline),
        el('div', { class: 'plan-price' }, p.price == null ? 'Offert' : [el('b', null, kr(p.price)), el('span', null, ' / mån')]),
        el('ul', { class: 'plan-list' }, t.items(p).map((x) => (typeof x === 'string' ? el('li', null, x) : el('li', { class: x.no ? 'no' : '' }, x.text)))),
        el('button', { type: 'button', class: 'btn big', onclick: () => openPlan(p, t, signup, meet) }, 'Läs mer'));
    }))));
}

export function renderLanding(root, { signup, plans = [], contact = '' }) {
  // Enda knappen är "Prova gratis i 3 dagar". Inloggning finns i headern och som liten länk under knappen.
  const cta = (light) => el('div', { class: 'cta-block' },
    signup
      ? el('a', { class: 'btn big ' + (light ? 'light' : 'primary'), href: '#/skapa-konto' }, 'Prova gratis i 3 dagar')
      : el('a', { class: 'btn big ' + (light ? 'light' : 'primary'), href: '#/logga-in' }, 'Logga in'),
    signup && el('p', { class: 'cta-note' }, 'Ingen betalning eller kort behövs.'),
    signup && el('p', { class: 'cta-login' }, 'Har du redan ett konto? ', el('a', { href: '#/logga-in' }, 'Logga in')));

  clear(root).append(...[
    el('section', { class: 'hero' }, el('div', { class: 'wrap hero-grid' },
      el('div', { class: 'hero-copy' },
        el('img', { class: 'hero-logo', src: '/assets/img/logo-white.png', alt: '', width: 56, height: 56 }),
        el('h1', null, 'Hitta rätt företag. Ring dem. Se vad som ger affärer.'),
        el('p', { class: 'lead' }, 'Sök bland Sveriges företag, lägg hela urvalet på en leadtavla och ring direkt från din egen mobil. Allt ni gör samlas i statistik som visar vad som fungerar.'),
        cta(true),
        el('ul', { class: 'ticks' },
          el('li', null, 'Bara företag med telefon eller e-post'),
          el('li', null, 'Ring med din egen telefon och ditt eget abonnemang'),
          el('li', null, 'Flera användare under samma organisation'))),
      el('div', { class: 'hero-shot' }, shot('tavla', 'Leadtavlan med kolumner från Ny till Vunnen och ett samtalsfält ovanför.', { eager: true })))),

    el('section', { class: 'band', id: 'sa-fungerar-det' }, el('div', { class: 'wrap' },
      el('h2', { class: 'sec-title' }, 'Så fungerar det'),
      el('p', { class: 'sec-sub' }, 'Från första sökningen till uppföljning i fyra steg.'),
      STEPS.map((s, i) => el('div', { class: 'step' + (i % 2 ? ' flip' : '') },
        el('div', { class: 'step-copy' }, el('span', { class: 'step-n' }, String(s.n)), el('h3', null, s.title), el('p', null, s.text)),
        shot(s.shot, s.alt))))),

    el('section', { class: 'band alt' }, el('div', { class: 'wrap' },
      el('h2', { class: 'sec-title' }, 'Allt ni behöver för att få fler kundsamtal'),
      el('div', { class: 'feat-grid' }, FEATURES.map(([t, d]) => el('div', { class: 'feat' }, el('h3', null, t), el('p', null, d)))))),

    el('section', { class: 'band' }, el('div', { class: 'wrap team-grid' },
      el('div', null,
        el('h2', { class: 'sec-title left' }, 'Byggt för team'),
        el('p', null, 'Skapa ett konto med ert organisationsnummer. Du blir kontoägare och lägger till kollegorna under Inställningar → Team.'),
        el('ol', { class: 'num-list' },
          el('li', null, el('strong', null, 'Skapa konto'), ' med organisationsnummer, företagsnamn och dina uppgifter.'),
          el('li', null, el('strong', null, 'Lägg till användare'), ' med namn, e-post och ett första lösenord.'),
          el('li', null, el('strong', null, 'Jobba i samma tavla'), ', fördela leads och följ teamets statistik.')),
        cta(false)),
      shot('team', 'Inställningar med organisationens användare och antal användarplatser.'))),

    plans.length ? pricing(plans, signup, contact) : null,

    el('section', { class: 'band alt' }, el('div', { class: 'wrap narrow' },
      el('h2', { class: 'sec-title' }, 'Vanliga frågor'),
      FAQ.map(([q, a]) => el('details', { class: 'faq' }, el('summary', null, q), el('p', null, a))))),

    el('section', { class: 'final' }, el('div', { class: 'wrap' },
      el('h2', null, 'Redo att fylla tavlan?'),
      el('p', null, 'Skapa ett konto för ert företag på någon minut.'),
      cta(true)))].filter(Boolean));
}
