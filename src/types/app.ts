// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Werkzeugausgabe {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    werkzeug_ref?: string; // applookup -> URL zu 'Werkzeugkatalog' Record
    mitarbeiter_ref?: string; // applookup -> URL zu 'Mitarbeiterverwaltung' Record
    ausgabedatum?: string; // Format: YYYY-MM-DD oder ISO String
    geplante_rueckgabe?: string; // Format: YYYY-MM-DD oder ISO String
    projekt_baustelle?: string;
    zustand_ausgabe?: LookupValue;
    tatsaechliche_rueckgabe?: string; // Format: YYYY-MM-DD oder ISO String
    zustand_rueckgabe?: LookupValue;
    bemerkung_ausgabe?: string;
  };
}

export interface Werkzeugkatalog {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    bezeichnung?: string;
    inventarnummer?: string;
    kategorie?: LookupValue;
    hersteller?: string;
    modell?: string;
    seriennummer?: string;
    kaufdatum?: string; // Format: YYYY-MM-DD oder ISO String
    standort?: string;
    zustand?: LookupValue;
    pruefpflichtig?: boolean;
    naechste_pruefung?: string; // Format: YYYY-MM-DD oder ISO String
    bemerkung_werkzeug?: string;
    foto_werkzeug?: string;
  };
}

export interface WartungsUndPruefungsprotokoll {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    werkzeug_wartung_ref?: string; // applookup -> URL zu 'Werkzeugkatalog' Record
    datum_wartung?: string; // Format: YYYY-MM-DD oder ISO String
    art_wartung?: LookupValue;
    durchgefuehrt_von?: string;
    ergebnis?: LookupValue;
    naechste_pruefung_datum?: string; // Format: YYYY-MM-DD oder ISO String
    kosten?: number;
    bemerkung_wartung?: string;
    dokument_wartung?: string;
  };
}

export interface Mitarbeiterverwaltung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    personalnummer?: string;
    abteilung?: LookupValue;
    telefon?: string;
    email?: string;
  };
}

export const APP_IDS = {
  WERKZEUGAUSGABE: '69cad17f38d0c82b5c927890',
  WERKZEUGKATALOG: '69cad17fbc61d7b098886b2a',
  WARTUNGS_UND_PRUEFUNGSPROTOKOLL: '69cad18020509e2c547db87c',
  MITARBEITERVERWALTUNG: '69cad17797a950c659be4580',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'werkzeugausgabe': {
    zustand_ausgabe: [{ key: "neuwertig", label: "Neuwertig" }, { key: "gut", label: "Gut" }, { key: "gebraucht", label: "Gebraucht" }],
    zustand_rueckgabe: [{ key: "neuwertig", label: "Neuwertig" }, { key: "gut", label: "Gut" }, { key: "gebraucht", label: "Gebraucht" }, { key: "defekt", label: "Defekt" }],
  },
  'werkzeugkatalog': {
    kategorie: [{ key: "handwerkzeug", label: "Handwerkzeug" }, { key: "elektrowerkzeug", label: "Elektrowerkzeug" }, { key: "messgeraet", label: "Messgerät" }, { key: "pruefgeraet", label: "Prüfgerät" }, { key: "maschine", label: "Maschine" }, { key: "sonstiges", label: "Sonstiges" }],
    zustand: [{ key: "neuwertig", label: "Neuwertig" }, { key: "gut", label: "Gut" }, { key: "gebraucht", label: "Gebraucht" }, { key: "defekt", label: "Defekt" }, { key: "in_reparatur", label: "In Reparatur" }],
  },
  'wartungs_und_pruefungsprotokoll': {
    art_wartung: [{ key: "dguv_pruefung", label: "DGUV-Prüfung" }, { key: "reparatur", label: "Reparatur" }, { key: "sichtpruefung", label: "Sichtprüfung" }, { key: "kalibrierung", label: "Kalibrierung" }, { key: "sonstiges", label: "Sonstiges" }, { key: "regelmaessige_wartung", label: "Regelmäßige Wartung" }],
    ergebnis: [{ key: "bestanden", label: "Bestanden / In Ordnung" }, { key: "bedingt_bestanden", label: "Bedingt bestanden" }, { key: "nicht_bestanden", label: "Nicht bestanden / Defekt" }],
  },
  'mitarbeiterverwaltung': {
    abteilung: [{ key: "montage", label: "Montage" }, { key: "installation", label: "Installation" }, { key: "wartung", label: "Wartung" }, { key: "buero", label: "Büro" }, { key: "lager", label: "Lager" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'werkzeugausgabe': {
    'werkzeug_ref': 'applookup/select',
    'mitarbeiter_ref': 'applookup/select',
    'ausgabedatum': 'date/date',
    'geplante_rueckgabe': 'date/date',
    'projekt_baustelle': 'string/text',
    'zustand_ausgabe': 'lookup/radio',
    'tatsaechliche_rueckgabe': 'date/date',
    'zustand_rueckgabe': 'lookup/radio',
    'bemerkung_ausgabe': 'string/textarea',
  },
  'werkzeugkatalog': {
    'bezeichnung': 'string/text',
    'inventarnummer': 'string/text',
    'kategorie': 'lookup/select',
    'hersteller': 'string/text',
    'modell': 'string/text',
    'seriennummer': 'string/text',
    'kaufdatum': 'date/date',
    'standort': 'string/text',
    'zustand': 'lookup/radio',
    'pruefpflichtig': 'bool',
    'naechste_pruefung': 'date/date',
    'bemerkung_werkzeug': 'string/textarea',
    'foto_werkzeug': 'file',
  },
  'wartungs_und_pruefungsprotokoll': {
    'werkzeug_wartung_ref': 'applookup/select',
    'datum_wartung': 'date/date',
    'art_wartung': 'lookup/select',
    'durchgefuehrt_von': 'string/text',
    'ergebnis': 'lookup/radio',
    'naechste_pruefung_datum': 'date/date',
    'kosten': 'number',
    'bemerkung_wartung': 'string/textarea',
    'dokument_wartung': 'file',
  },
  'mitarbeiterverwaltung': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'personalnummer': 'string/text',
    'abteilung': 'lookup/select',
    'telefon': 'string/tel',
    'email': 'string/email',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateWerkzeugausgabe = StripLookup<Werkzeugausgabe['fields']>;
export type CreateWerkzeugkatalog = StripLookup<Werkzeugkatalog['fields']>;
export type CreateWartungsUndPruefungsprotokoll = StripLookup<WartungsUndPruefungsprotokoll['fields']>;
export type CreateMitarbeiterverwaltung = StripLookup<Mitarbeiterverwaltung['fields']>;