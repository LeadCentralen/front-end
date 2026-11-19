import { el } from '../utils/dom.js';
import { openPhonePairing } from './phone-pair.view.js';

const PLAY = 'https://play.google.com/store/apps/details?id=com.microsoft.appmanager';
const STORE = 'https://apps.microsoft.com/detail/9nmpj99vjbwv';

const step = (title, ...body) => el('li', null, el('strong', null, title), ...body.map((b) => (typeof b === 'string' ? el('p', null, b) : b)));
const ext = (href, text) => el('a', { href, target: '_blank', rel: 'noopener noreferrer', class: 'btn small' }, text);

const COMMON = () => [
  el('p', { class: 'muted' }, 'Telefonen ansluts en gång. Därefter skickar Leadcentralen numret till din telefon, du trycker på Ring och samtalet går i din egen telefon med ditt eget abonnemang. Starten och sluttiden kommer från telefonen, så samtalstiden i loggen är verklig. Det är gratis.'),
  el('div', { class: 'guide-need' }, el('strong', null, 'Därför måste telefonen vara ansluten: '), 'utan anslutningen kan sidan inte veta när samtalet startade och tog slut. Därför går det inte att ringa från Leadcentralen innan du har anslutit.'),
];

function androidPanel() {
  return el('div', null, el('ol', { class: 'guide-steps' },
    step('Visa koden på datorn', 'Klicka på "Anslut telefon" i samtalsraden. Du får en sexsiffrig kod och en adress.', el('button', { class: 'btn small primary', type: 'button', onclick: () => openPhonePairing() }, 'Visa kod och adress')),
    step('Öppna adressen i Chrome på telefonen', 'Skriv in adressen som visas, till exempel dindomän.se/telefon.html, och skriv sedan koden. Telefonen visar "Ansluten".'),
    step('Lägg till på startskärmen (rekommenderas)', 'Tryck på menyn ⋮ i Chrome och välj "Lägg till på startskärmen". Då startar du Telefonlänk med en ikon nästa gång.'),
    step('Låt skärmen vara tänd medan du jobbar', 'Gå till Inställningar → Skärm → Skärmens tidsgräns och välj en lång tid. Stäng av batterisparläge för Chrome, annars slutar telefonen ta emot samtal när skärmen släcks.'),
    step('Ring', 'Klicka på 📞 på ett kort i tavlan och sedan på Ring. Telefonen visar numret, du trycker på Ring och uppringaren öppnas. Kom tillbaka till Telefonlänk när samtalet är slut, så loggas tiden.')),
  el('details', { class: 'guide-trouble' }, el('summary', null, 'Valfritt: ring med datorns högtalare och mikrofon (Phone Link)'),
    el('p', null, 'Vill du prata i datorn i stället för i telefonen kan du dessutom koppla telefonen till Windows med Phone Link. Det gör ingen skillnad för tidsloggen i Leadcentralen. Du behöver Windows 10/11, Bluetooth och ett Microsoft-konto.'),
    el('ul', null,
      el('li', null, 'Öppna Phone Link på datorn och välj Android. Logga in med Microsoft-konto.'),
      el('li', null, 'Skanna QR-koden och installera Länk till Windows på telefonen. Godkänn behörigheterna.'),
      el('li', null, 'Under Samtal i Phone Link: tryck Konfigurera och parkoppla Bluetooth.'),
      el('li', null, 'Under samtalet växlar du ljudet mellan dator och telefon med knappen i Phone Link.')),
    el('div', { class: 'row' }, ext(STORE, 'Phone Link (Microsoft Store)'), ext(PLAY, 'Länk till Windows (Google Play)'))));
}

function iphonePanel() {
  return el('div', null, el('ol', { class: 'guide-steps' },
    step('Visa koden på datorn', 'Klicka på "Anslut telefon" i samtalsraden. Du får en sexsiffrig kod och en adress.', el('button', { class: 'btn small primary', type: 'button', onclick: () => openPhonePairing() }, 'Visa kod och adress')),
    step('Öppna adressen i Safari på iPhone', 'Skriv in adressen som visas, till exempel dindomän.se/telefon.html, och skriv sedan koden. Telefonen visar "Ansluten".'),
    step('Lägg till på hemskärmen (rekommenderas)', 'Tryck på Dela-knappen och välj "Lägg till på hemskärmen". Öppna Telefonlänk därifrån nästa gång.'),
    step('Låt skärmen vara tänd medan du jobbar', 'Gå till Inställningar → Skärm och ljusstyrka → Autolås och välj en lång tid eller Aldrig under arbetspasset. iPhone släpper inte in sidan i bakgrunden, så den måste vara öppen och i förgrunden.'),
    step('Ring', 'Klicka på 📞 på ett kort i tavlan och sedan på Ring. Telefonen visar numret, du trycker på Ring och iPhone frågar om du vill ringa. Bekräfta, och kom tillbaka till Telefonlänk när samtalet är slut, så loggas tiden.')),
  el('details', { class: 'guide-trouble' }, el('summary', null, 'Valfritt: ring med Macens högtalare och mikrofon (iPhone-samtal)'),
    el('p', null, 'Har du en Mac kan du dessutom låta samtalen gå via datorns ljud med Apples funktion Samtal från iPhone. Det påverkar inte tidsloggen i Leadcentralen.'),
    el('ul', null,
      el('li', null, 'Logga in med samma Apple-konto på iPhone och Mac, och slå på wifi och Bluetooth på båda.'),
      el('li', null, 'På iPhone: Inställningar → Telefon → Samtal på andra enheter → slå på Tillåt samtal på andra enheter och välj din Mac.'),
      el('li', null, 'På Mac: FaceTime → Inställningar → Allmänt → slå på Samtal från iPhone.'),
      el('li', null, 'Under samtalet väljer du högtalare och mikrofon i FaceTime-fönstret eller i Macens ljudinställningar.'))));
}

// Guide med två val: Android eller iPhone.
export function openPhoneGuide(start = 'android') {
  const panels = { android: androidPanel(), iphone: iphonePanel() };
  const tabs = [['android', 'Android'], ['iphone', 'iPhone']];
  const tabBar = el('div', { class: 'seg', role: 'group', 'aria-label': 'Välj telefon' });
  const show = (id) => {
    for (const [k, p] of Object.entries(panels)) p.hidden = k !== id;
    [...tabBar.children].forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tab === id)));
  };
  tabs.forEach(([id, label]) => tabBar.append(el('button', { type: 'button', dataset: { tab: id }, 'aria-pressed': 'false', onclick: () => show(id) }, label)));

  const dlg = el('dialog', { class: 'guide', 'aria-labelledby': 'guide-h' },
    el('div', { class: 'guide-head' }, el('h2', { id: 'guide-h' }, 'Anslut din telefon'), el('button', { class: 'btn ghost', 'aria-label': 'Stäng', onclick: () => dlg.close() }, '✕')),
    ...COMMON(),
    tabBar, panels.android, panels.iphone,
    el('div', { class: 'guide-foot' }, el('button', { class: 'btn primary', onclick: () => dlg.close() }, 'Klart')));
  dlg.addEventListener('close', () => dlg.remove());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  document.body.append(dlg);
  show(start === 'iphone' || /iPhone|iPad/.test(navigator.userAgent) ? 'iphone' : 'android');
  dlg.showModal();
}
