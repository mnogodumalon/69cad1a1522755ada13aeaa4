import type { WartungsUndPruefungsprotokoll, Werkzeugausgabe } from './app';

export type EnrichedWerkzeugausgabe = Werkzeugausgabe & {
  werkzeug_refName: string;
  mitarbeiter_refName: string;
};

export type EnrichedWartungsUndPruefungsprotokoll = WartungsUndPruefungsprotokoll & {
  werkzeug_wartung_refName: string;
};
