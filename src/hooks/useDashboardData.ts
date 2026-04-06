import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Werkzeugausgabe, Werkzeugkatalog, WartungsUndPruefungsprotokoll, Mitarbeiterverwaltung } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [werkzeugausgabe, setWerkzeugausgabe] = useState<Werkzeugausgabe[]>([]);
  const [werkzeugkatalog, setWerkzeugkatalog] = useState<Werkzeugkatalog[]>([]);
  const [wartungsUndPruefungsprotokoll, setWartungsUndPruefungsprotokoll] = useState<WartungsUndPruefungsprotokoll[]>([]);
  const [mitarbeiterverwaltung, setMitarbeiterverwaltung] = useState<Mitarbeiterverwaltung[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [werkzeugausgabeData, werkzeugkatalogData, wartungsUndPruefungsprotokollData, mitarbeiterverwaltungData] = await Promise.all([
        LivingAppsService.getWerkzeugausgabe(),
        LivingAppsService.getWerkzeugkatalog(),
        LivingAppsService.getWartungsUndPruefungsprotokoll(),
        LivingAppsService.getMitarbeiterverwaltung(),
      ]);
      setWerkzeugausgabe(werkzeugausgabeData);
      setWerkzeugkatalog(werkzeugkatalogData);
      setWartungsUndPruefungsprotokoll(wartungsUndPruefungsprotokollData);
      setMitarbeiterverwaltung(mitarbeiterverwaltungData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [werkzeugausgabeData, werkzeugkatalogData, wartungsUndPruefungsprotokollData, mitarbeiterverwaltungData] = await Promise.all([
          LivingAppsService.getWerkzeugausgabe(),
          LivingAppsService.getWerkzeugkatalog(),
          LivingAppsService.getWartungsUndPruefungsprotokoll(),
          LivingAppsService.getMitarbeiterverwaltung(),
        ]);
        setWerkzeugausgabe(werkzeugausgabeData);
        setWerkzeugkatalog(werkzeugkatalogData);
        setWartungsUndPruefungsprotokoll(wartungsUndPruefungsprotokollData);
        setMitarbeiterverwaltung(mitarbeiterverwaltungData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const werkzeugkatalogMap = useMemo(() => {
    const m = new Map<string, Werkzeugkatalog>();
    werkzeugkatalog.forEach(r => m.set(r.record_id, r));
    return m;
  }, [werkzeugkatalog]);

  const mitarbeiterverwaltungMap = useMemo(() => {
    const m = new Map<string, Mitarbeiterverwaltung>();
    mitarbeiterverwaltung.forEach(r => m.set(r.record_id, r));
    return m;
  }, [mitarbeiterverwaltung]);

  return { werkzeugausgabe, setWerkzeugausgabe, werkzeugkatalog, setWerkzeugkatalog, wartungsUndPruefungsprotokoll, setWartungsUndPruefungsprotokoll, mitarbeiterverwaltung, setMitarbeiterverwaltung, loading, error, fetchAll, werkzeugkatalogMap, mitarbeiterverwaltungMap };
}