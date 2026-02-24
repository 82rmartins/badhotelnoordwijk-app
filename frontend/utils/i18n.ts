// Language translations for Bad Hotel Noordwijk app
// Supports: EN (English), NL (Dutch), and DE (German)

export type Language = 'en' | 'nl' | 'de';

export interface Translations {
  // Header
  lastUpdate: string;
  never: string;
  
  // Status
  underControl: string;
  attention: string;
  risk: string;
  reason: string;
  
  // Trend
  improving: string;
  stable: string;
  worsening: string;
  
  // Rhythm
  accelerating: string;
  decelerating: string;
  
  // Today section
  today: string;
  operation: string;
  occupancy: string;
  rooms: string;
  arrivals: string;
  departures: string;
  dailyRevenue: string;
  parking: string;
  vending: string;
  cityTax: string;
  separate: string;
  
  // Radar section
  radar: string;
  next14Days: string;
  whatNeedsAttention: string;
  todayLabel: string;
  nextDays: string;
  noCriticalIssues: string;
  
  // Control section
  control: string;
  weekAndMonth: string;
  currentWeek: string;
  vsLast: string;
  avgOccupancy: string;
  totalRevenue: string;
  avgAdr: string;
  accumulatedOccupancy: string;
  accumulatedRevenue: string;
  day: string;
  of: string;
  projectionMessage: string;
  weeklyOccupancy: string;
  
  // Days
  sun: string;
  mon: string;
  tue: string;
  wed: string;
  thu: string;
  fri: string;
  sat: string;
  
  // Months
  jan: string;
  feb: string;
  mar: string;
  apr: string;
  may: string;
  jun: string;
  jul: string;
  aug: string;
  sep: string;
  oct: string;
  nov: string;
  dec: string;
  
  // Month full names
  january: string;
  february: string;
  march: string;
  april: string;
  mayFull: string;
  june: string;
  july: string;
  august: string;
  september: string;
  october: string;
  november: string;
  december: string;
  
  // Admin
  administration: string;
  localData: string;
  reservations: string;
  update: string;
  uploadInfo: string;
  importFromMews: string;
  csvUpload: string;
  selectCsvFile: string;
  processing: string;
  expectedFormat: string;
  requiredColumns: string;
  optionalColumns: string;
  dateFormats: string;
  demoData: string;
  generateTestData: string;
  createDemoData: string;
  generating: string;
  warning: string;
  replaceWarning: string;
  hotelSettings: string;
  currentParams: string;
  totalRooms: string;
  highSeasonTarget: string;
  lowSeasonTarget: string;
  clearAllData: string;
  clearConfirmTitle: string;
  clearConfirmMessage: string;
  cancel: string;
  delete: string;
  success: string;
  error: string;
  dataCleared: string;
  v1Architecture: string;
  
  // Alerts - message keys
  occupancyBelowTarget: string;
  criticalDaysAhead: string;
  consecutiveLowDays: string;
  nextDaysOnTrack: string;
  nextDaysBelowTarget: string;
  todayOnTarget: string;
  requiresAttention: string;
  noCriticalIssues: string;
  
  // Status reasons
  todayOccupancyBelow: string;
  d7BelowTarget: string;
  d14BelowTarget: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    // Header
    lastUpdate: 'Last update',
    never: 'Never',
    
    // Status
    underControl: 'Under Control',
    attention: 'Attention',
    risk: 'Risk',
    reason: 'Reason',
    
    // Trend
    improving: 'Improving',
    stable: 'Stable',
    worsening: 'Worsening',
    
    // Rhythm
    accelerating: 'Accelerating',
    decelerating: 'Decelerating',
    
    // Today section
    today: 'TODAY',
    operation: 'Operation',
    occupancy: 'Occupancy',
    rooms: 'rooms',
    arrivals: 'Arrivals',
    departures: 'Departures',
    dailyRevenue: 'Daily Revenue',
    parking: 'Parking',
    vending: 'Vending',
    cityTax: 'City Tax',
    separate: 'separate',
    
    // Radar section
    radar: 'RADAR',
    next14Days: 'Next 14 days',
    whatNeedsAttention: 'What needs attention',
    todayLabel: 'today',
    nextDays: 'next days',
    noCriticalIssues: 'No critical issues identified at this time.',
    
    // Control section
    control: 'CONTROL',
    weekAndMonth: 'Week & Month',
    currentWeek: 'Current Week',
    vsLast: 'vs last',
    avgOccupancy: 'Avg occupancy',
    totalRevenue: 'Total revenue',
    avgAdr: 'Avg ADR',
    accumulatedOccupancy: 'Accumulated occupancy',
    accumulatedRevenue: 'Accumulated revenue',
    day: 'Day',
    of: 'of',
    projectionMessage: 'At current pace, projected avg occupancy is',
    weeklyOccupancy: 'Weekly Occupancy',
    
    // Days
    sun: 'Sun',
    mon: 'Mon',
    tue: 'Tue',
    wed: 'Wed',
    thu: 'Thu',
    fri: 'Fri',
    sat: 'Sat',
    
    // Months
    jan: 'Jan',
    feb: 'Feb',
    mar: 'Mar',
    apr: 'Apr',
    may: 'May',
    jun: 'Jun',
    jul: 'Jul',
    aug: 'Aug',
    sep: 'Sep',
    oct: 'Oct',
    nov: 'Nov',
    dec: 'Dec',
    
    // Month full names
    january: 'January',
    february: 'February',
    march: 'March',
    april: 'April',
    mayFull: 'May',
    june: 'June',
    july: 'July',
    august: 'August',
    september: 'September',
    october: 'October',
    november: 'November',
    december: 'December',
    
    // Admin
    administration: 'Administration',
    localData: 'Local Data',
    reservations: 'Reservations',
    update: 'Update',
    uploadInfo: 'Upload a CSV file exported from Mews PMS to update the data. All calculations are done locally on device.',
    importFromMews: 'Import Data from Mews',
    csvUpload: 'CSV file upload with reservations',
    selectCsvFile: 'Select CSV File',
    processing: 'Processing...',
    expectedFormat: 'Expected CSV format:',
    requiredColumns: 'Required columns:',
    optionalColumns: 'Optional columns:',
    dateFormats: 'Date formats:',
    demoData: 'Demo Data',
    generateTestData: 'Generate test data',
    createDemoData: 'Create Demo Data',
    generating: 'Generating...',
    warning: 'Warning',
    replaceWarning: 'This action will replace all existing data.',
    hotelSettings: 'Hotel Settings',
    currentParams: 'Current parameters',
    totalRooms: 'Total rooms',
    highSeasonTarget: 'High season target (Apr-Sep)',
    lowSeasonTarget: 'Low season target (Oct-Mar)',
    clearAllData: 'Clear All Data',
    clearConfirmTitle: 'Clear Data',
    clearConfirmMessage: 'Are you sure you want to delete all data? This action cannot be undone.',
    cancel: 'Cancel',
    delete: 'Delete',
    success: 'Success',
    error: 'Error',
    dataCleared: 'All data has been cleared.',
    v1Architecture: 'V1 — 100% local processing. Data stored on device. Works offline.',
    
    // Alerts
    occupancyBelowTarget: 'Occupancy today ({0}%) below target ({1}%)',
    criticalDaysAhead: '{0} critical days in the next 7 days',
    consecutiveLowDays: '{0} consecutive days with low occupancy',
    nextDaysOnTrack: 'Next days on track.',
    nextDaysBelowTarget: 'Next days also below target.',
    todayOnTarget: 'Today on target.',
    requiresAttention: 'Requires immediate attention.',
    noCriticalIssues: 'No critical issues identified at this time.',
    
    // Status reasons
    todayOccupancyBelow: 'Reason: today\'s occupancy ({0}%) below target',
    d7BelowTarget: 'Reason: D+7 ({0}%) below target',
    d14BelowTarget: 'Reason: D+14 ({0}%) below target',
  },
  nl: {
    // Header
    lastUpdate: 'Laatste update',
    never: 'Nooit',
    
    // Status
    underControl: 'Onder Controle',
    attention: 'Aandacht',
    risk: 'Risico',
    reason: 'Reden',
    
    // Trend
    improving: 'Verbeterend',
    stable: 'Stabiel',
    worsening: 'Verslechterend',
    
    // Rhythm
    accelerating: 'Versnellend',
    decelerating: 'Vertragend',
    
    // Today section
    today: 'VANDAAG',
    operation: 'Operatie',
    occupancy: 'Bezetting',
    rooms: 'kamers',
    arrivals: 'Aankomsten',
    departures: 'Vertrekken',
    dailyRevenue: 'Dagelijkse Omzet',
    parking: 'Parkeren',
    vending: 'Vending',
    cityTax: 'Toeristenbelasting',
    separate: 'apart',
    
    // Radar section
    radar: 'RADAR',
    next14Days: 'Komende 14 dagen',
    whatNeedsAttention: 'Wat aandacht nodig heeft',
    todayLabel: 'vandaag',
    nextDays: 'komende dagen',
    noCriticalIssues: 'Geen kritieke punten geïdentificeerd op dit moment.',
    
    // Control section
    control: 'CONTROLE',
    weekAndMonth: 'Week & Maand',
    currentWeek: 'Huidige Week',
    vsLast: 'vs vorige',
    avgOccupancy: 'Gem. bezetting',
    totalRevenue: 'Totale omzet',
    avgAdr: 'Gem. ADR',
    accumulatedOccupancy: 'Cumulatieve bezetting',
    accumulatedRevenue: 'Cumulatieve omzet',
    day: 'Dag',
    of: 'van',
    projectionMessage: 'Bij huidig tempo, verwachte gem. bezetting is',
    weeklyOccupancy: 'Wekelijkse Bezetting',
    
    // Days
    sun: 'Zo',
    mon: 'Ma',
    tue: 'Di',
    wed: 'Wo',
    thu: 'Do',
    fri: 'Vr',
    sat: 'Za',
    
    // Months
    jan: 'Jan',
    feb: 'Feb',
    mar: 'Mrt',
    apr: 'Apr',
    may: 'Mei',
    jun: 'Jun',
    jul: 'Jul',
    aug: 'Aug',
    sep: 'Sep',
    oct: 'Okt',
    nov: 'Nov',
    dec: 'Dec',
    
    // Month full names
    january: 'Januari',
    february: 'Februari',
    march: 'Maart',
    april: 'April',
    mayFull: 'Mei',
    june: 'Juni',
    july: 'Juli',
    august: 'Augustus',
    september: 'September',
    october: 'Oktober',
    november: 'November',
    december: 'December',
    
    // Admin
    administration: 'Administratie',
    localData: 'Lokale Data',
    reservations: 'Reserveringen',
    update: 'Update',
    uploadInfo: 'Upload een CSV-bestand geëxporteerd uit Mews PMS om de data bij te werken. Alle berekeningen worden lokaal op het apparaat gedaan.',
    importFromMews: 'Data Importeren uit Mews',
    csvUpload: 'CSV-bestand upload met reserveringen',
    selectCsvFile: 'Selecteer CSV Bestand',
    processing: 'Verwerken...',
    expectedFormat: 'Verwacht CSV formaat:',
    requiredColumns: 'Verplichte kolommen:',
    optionalColumns: 'Optionele kolommen:',
    dateFormats: 'Datumformaten:',
    demoData: 'Demo Data',
    generateTestData: 'Genereer testdata',
    createDemoData: 'Maak Demo Data',
    generating: 'Genereren...',
    warning: 'Waarschuwing',
    replaceWarning: 'Deze actie vervangt alle bestaande data.',
    hotelSettings: 'Hotel Instellingen',
    currentParams: 'Huidige parameters',
    totalRooms: 'Totaal kamers',
    highSeasonTarget: 'Hoogseizoen doel (Apr-Sep)',
    lowSeasonTarget: 'Laagseizoen doel (Okt-Mrt)',
    clearAllData: 'Alle Data Wissen',
    clearConfirmTitle: 'Data Wissen',
    clearConfirmMessage: 'Weet je zeker dat je alle data wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.',
    cancel: 'Annuleren',
    delete: 'Verwijderen',
    success: 'Succes',
    error: 'Fout',
    dataCleared: 'Alle data is gewist.',
    v1Architecture: 'V1 — 100% lokale verwerking. Data opgeslagen op apparaat. Werkt offline.',
    
    // Alerts
    occupancyBelowTarget: 'Bezetting vandaag ({0}%) onder doel ({1}%)',
    criticalDaysAhead: '{0} kritieke dagen in de komende 7 dagen',
    consecutiveLowDays: '{0} opeenvolgende dagen met lage bezetting',
    nextDaysOnTrack: 'Komende dagen op schema.',
    nextDaysBelowTarget: 'Komende dagen ook onder doel.',
    todayOnTarget: 'Vandaag op doel.',
    requiresAttention: 'Vereist directe aandacht.',
    noCriticalIssues: 'Geen kritieke problemen geïdentificeerd op dit moment.',
    
    // Status reasons
    todayOccupancyBelow: 'Reden: bezetting vandaag ({0}%) onder doel',
    d7BelowTarget: 'Reden: D+7 ({0}%) onder doel',
    d14BelowTarget: 'Reden: D+14 ({0}%) onder doel',
  },
  de: {
    // Header
    lastUpdate: 'Letzte Aktualisierung',
    never: 'Nie',
    
    // Status
    underControl: 'Unter Kontrolle',
    attention: 'Achtung',
    risk: 'Risiko',
    reason: 'Grund',
    
    // Trend
    improving: 'Verbessernd',
    stable: 'Stabil',
    worsening: 'Verschlechternd',
    
    // Rhythm
    accelerating: 'Beschleunigend',
    decelerating: 'Verlangsamend',
    
    // Today section
    today: 'HEUTE',
    operation: 'Betrieb',
    occupancy: 'Belegung',
    rooms: 'Zimmer',
    arrivals: 'Ankünfte',
    departures: 'Abreisen',
    dailyRevenue: 'Tagesumsatz',
    parking: 'Parken',
    vending: 'Automaten',
    cityTax: 'Kurtaxe',
    separate: 'separat',
    
    // Radar section
    radar: 'RADAR',
    next14Days: 'Nächste 14 Tage',
    whatNeedsAttention: 'Was Aufmerksamkeit braucht',
    todayLabel: 'heute',
    nextDays: 'nächste Tage',
    noCriticalIssues: 'Keine kritischen Probleme identifiziert.',
    
    // Control section
    control: 'KONTROLLE',
    weekAndMonth: 'Woche & Monat',
    currentWeek: 'Aktuelle Woche',
    vsLast: 'vs letzte',
    avgOccupancy: 'Durchschn. Belegung',
    totalRevenue: 'Gesamtumsatz',
    avgAdr: 'Durchschn. ADR',
    accumulatedOccupancy: 'Kumulierte Belegung',
    accumulatedRevenue: 'Kumulierter Umsatz',
    day: 'Tag',
    of: 'von',
    projectionMessage: 'Bei aktuellem Tempo, erwartete Durchschn. Belegung ist',
    weeklyOccupancy: 'Wöchentliche Belegung',
    
    // Days
    sun: 'So',
    mon: 'Mo',
    tue: 'Di',
    wed: 'Mi',
    thu: 'Do',
    fri: 'Fr',
    sat: 'Sa',
    
    // Months
    jan: 'Jan',
    feb: 'Feb',
    mar: 'Mär',
    apr: 'Apr',
    may: 'Mai',
    jun: 'Jun',
    jul: 'Jul',
    aug: 'Aug',
    sep: 'Sep',
    oct: 'Okt',
    nov: 'Nov',
    dec: 'Dez',
    
    // Month full names
    january: 'Januar',
    february: 'Februar',
    march: 'März',
    april: 'April',
    mayFull: 'Mai',
    june: 'Juni',
    july: 'Juli',
    august: 'August',
    september: 'September',
    october: 'Oktober',
    november: 'November',
    december: 'Dezember',
    
    // Admin
    administration: 'Verwaltung',
    localData: 'Lokale Daten',
    reservations: 'Reservierungen',
    update: 'Aktualisieren',
    uploadInfo: 'Laden Sie eine CSV-Datei aus Mews PMS hoch, um die Daten zu aktualisieren. Alle Berechnungen erfolgen lokal auf dem Gerät.',
    importFromMews: 'Daten aus Mews importieren',
    csvUpload: 'CSV-Datei mit Reservierungen hochladen',
    selectCsvFile: 'CSV-Datei auswählen',
    processing: 'Verarbeitung...',
    expectedFormat: 'Erwartetes CSV-Format:',
    requiredColumns: 'Erforderliche Spalten:',
    optionalColumns: 'Optionale Spalten:',
    dateFormats: 'Datumsformate:',
    demoData: 'Demo-Daten',
    generateTestData: 'Testdaten generieren',
    createDemoData: 'Demo-Daten erstellen',
    generating: 'Generierung...',
    warning: 'Warnung',
    replaceWarning: 'Diese Aktion ersetzt alle vorhandenen Daten.',
    hotelSettings: 'Hotel-Einstellungen',
    currentParams: 'Aktuelle Parameter',
    totalRooms: 'Gesamtzimmer',
    highSeasonTarget: 'Hochsaison-Ziel (Apr-Sep)',
    lowSeasonTarget: 'Nebensaison-Ziel (Okt-Mär)',
    clearAllData: 'Alle Daten löschen',
    clearConfirmTitle: 'Daten löschen',
    clearConfirmMessage: 'Möchten Sie wirklich alle Daten löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
    cancel: 'Abbrechen',
    delete: 'Löschen',
    success: 'Erfolg',
    error: 'Fehler',
    dataCleared: 'Alle Daten wurden gelöscht.',
    v1Architecture: 'V1 — 100% lokale Verarbeitung. Daten auf dem Gerät gespeichert. Funktioniert offline.',
    
    // Alerts
    occupancyBelowTarget: 'Belegung heute ({0}%) unter Ziel ({1}%)',
    criticalDaysAhead: '{0} kritische Tage in den nächsten 7 Tagen',
    consecutiveLowDays: '{0} aufeinanderfolgende Tage mit niedriger Belegung',
    nextDaysOnTrack: 'Nächste Tage auf Kurs.',
    nextDaysBelowTarget: 'Nächste Tage auch unter Ziel.',
    todayOnTarget: 'Heute auf Ziel.',
    requiresAttention: 'Erfordert sofortige Aufmerksamkeit.',
    noCriticalIssues: 'Keine kritischen Probleme identifiziert.',
    
    // Status reasons
    todayOccupancyBelow: 'Grund: Belegung heute ({0}%) unter Ziel',
    d7BelowTarget: 'Grund: D+7 ({0}%) unter Ziel',
    d14BelowTarget: 'Grund: D+14 ({0}%) unter Ziel',
  },
};

// Helper function to format strings with placeholders
export function formatString(template: string, ...args: (string | number)[]): string {
  return template.replace(/\{(\d+)\}/g, (match, index) => {
    const argIndex = parseInt(index, 10);
    return args[argIndex] !== undefined ? String(args[argIndex]) : match;
  });
}

// Day names by language
export const getDayNames = (lang: Language): string[] => {
  const t = translations[lang];
  return [t.sun, t.mon, t.tue, t.wed, t.thu, t.fri, t.sat];
};

// Month names by language
export const getMonthNames = (lang: Language): string[] => {
  const t = translations[lang];
  return [t.jan, t.feb, t.mar, t.apr, t.may, t.jun, t.jul, t.aug, t.sep, t.oct, t.nov, t.dec];
};

// Full month names by language
export const getFullMonthNames = (lang: Language): string[] => {
  const t = translations[lang];
  return [t.january, t.february, t.march, t.april, t.mayFull, t.june, t.july, t.august, t.september, t.october, t.november, t.december];
};
