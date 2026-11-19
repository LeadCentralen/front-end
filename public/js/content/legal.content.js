import { el } from '../utils/dom.js';

// Texterna är en mall och ska granskas av jurist innan skarp drift.
const val = (v) => (v ? v : el('span', { class: 'todo' }, '[ej angivet]'));

function controllerBlock(config) {
  const c = config.controller;
  return el('ul', null,
    el('li', null, 'Namn: ', val(c.name)),
    el('li', null, 'Organisationsnummer: ', val(c.orgnr)),
    el('li', null, 'Adress: ', val(c.address)),
    el('li', null, 'E-post för frågor om personuppgifter: ', val(c.email)));
}

const H = (t) => el('h2', null, t);
const P = (...c) => el('p', null, ...c);
const L = (...items) => el('ul', null, items.map((i) => el('li', null, i)));

export const LEGAL_PAGES = {
  integritet: {
    title: 'Integritetspolicy',
    body: ({ config, form }) => [
      P('Den här policyn beskriver hur ', config.controller.name, ' behandlar personuppgifter i tjänsten Leadcentralen. Vi vill att det ska vara enkelt att förstå vad som sparas, varför och vilka rättigheter du har.'),
      H('1. Personuppgiftsansvarig'), controllerBlock(config),
      H('2. Vilka personuppgifter behandlar vi?'),
      L(
        'Användare: namn, e-postadress, roll, lösenord (sparas enbart som krypterad hash), tidpunkt för senaste inloggning.',
        'Aktivitet: vilka samtal, e-postmeddelanden, möten och anteckningar du loggat på ett lead, samt vem som ändrat status.',
        'Säkerhetslogg: inloggningar, exporter, importer och administrativa ändringar (inte innehållet i dem).',
        'Företagsuppgifter: namn, organisationsnummer, adress, telefon, e-post och webbadress för företag och organisationer. För enskilda firmor kan detta vara personuppgifter. Se vår Företagspolicy.',
        'Anteckningar du själv skriver om en kontakt. Skriv sakligt och undvik känsliga personuppgifter.'
      ),
      H('3. Varför behandlar vi uppgifterna och på vilken rättslig grund?'),
      L(
        'Inloggning och tillhandahållande av tjänsten: fullgörande av avtal (artikel 6.1 b i GDPR).',
        'Säkerhet, felsökning och skydd mot missbruk: berättigat intresse (artikel 6.1 f).',
        'Sök, urval och uppföljning av affärskontakter mellan företag: berättigat intresse (artikel 6.1 f). Uppgifterna kommer från SCB:s öppna företagsregister, de används i yrkesmässigt syfte och du kan alltid invända.'
      ),
      H('4. Varifrån kommer uppgifterna?'),
      P('Användaruppgifter lämnar du eller din administratör. Företagsuppgifter hämtas från SCB:s allmänna företagsregister, som sedan 26 juni 2025 är avgiftsfritt, och i förekommande fall från Bolagsverket.'),
      H('5. Vem får del av uppgifterna?'),
      P('Vi säljer inte uppgifter och delar dem inte med tredje part för egna ändamål. Uppgifterna kan hanteras av leverantörer som driftar tjänsten (personuppgiftsbiträden) enligt biträdesavtal. Tjänsten använder inga analys-, annons- eller sociala medier-verktyg och laddar inga externa typsnitt eller skript.'),
      H('6. Överföring utanför EU/EES'),
      P('Som standard sker ingen överföring till länder utanför EU/EES. Om driftmiljön ändras uppdaterar vi den här policyn.'),
      H('7. Hur länge sparas uppgifterna?'),
      L(
        'Konto och profil: tills kontot tas bort.',
        'När ett konto tas bort raderas profilen och din koppling till tidigare aktiviteter tas bort.',
        'Säkerhetsloggar: 12 månader, därefter raderas de automatiskt.',
        'Inloggningssessioner: högst 7 dagar.',
        'Leads och kontakthistorik: tills de tas bort av en användare eller administratör, eller tills företaget spärras.'
      ),
      H('8. Dina rättigheter'),
      P('Du har rätt att:'),
      L(
        'få veta vilka uppgifter vi har om dig och få en kopia (under Inställningar kan du ladda ner dina uppgifter som JSON),',
        'få felaktiga uppgifter rättade,',
        'få dina uppgifter raderade (under Inställningar kan du ta bort ditt konto),',
        'begära begränsning av behandlingen och få ut uppgifter i ett maskinläsbart format,',
        'invända mot behandling som grundas på berättigat intresse. Du kan alltid invända mot direktmarknadsföring.'
      ),
      P('Kontakta oss via e-postadressen ovan. Du har också rätt att lämna klagomål till Integritetsskyddsmyndigheten (IMY), imy.se.'),
      H('9. Säkerhet'),
      P('Lösenord lagras med envägskryptering (scrypt). Inloggningscookien är HttpOnly och skyddad mot cross-site-förfrågningar, rättigheter styrs per roll, antalet inloggningsförsök begränsas och tjänsten ska köras över HTTPS.'),
      H('10. Ändringar'),
      P('Vi kan uppdatera policyn. Datumet för senaste ändring står överst på sidan.'),
    ],
  },
  cookies: {
    title: 'Cookiepolicy',
    body: ({ config, form }) => [
      P('Leadcentralen använder så få cookies som möjligt. Här ser du vilka.'),
      H('Cookies vi använder'),
      el('div', { class: 'table-wrap' }, el('table', null,
        el('thead', null, el('tr', null, ['Namn', 'Syfte', 'Typ', 'Livslängd'].map((h) => el('th', { scope: 'col' }, h)))),
        el('tbody', null, el('tr', null,
          el('td', null, el('code', null, 'lc_session')),
          el('td', null, 'Håller dig inloggad.'),
          el('td', null, 'Nödvändig, första part, HttpOnly, SameSite=Lax'),
          el('td', null, 'Högst 7 dagar, eller tills du loggar ut'))))),
      H('Cookies vi inte använder'),
      P('Inga analys-, annons- eller spårningscookies och inga cookies från tredje part. Vi använder inte heller lokal lagring i webbläsaren för att följa dig.'),
      H('Samtycke'),
      P('Cookies som är nödvändiga för att tillhandahålla en tjänst du själv begärt, som inloggning, kräver inte samtycke enligt lagen om elektronisk kommunikation. Därför visar vi ingen cookiebanner. Om vi i framtiden börjar använda andra cookies ber vi om ditt samtycke först.'),
      H('Radera cookies'),
      P('Du kan när som helst radera cookies i din webbläsares inställningar. Då loggas du ut.'),
    ],
  },
  foretagspolicy: {
    title: 'Företagspolicy',
    body: ({ config, form }) => {
      return [
        P('Den här policyn gäller de företagsuppgifter som visas i Leadcentralen och hur de får användas.'),
        H('1. Källa'),
        P('Uppgifterna kommer från SCB:s allmänna företagsregister, som innehåller Sveriges företag, myndigheter, organisationer och deras arbetsställen. Registret är avgiftsfritt sedan 26 juni 2025. Vi ändrar inte sakuppgifter. Om en uppgift är fel rättas den hos källan, till exempel av företaget själv via verksamt.se, och den uppdateras hos oss vid nästa import.'),
        H('2. Vilka uppgifter visas?'),
        P('Företagsnamn, organisationsnummer, bolagsform, bransch (SNI), adress, kommun och län, storleksklass, telefon, e-post, webbadress, status och registreringsdatum, i den mån de finns i källan.'),
        H('3. Enskilda firmor'),
        P('För enskilda firmor är företagets uppgifter ofta kopplade till en privatperson, och då är de personuppgifter. Vi behandlar dem på grund av berättigat intresse för affärskontakter mellan företag. Du har alltid rätt att invända och få företaget spärrat.'),
        H('4. Så begär du borttagning eller spärr'),
        P('Fyll i formuläret nedan eller kontakta oss via e-postadressen i integritetspolicyn. Vi svarar utan onödigt dröjsmål och senast inom en månad. När ett företag är spärrat visas det inte i sök, leadtavla eller export, och det hoppas över vid framtida importer. Uppgiften finns kvar hos SCB. Ändringar där görs via verksamt.se.'),
        form,
        H('5. Regler för dig som använder Leadcentralen'),
        L(
          'Använd uppgifterna för yrkesmässig kontakt med företag och på ett sätt som följer lagen.',
          'Telefon: kontrollera NIX-Telefon och andra spärrar där det är relevant, och respektera ett nej tack direkt.',
          'E-post och SMS: ett marknadsföringsmeddelande ska vara tydligt märkt, ange avsändare och ge ett enkelt sätt att avstå. Enskilda firmor kan räknas som privatpersoner, så kontrollera reglerna i marknadsföringslagen innan du skickar.',
          'Berätta var du fick uppgifterna ifrån om mottagaren frågar.',
          'Ett konto är personligt och får bara vara inloggat på en enhet åt gången. Används kontot på flera enheter samtidigt får du en varning och loggas ut överallt. Efter två varningar stängs kontot av vid nästa överträdelse, utan återbetalning. Du loggas också ut automatiskt efter en period av inaktivitet.',
          'Sälj eller lämna inte vidare uppgifter, och hämta inte data automatiskt (skrapning). Uppgifterna får bara användas i tjänsten. Det finns ingen export, och onormalt användande loggas och kan leda till spärr av kontot.'
        ),
        H('6. Ansvar'),
        P('Du som användare ansvarar för att din kontakt och marknadsföring följer gällande lag. Uppgifterna tillhandahålls i befintligt skick och kan vara ofullständiga eller inaktuella.'),
      ];
    },
  },
  villkor: {
    title: 'Användarvillkor',
    body: ({ config, form }) => [
      P('Dessa villkor gäller när du använder Leadcentralen.'),
      H('1. Tjänsten'),
      P('Leadcentralen är ett verktyg för att söka svenska företag och följa upp kontakter på en leadtavla. Tjänsten tillhandahålls av ', config.controller.name, '. Konton skapas av en administratör.'),
      H('2. Tillåten användning'),
      L(
        'Du använder tjänsten för yrkesmässig kontakt med företag och följer gällande lag, inklusive GDPR och marknadsföringslagen.',
        'Du delar inte ditt konto och håller ditt lösenord hemligt.',
        'Du hämtar inte data automatiskt, säljer inte vidare uppgifter och försöker inte kringgå begränsningar eller säkerhet.'
      ),
      H('3. Ditt innehåll'),
      P('Du ansvarar för anteckningar och annan information du lägger in. Skriv sakligt och undvik känsliga personuppgifter.'),
      H('4. Datakvalitet'),
      P('Företagsuppgifterna kommer från SCB och lämnas i befintligt skick. Vi garanterar inte att de är korrekta, fullständiga eller aktuella. Kontrollera viktiga uppgifter hos källan.'),
      H('5. Ansvarsbegränsning'),
      P('Tjänsten tillhandahålls utan garantier i den utsträckning lagen tillåter. Vi ansvarar inte för indirekta skador eller utebliven vinst.'),
      H('6. Ändringar och avslut'),
      P('Vi kan ändra tjänsten och villkoren. Ett konto kan stängas om villkoren bryts. Du kan själv ta bort ditt konto under Inställningar.'),
      H('7. Tillämplig lag'),
      P('Svensk lag gäller.'),
      H('8. Kontakt'), controllerBlock(config),
    ],
  },
};


export const LEGAL_LINKS = [['integritet', 'Integritetspolicy'], ['cookies', 'Cookiepolicy'], ['foretagspolicy', 'Företagspolicy'], ['villkor', 'Användarvillkor']];
export const isLegal = (id) => id in LEGAL_PAGES;
