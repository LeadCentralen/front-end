# Leadcentralen

Sök svenska företag, filtrera, och följ upp kontakter på en leadtavla (kanban). Svenskt gränssnitt, skandinavisk minimalistisk design.
Utvecklat av IT Hjälparna Nordic AB.

## Starta

Kräver Node 22.9 eller nyare. Inga paket behöver installeras (inga beroenden).

```bash
cd leadcentralen
npm run seed     # valfritt: skapar 420 påhittade demoföretag så du kan prova direkt
npm start        # öppna http://localhost:3000
```

Första gången du öppnar sidan skapar du administratörskontot. Därefter lägger administratören till kollegor under
Inställningar → Användare. Det finns ingen öppen registrering.

## Det du får

- **Sök och filter:** fritext (namn, organisationsnummer, telefon), län, kommun, bransch (SNI-avdelning eller SNI-kod/ord),
  storlek, bolagsform, har telefon/e-post, aktiva/avslutade, leadstatus. Sortering och sidindelning. Ingen export av träfflistan (skydd mot att hämta ut registret); se skrapningsskydd nedan.
- **Leadtavla:** Ny, Kontaktad, Möte bokat, Offert, Vunnen, Ej aktuell. Dra korten mellan kolumnerna. Varje lead har ansvarig,
  nästa steg + datum, värde och kontakthistorik (samtal, e-post, möte, anteckning). Loggar du ett samtal på ett "Ny"-lead flyttas det till "Kontaktad".
- **GDPR:** integritetspolicy, cookiepolicy, företagspolicy (med formulär för begäran om borttagning), användarvillkor,
  länkade i sidfoten. Spärrlista (spärrade företag döljs och hoppas över vid import), export och radering av egna uppgifter,
  bara en nödvändig cookie, inga externa tjänster, typsnitt eller analysverktyg, säkerhetslogg som gallras efter 12 månader.

## Riktig data från SCB

SCB:s företagsregister är avgiftsfritt sedan 26 juni 2025. Det finns två vägar in:

1. **Filimport (fungerar direkt).** Hämta en fil via SCB:s söktjänst (foretagsregistretsok.scb.se → "Sök företag" → ladda ner som text/Excel)
   eller JSON från SCB:s API. Spara Excel som CSV. Ladda upp under Inställningar → Dataimport, eller för stora filer:
   `npm run import -- fil.csv --encoding=windows-1252`. Kolumnrubrikerna känns igen automatiskt (se `server/services/import/record-mapper.js`, `ALIASES`).
2. **SCB:s API (`npm run scb-sync`).** Kräver en personlig API-nyckel från registreraafr.scb.se (lägg den som `SCB_API_KEY` i `.env`).
   `server/config/scb.config.json` pekar på `/v1/juridiskaenheter/full` med cursor-paginering. Hela registret (~1,8 milj. företag) hämtas på några minuter.
   Posterna läses direkt ur SCB:s fält (`record-mapper.js`, `scbApiFields`) och koder (bolagsform, kommun, storleksklass, SNI) översätts till klartext via
   `server/config/scb-codes.json`. Den filen genereras av `npm run scb-codes` och behöver bara göras om om SCB ändrar sina kodtabeller.
   `scb-sync` skriver över befintliga uppgifter (även borttagna telefonnummer försvinner). Starta om servern efteråt så att filtervalen laddas om.
   SCB tillåter 5 anrop per sekund och blockerar nyckeln en stund om gränsen överskrids; skripten väntar ut blockeringen själva.

Telefon och e-post finns som variabler i SCB:s register men är bara ifyllda för de företag som själva lämnat dem, så täckningen blir ojämn.
När riktig data är importerad: Inställningar → Dataimport → "Ta bort demodata".

## Innan skarp drift

1. Kopiera `.env.example` till `.env`, fyll i `COMPANY_ORGNR`, `COMPANY_ADDRESS`, `COMPANY_EMAIL` (visas i policysidorna). `npm start` läser `.env` automatiskt.
2. Kör bakom HTTPS (t.ex. Caddy eller nginx), sätt `NODE_ENV=production` och `TRUST_PROXY=1`, och `HOST=127.0.0.1` bakom proxyn.
3. **Låt en jurist granska policytexterna.** De är en genomarbetad grundmall, inte juridisk rådgivning. Ta ställning till rollfördelning
   (personuppgiftsansvarig/biträde), biträdesavtal med hosting, och om en konsekvensbedömning behövs.
4. Ta backup av `data/leadcentralen.db` (SQLite) regelbundet.

## Struktur (MVC)

```
server/
  server.js, app.js      Start och HTTP-app
  config/                Inställningar, konstanter (steg, län, SNI-sektioner) och SCB-mall
  database/              SQLite-anslutning och schema.sql
  core/                  Router, HTTP-hjälpare, fel, cookies, API-hanterare
  middleware/            Inloggning, CSRF, hastighetsbegränsning, säkerhetsheaders, statiska filer
  models/                Databaslager: user, session, company, lead, activity, suppression, removal-request, audit-log, meta
  services/              Affärslogik: lösenord, sessioner, leads, spärrlista, export, underhåll, import/
  controllers/           Tar emot anrop, anropar models/services, svarar med JSON
  routes/                Vilken URL som går till vilken controller
  scripts/               seed, import, scb-sync, scb-codes (körs från terminalen)
public/
  index.html
  assets/                css/ och img/
  js/
    models/              Hämtar och skickar data till API:t
    views/               Bygger HTML (DOM) av data, ingen logik mot servern
    controllers/         Kopplar ihop model och view per sida
    components/          Återanvändbara delar (sidopanelen)
    content/             Policytexterna
    utils/               dom.js, format.js
    router.js, state.js, main.js
data/                    Databasen (leadcentralen.db) skapas här, ingår inte i git
```

**Språk:** JavaScript (Node.js på servern, vanlig JS i webbläsaren), SQL (SQLite), HTML och CSS.

**Användare** sparas i `data/leadcentralen.db`, tabellen `users`: namn, e-post, roll och lösenordshash (scrypt, aldrig klartext). Inloggningar ligger i `sessions`.

## Begränsningar

- SQLite via Nodes inbyggda `node:sqlite` (markerad experimentell i Node, fungerar stabilt). Räcker gott för hela registret (~1,8 milj. företag) och ett litet team.
- Företagsstatus: "Aktiv" = SCB:s "Är verksam", "Avslutad" = "Är ej längre verksam", "Aldrig verksam" = "Har aldrig varit verksam". Filtret visar som standard bara aktiva.
- Ingen e-postutskick, ingen återställning av glömda lösenord (administratören sätter ett nytt via att ta bort och lägga till användaren).

## Skrapningsskydd
Det finns ingen export. För att hindra att registret hämtas ut via sökningen (`server/services/scrape-guard.service.js`):
- **Takt:** högst 40 sökningar och 30 öppnade företag per minut och användare.
- **Djup:** en sökning visar högst 500 företag. Fler kräver ett smalare filter.
- **Dygnskvot:** 3 000 olika företag i listor, 300 öppnade företagskort och 100 nya leads per användare och dygn. Admin undantas.
- Överskrids en kvot loggas `scrape_block` i tabellen `audit`, och användaren får ett tydligt meddelande. Gränserna ändras med `LIMIT_*` i `.env`.

## En enhet per konto
- Ett konto (ej admin) får bara vara inloggat på en enhet åt gången. Loggar någon in medan kontot var aktivt på en annan enhet de senaste `CONCURRENT_WINDOW_MIN` minuterna blir det en varning: alla enheter loggas ut och personen får logga in från en enhet. Efter två varningar stängs kontot av vid nästa överträdelse (ingen återbetalning, står i användarvillkoren). Varningar glöms efter 30 dagar utan ny överträdelse.
- En gammal, inaktiv session ersätts utan varning. Samma webbläsare räknas som samma enhet.
- Inaktiva användare loggas ut efter `SESSION_IDLE_MIN` minuter (server och webbläsare).
- Admin återaktiverar ett avstängt konto under Inställningar → Användare. Händelserna `multi_device`, `suspended` och `login_blocked` finns i tabellen `audit`.

## Organisationer och startsida

- Utloggade besökare ser en startsida med skärmdumpar. Därifrån går man till **Logga in** eller **Skapa konto**.
- **Skapa konto** kräver organisationsnummer (kontrollsiffra kontrolleras, personnummer avvisas), företagsnamn och kontaktperson. Den som skapar kontot blir **kontoägare**.
- Kontoägaren lägger till kollegor under **Inställningar → Team**, upp till organisationens antal användarplatser (ändras per kund av plattformsadmin under **Organisationer**).
- Varje organisation har egen leadtavla, egna listor och egen statistik. Företagsregistret delas. Samma företag kan ligga i flera organisationers tavlor.
- Roller: `admin` (plattform), `owner` (kontoägare), `user`. Befintliga användare och leads flyttas automatiskt till en första organisation vid uppgradering.
- Skärmdumparna på startsidan ligger i `public/assets/img/shots/` och är tagna på påhittad demodata.

## Paket

Definieras i `server/config/constants.js` (`PLANS`). Priserna är kr/mån exkl. moms och visas på startsidan.

| Paket | Pris | Användare | Nya företag i tavlan | Telefonlänk |
|---|---|---|---|---|
| Start | 299 | 1 | 200 per vecka | nej |
| Team | 999 | 3, därefter 249 per extra | 500 per vecka | ja |
| Enterprise | offert | efter avtal | efter avtal | ja |

- Veckokvoten räknas per organisation (måndag nollställer, svensk tid) i tabellen `org_weekly`. Raderade leads ger inte tillbaka kvoten. Den dagliga skrapningsgränsen per användare (`LIMIT_LEADS_DAY`) gäller också.
- Plattformsadmin byter paket och antal användarplatser under **Inställningar → Organisationer** (t.ex. Team med 4 platser = en extra användare).
- Vid registrering kan bara Start och Team väljas. Enterprise läggs upp av plattformsadmin efter möte och offert.
- Det finns ingen betalning eller fakturering i appen än. Paketet gäller direkt vid registrering och faktureras manuellt.

## Kontaktuppgifter visas först i tavlan

- Alla användare kan bläddra bland alla företag (namn, ort, bransch, storlek, omsättning). Telefonnummer och e-post visas **först när företaget ligger i organisationens leadtavla**. Listan visar "Telefon finns" och "E-post finns", och filtren "Har telefon/e-post" fungerar som vanligt.
- Det gör veckokvoten (Start 200, Team 500) till den verkliga gränsen. Utan det hade man kunnat kopiera uppgifter ur listan utan att lägga något i tavlan.
- Telefonsökning i sökrutan kräver minst 8 siffror (annars kunde nummer läsas ut en siffra i taget). Organisationsnummer söks som förut.
- Ett lead som tas bort inom 10 minuter ger tillbaka sin plats i veckokvoten.
- Provkonton får hälften så många visade rader per dygn (`LIMIT_ROWS_DAY / 2`). Plattformsadmin ser alltid alla uppgifter.
