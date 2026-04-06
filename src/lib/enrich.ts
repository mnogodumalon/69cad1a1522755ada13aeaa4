import type { EnrichedWartungsUndPruefungsprotokoll, EnrichedWerkzeugausgabe } from '@/types/enriched';
import type { Mitarbeiterverwaltung, WartungsUndPruefungsprotokoll, Werkzeugausgabe, Werkzeugkatalog } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface WerkzeugausgabeMaps {
  werkzeugkatalogMap: Map<string, Werkzeugkatalog>;
  mitarbeiterverwaltungMap: Map<string, Mitarbeiterverwaltung>;
}

export function enrichWerkzeugausgabe(
  werkzeugausgabe: Werkzeugausgabe[],
  maps: WerkzeugausgabeMaps
): EnrichedWerkzeugausgabe[] {
  return werkzeugausgabe.map(r => ({
    ...r,
    werkzeug_refName: resolveDisplay(r.fields.werkzeug_ref, maps.werkzeugkatalogMap, 'bezeichnung'),
    mitarbeiter_refName: resolveDisplay(r.fields.mitarbeiter_ref, maps.mitarbeiterverwaltungMap, 'vorname', 'nachname'),
  }));
}

interface WartungsUndPruefungsprotokollMaps {
  werkzeugkatalogMap: Map<string, Werkzeugkatalog>;
}

export function enrichWartungsUndPruefungsprotokoll(
  wartungsUndPruefungsprotokoll: WartungsUndPruefungsprotokoll[],
  maps: WartungsUndPruefungsprotokollMaps
): EnrichedWartungsUndPruefungsprotokoll[] {
  return wartungsUndPruefungsprotokoll.map(r => ({
    ...r,
    werkzeug_wartung_refName: resolveDisplay(r.fields.werkzeug_wartung_ref, maps.werkzeugkatalogMap, 'bezeichnung'),
  }));
}
