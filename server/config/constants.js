// Leadtavlans steg (ordning = kolumnordning)
export const STAGES = [
  { id: 'ny', label: 'Ny' },
  { id: 'kontaktad', label: 'Kontaktad' },
  { id: 'mote', label: 'Möte bokat' },
  { id: 'offert', label: 'Offert' },
  { id: 'vunnen', label: 'Vunnen' },
  { id: 'ejaktuell', label: 'Ej aktuell' },
];
export const STAGE_IDS = STAGES.map((s) => s.id);
export const stageLabel = (id) => STAGES.find((s) => s.id === id)?.label ?? id;

// Utfall efter ett samtal. stage = steget leaden flyttas till (flyttas aldrig bakåt; null = stannar), followUpDays = förvald uppföljning.
export const CALL_OUTCOMES = [
  { id: 'no_answer', label: 'Svarade ej', stage: 'kontaktad', followUpDays: 1, nextStep: 'Ring igen' },
  { id: 'spoke', label: 'Svarade, pratade', stage: 'kontaktad', followUpDays: 0, nextStep: 'Följ upp' },
  { id: 'callback', label: 'Bad mig ringa tillbaka', stage: 'kontaktad', followUpDays: 3, nextStep: 'Ring tillbaka' },
  { id: 'meeting', label: 'Möte bokat', stage: 'mote', followUpDays: 0, nextStep: 'Möte' },
  { id: 'quote', label: 'Vill ha offert', stage: 'offert', followUpDays: 3, nextStep: 'Skicka och följ upp offert' },
  { id: 'not_interested', label: 'Ej intresserad', stage: 'ejaktuell', followUpDays: 0, nextStep: '' },
  { id: 'wrong_number', label: 'Fel nummer', stage: null, followUpDays: 0, nextStep: '' },
];

// Paket. Priser i kr per månad exklusive moms (null = offert). leadsPerWeek = företag som får läggas i tavlan per vecka och organisation.
export const PLANS = {
  start: { id: 'start', label: 'Start', price: 299, leadsPerWeek: 200, seats: 1, extraSeat: null, phone: false },
  team: { id: 'team', label: 'Team', price: 999, leadsPerWeek: 500, seats: 3, extraSeat: 249, phone: true },
  enterprise: { id: 'enterprise', label: 'Enterprise', price: null, leadsPerWeek: null, seats: 10, extraSeat: null, phone: true },
};

export const TRIAL_DAYS = 3; // gratis provperiod för nya organisationer

export const ACTIVITY_TYPES = ['note', 'call', 'email', 'meeting', 'stage'];

// SNI-avdelningar (NACE) och deras tvåsiffriga huvudgrupper
export const SECTIONS = {
  A: [1, 3], B: [5, 9], C: [10, 33], D: [35, 35], E: [36, 39], F: [41, 43], G: [45, 47], H: [49, 53],
  I: [55, 56], J: [58, 63], K: [64, 66], L: [68, 68], M: [69, 75], N: [77, 82], O: [84, 84], P: [85, 85],
  Q: [86, 88], R: [90, 93], S: [94, 96], T: [97, 98], U: [99, 99],
};
export const SECTION_LABELS = {
  A: 'Jordbruk, skogsbruk och fiske', B: 'Utvinning av mineral', C: 'Tillverkning', D: 'Försörjning av el, gas och värme',
  E: 'Vattenförsörjning och avfall', F: 'Byggverksamhet', G: 'Handel', H: 'Transport och magasinering',
  I: 'Hotell och restaurang', J: 'Informations- och kommunikationsverksamhet', K: 'Finans- och försäkringsverksamhet',
  L: 'Fastighetsverksamhet', M: 'Juridik, ekonomi, vetenskap och teknik', N: 'Uthyrning och uppdragsverksamhet',
  O: 'Offentlig förvaltning', P: 'Utbildning', Q: 'Vård och omsorg', R: 'Kultur, nöje och fritid',
  S: 'Annan serviceverksamhet', T: 'Hushållens egenproduktion', U: 'Internationella organisationer',
};
// Företagsstatus (SCB ftgStat: 1 = verksam, 9 = ej längre verksam, 0 = har aldrig varit verksam)
export const STATUSES = ['Aktiv', 'Avslutad', 'Aldrig verksam'];
export const SIZE_RANGES = { '0': [0, 0], '1-9': [1, 9], '10-49': [10, 49], '50-199': [50, 199], '200+': [200, 1e9] };
export const SIZE_OPTIONS = [
  { id: '0', label: 'Inga anställda' }, { id: '1-9', label: '1–9 anställda' }, { id: '10-49', label: '10–49 anställda' },
  { id: '50-199', label: '50–199 anställda' }, { id: '200+', label: '200 eller fler' },
];

// Omsättning i tkr (SCB:s omsättningsklass). Filtret jämför mot klassens undre gräns (revenue_min).
export const REVENUE_RANGES = { '1-999': [1, 999], '1000-9999': [1000, 9999], '10000-49999': [10000, 49999], '50000-499999': [50000, 499999], '500000+': [500000, 1e12] };
export const REVENUE_OPTIONS = [
  { id: '1-999', label: 'Under 1 mnkr' }, { id: '1000-9999', label: '1–10 mnkr' }, { id: '10000-49999', label: '10–50 mnkr' },
  { id: '50000-499999', label: '50–500 mnkr' }, { id: '500000+', label: 'Över 500 mnkr' },
];

// SCB:s länskoder
// '00' (län okänt) hoppas över medvetet; '99' = ej svenskt län.
export const LAN_CODES = {
  '99': 'Utanför Sverige',
  '01': 'Stockholms län', '03': 'Uppsala län', '04': 'Södermanlands län', '05': 'Östergötlands län',
  '06': 'Jönköpings län', '07': 'Kronobergs län', '08': 'Kalmar län', '09': 'Gotlands län',
  '10': 'Blekinge län', '12': 'Skåne län', '13': 'Hallands län', '14': 'Västra Götalands län',
  '17': 'Värmlands län', '18': 'Örebro län', '19': 'Västmanlands län', '20': 'Dalarnas län',
  '21': 'Gävleborgs län', '22': 'Västernorrlands län', '23': 'Jämtlands län',
  '24': 'Västerbottens län', '25': 'Norrbottens län',
};
