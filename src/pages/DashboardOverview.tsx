import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichWerkzeugausgabe, enrichWartungsUndPruefungsprotokoll } from '@/lib/enrich';
import type { EnrichedWerkzeugausgabe } from '@/types/enriched';
import type { Werkzeugkatalog } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconPlus, IconSearch, IconPackage, IconArrowBackUp,
  IconCalendarEvent, IconClipboardCheck, IconAlertTriangle,
  IconUser, IconBuildingWarehouse, IconPencil, IconTrash,
} from '@tabler/icons-react';
import { WerkzeugausgabeDialog } from '@/components/dialogs/WerkzeugausgabeDialog';
import { WerkzeugkatalogDialog } from '@/components/dialogs/WerkzeugkatalogDialog';
import { AI_PHOTO_SCAN } from '@/config/ai-features';

const APPGROUP_ID = '69cad1a1522755ada13aeaa4';
const REPAIR_ENDPOINT = '/claude/build/repair';

export default function DashboardOverview() {
  const {
    werkzeugausgabe, werkzeugkatalog, wartungsUndPruefungsprotokoll, mitarbeiterverwaltung,
    werkzeugkatalogMap, mitarbeiterverwaltungMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedWerkzeugausgabe = enrichWerkzeugausgabe(werkzeugausgabe, { werkzeugkatalogMap, mitarbeiterverwaltungMap });
  const enrichedWartungsUndPruefungsprotokoll = enrichWartungsUndPruefungsprotokoll(wartungsUndPruefungsprotokoll, { werkzeugkatalogMap });

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'alle' | 'verfuegbar' | 'verliehen'>('alle');
  const [filterKategorie, setFilterKategorie] = useState<string>('alle');

  // Werkzeugausgabe dialog
  const [ausgabeOpen, setAusgabeOpen] = useState(false);
  const [editAusgabe, setEditAusgabe] = useState<EnrichedWerkzeugausgabe | null>(null);
  const [preselectedWerkzeug, setPreselectedWerkzeug] = useState<string | null>(null);

  // Werkzeugkatalog dialog
  const [katalogOpen, setKatalogOpen] = useState(false);
  const [editKatalog, setEditKatalog] = useState<Werkzeugkatalog | null>(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'ausgabe' | 'katalog'; id: string } | null>(null);

  // Selected tool for detail view
  const [selectedWerkzeugId, setSelectedWerkzeugId] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  // Active lendings: no tatsaechliche_rueckgabe
  const activeLendings = useMemo(() =>
    enrichedWerkzeugausgabe.filter(a => !a.fields.tatsaechliche_rueckgabe),
    [enrichedWerkzeugausgabe]
  );

  // Set of werkzeug IDs currently lent out
  const lentOutIds = useMemo(() => new Set(
    activeLendings.map(a => extractRecordId(a.fields.werkzeug_ref)).filter(Boolean) as string[]
  ), [activeLendings]);

  // Overdue lendings
  const overdueCount = useMemo(() =>
    activeLendings.filter(a => a.fields.geplante_rueckgabe && a.fields.geplante_rueckgabe < today).length,
    [activeLendings, today]
  );

  // Upcoming inspections (within 30 days)
  const soon = new Date();
  soon.setDate(soon.getDate() + 30);
  const soonStr = soon.toISOString().slice(0, 10);
  const upcomingInspections = useMemo(() =>
    werkzeugkatalog.filter(w => w.fields.naechste_pruefung && w.fields.naechste_pruefung <= soonStr),
    [werkzeugkatalog, soonStr]
  );

  const kategorien = useMemo(() => {
    const ks = new Set(werkzeugkatalog.map(w => w.fields.kategorie?.key).filter(Boolean) as string[]);
    return Array.from(ks);
  }, [werkzeugkatalog]);

  const filteredWerkzeug = useMemo(() => {
    return werkzeugkatalog.filter(w => {
      const isLent = lentOutIds.has(w.record_id);
      if (filterStatus === 'verfuegbar' && isLent) return false;
      if (filterStatus === 'verliehen' && !isLent) return false;
      if (filterKategorie !== 'alle' && w.fields.kategorie?.key !== filterKategorie) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (w.fields.bezeichnung ?? '').toLowerCase().includes(q) ||
          (w.fields.inventarnummer ?? '').toLowerCase().includes(q) ||
          (w.fields.hersteller ?? '').toLowerCase().includes(q) ||
          (w.fields.modell ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [werkzeugkatalog, lentOutIds, filterStatus, filterKategorie, search]);

  const selectedWerkzeug = selectedWerkzeugId
    ? werkzeugkatalog.find(w => w.record_id === selectedWerkzeugId) ?? null
    : null;

  const selectedLendings = selectedWerkzeugId
    ? enrichedWerkzeugausgabe.filter(a => extractRecordId(a.fields.werkzeug_ref) === selectedWerkzeugId)
    : [];

  const selectedMaintenance = selectedWerkzeugId
    ? enrichedWartungsUndPruefungsprotokoll.filter(m => extractRecordId(m.fields.werkzeug_wartung_ref) === selectedWerkzeugId)
    : [];

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'ausgabe') {
      await LivingAppsService.deleteWerkzeugausgabeEntry(deleteTarget.id);
    } else {
      await LivingAppsService.deleteWerkzeugkatalogEntry(deleteTarget.id);
    }
    setDeleteTarget(null);
    fetchAll();
  };

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Werkzeuge gesamt"
          value={String(werkzeugkatalog.length)}
          description="Im Katalog"
          icon={<IconPackage size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Verliehen"
          value={String(lentOutIds.size)}
          description={`von ${werkzeugkatalog.length} Werkzeugen`}
          icon={<IconArrowBackUp size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Überfällig"
          value={String(overdueCount)}
          description="Nicht zurückgegeben"
          icon={<IconAlertTriangle size={18} className={overdueCount > 0 ? 'text-destructive' : 'text-muted-foreground'} />}
        />
        <StatCard
          title="Prüfungen fällig"
          value={String(upcomingInspections.length)}
          description="In den nächsten 30 Tagen"
          icon={<IconClipboardCheck size={18} className={upcomingInspections.length > 0 ? 'text-orange-500' : 'text-muted-foreground'} />}
        />
      </div>

      {/* Main workspace: tool catalog + detail panel */}
      <div className="flex flex-col lg:flex-row gap-4 min-h-0">
        {/* Left: catalog list */}
        <div className={`flex-1 min-w-0 flex flex-col gap-3 ${selectedWerkzeug ? 'lg:max-w-[55%]' : ''}`}>
          {/* Toolbar */}
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex gap-2 flex-wrap flex-1 min-w-0">
              <div className="relative flex-1 min-w-[140px] max-w-xs">
                <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0" />
                <Input
                  placeholder="Werkzeug suchen..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
              <div className="flex gap-1 flex-wrap">
                {(['alle', 'verfuegbar', 'verliehen'] as const).map(s => (
                  <Button
                    key={s}
                    variant={filterStatus === s ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setFilterStatus(s)}
                  >
                    {s === 'alle' ? 'Alle' : s === 'verfuegbar' ? 'Verfügbar' : 'Verliehen'}
                  </Button>
                ))}
              </div>
              {kategorien.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  <Button
                    variant={filterKategorie === 'alle' ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setFilterKategorie('alle')}
                  >
                    Alle Kategorien
                  </Button>
                  {kategorien.map(k => (
                    <Button
                      key={k}
                      variant={filterKategorie === k ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setFilterKategorie(k)}
                    >
                      {werkzeugkatalog.find(w => w.fields.kategorie?.key === k)?.fields.kategorie?.label ?? k}
                    </Button>
                  ))}
                </div>
              )}
            </div>
            <Button
              size="sm"
              className="h-8 shrink-0"
              onClick={() => { setEditKatalog(null); setKatalogOpen(true); }}
            >
              <IconPlus size={14} className="mr-1 shrink-0" />
              <span className="hidden sm:inline">Neues Werkzeug</span>
              <span className="sm:hidden">Neu</span>
            </Button>
          </div>

          {/* Tool cards */}
          {filteredWerkzeug.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl border border-dashed border-border">
              <IconPackage size={48} className="text-muted-foreground" stroke={1.5} />
              <p className="text-sm text-muted-foreground">Keine Werkzeuge gefunden</p>
              <Button size="sm" onClick={() => { setEditKatalog(null); setKatalogOpen(true); }}>
                <IconPlus size={14} className="mr-1" />Werkzeug hinzufügen
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto max-h-[calc(100vh-380px)]">
              {filteredWerkzeug.map(w => {
                const isLent = lentOutIds.has(w.record_id);
                const activeLending = activeLendings.find(a => extractRecordId(a.fields.werkzeug_ref) === w.record_id);
                const isOverdue = activeLending?.fields.geplante_rueckgabe && activeLending.fields.geplante_rueckgabe < today;
                const isSelected = selectedWerkzeugId === w.record_id;
                const hasInspection = w.fields.naechste_pruefung && w.fields.naechste_pruefung <= soonStr;

                return (
                  <div
                    key={w.record_id}
                    onClick={() => setSelectedWerkzeugId(isSelected ? null : w.record_id)}
                    className={`
                      relative rounded-2xl border p-3 cursor-pointer transition-all
                      ${isSelected ? 'border-primary bg-primary/5 shadow-md' : 'border-border bg-card hover:border-primary/50 hover:bg-accent/30'}
                    `}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isLent ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                        <IconTool size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-semibold text-sm text-foreground truncate">{w.fields.bezeichnung ?? '—'}</p>
                          {hasInspection && (
                            <span title="Prüfung fällig">
                              <IconAlertTriangle size={12} className="text-orange-500 shrink-0" />
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {w.fields.inventarnummer ? `#${w.fields.inventarnummer}` : ''}
                          {w.fields.hersteller ? ` · ${w.fields.hersteller}` : ''}
                          {w.fields.modell ? ` ${w.fields.modell}` : ''}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {w.fields.kategorie && (
                            <Badge variant="secondary" className="text-xs py-0 px-1.5 h-5">{w.fields.kategorie.label}</Badge>
                          )}
                          <Badge
                            className={`text-xs py-0 px-1.5 h-5 ${
                              isOverdue
                                ? 'bg-destructive/10 text-destructive border-destructive/20'
                                : isLent
                                ? 'bg-orange-100 text-orange-700 border-orange-200'
                                : 'bg-green-100 text-green-700 border-green-200'
                            }`}
                          >
                            {isOverdue ? 'Überfällig' : isLent ? 'Verliehen' : 'Verfügbar'}
                          </Badge>
                        </div>
                        {isLent && activeLending && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            <IconUser size={10} className="inline mr-0.5" />
                            {activeLending.mitarbeiter_refName || '–'}
                            {activeLending.fields.geplante_rueckgabe ? ` · bis ${formatDate(activeLending.fields.geplante_rueckgabe)}` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    {/* Action buttons */}
                    <div className="flex gap-1 mt-2 pt-2 border-t border-border/50">
                      {!isLent ? (
                        <Button
                          size="sm"
                          className="h-7 text-xs flex-1"
                          onClick={e => {
                            e.stopPropagation();
                            setPreselectedWerkzeug(w.record_id);
                            setEditAusgabe(null);
                            setAusgabeOpen(true);
                          }}
                        >
                          <IconArrowBackUp size={12} className="mr-1 shrink-0" />Ausgeben
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs flex-1"
                          onClick={e => {
                            e.stopPropagation();
                            if (activeLending) {
                              setEditAusgabe(activeLending);
                              setPreselectedWerkzeug(null);
                              setAusgabeOpen(true);
                            }
                          }}
                        >
                          <IconCalendarEvent size={12} className="mr-1 shrink-0" />Rückgabe eintragen
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 p-0"
                        onClick={e => {
                          e.stopPropagation();
                          setEditKatalog(w);
                          setKatalogOpen(true);
                        }}
                      >
                        <IconPencil size={13} className="shrink-0" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={e => {
                          e.stopPropagation();
                          setDeleteTarget({ type: 'katalog', id: w.record_id });
                        }}
                      >
                        <IconTrash size={13} className="shrink-0" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Detail panel */}
        {selectedWerkzeug && (
          <div className="lg:w-80 xl:w-96 shrink-0 flex flex-col gap-3">
            <div className="rounded-2xl border border-border bg-card p-4 overflow-hidden">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <h2 className="font-bold text-base text-foreground truncate">{selectedWerkzeug.fields.bezeichnung ?? '—'}</h2>
                  {selectedWerkzeug.fields.inventarnummer && (
                    <p className="text-xs text-muted-foreground">Inv.-Nr.: {selectedWerkzeug.fields.inventarnummer}</p>
                  )}
                </div>
                <button
                  className="text-muted-foreground hover:text-foreground text-xl leading-none shrink-0 mt-0.5"
                  onClick={() => setSelectedWerkzeugId(null)}
                  aria-label="Schließen"
                >×</button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                {selectedWerkzeug.fields.hersteller && (
                  <div><p className="text-xs text-muted-foreground">Hersteller</p><p className="font-medium truncate">{selectedWerkzeug.fields.hersteller}</p></div>
                )}
                {selectedWerkzeug.fields.modell && (
                  <div><p className="text-xs text-muted-foreground">Modell</p><p className="font-medium truncate">{selectedWerkzeug.fields.modell}</p></div>
                )}
                {selectedWerkzeug.fields.standort && (
                  <div><p className="text-xs text-muted-foreground">Standort</p><p className="font-medium truncate">{selectedWerkzeug.fields.standort}</p></div>
                )}
                {selectedWerkzeug.fields.zustand && (
                  <div><p className="text-xs text-muted-foreground">Zustand</p><p className="font-medium truncate">{selectedWerkzeug.fields.zustand.label}</p></div>
                )}
                {selectedWerkzeug.fields.naechste_pruefung && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Nächste Prüfung</p>
                    <p className={`font-medium ${selectedWerkzeug.fields.naechste_pruefung <= today ? 'text-orange-600' : ''}`}>
                      {formatDate(selectedWerkzeug.fields.naechste_pruefung)}
                    </p>
                  </div>
                )}
              </div>

              <Button
                size="sm"
                className="w-full h-8 text-xs"
                onClick={() => {
                  const isLent = lentOutIds.has(selectedWerkzeug.record_id);
                  if (!isLent) {
                    setPreselectedWerkzeug(selectedWerkzeug.record_id);
                    setEditAusgabe(null);
                    setAusgabeOpen(true);
                  } else {
                    const lending = activeLendings.find(a => extractRecordId(a.fields.werkzeug_ref) === selectedWerkzeug.record_id);
                    if (lending) {
                      setEditAusgabe(lending);
                      setPreselectedWerkzeug(null);
                      setAusgabeOpen(true);
                    }
                  }
                }}
              >
                {lentOutIds.has(selectedWerkzeug.record_id) ? (
                  <><IconCalendarEvent size={13} className="mr-1 shrink-0" />Rückgabe eintragen</>
                ) : (
                  <><IconArrowBackUp size={13} className="mr-1 shrink-0" />Werkzeug ausgeben</>
                )}
              </Button>
            </div>

            {/* Lending history */}
            {selectedLendings.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-4 overflow-hidden">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                  <IconUser size={14} className="shrink-0" />Ausgaben ({selectedLendings.length})
                </h3>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {selectedLendings.map(a => {
                    const isActive = !a.fields.tatsaechliche_rueckgabe;
                    const isOverdue = isActive && a.fields.geplante_rueckgabe && a.fields.geplante_rueckgabe < today;
                    return (
                      <div key={a.record_id} className={`rounded-xl p-2.5 text-xs border ${isOverdue ? 'border-destructive/30 bg-destructive/5' : isActive ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/30'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium truncate">{a.mitarbeiter_refName || '—'}</p>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-5 w-5 p-0"
                              onClick={() => { setEditAusgabe(a); setPreselectedWerkzeug(null); setAusgabeOpen(true); }}
                            >
                              <IconPencil size={11} className="shrink-0" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget({ type: 'ausgabe', id: a.record_id })}
                            >
                              <IconTrash size={11} className="shrink-0" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-muted-foreground mt-0.5">
                          Ausgabe: {formatDate(a.fields.ausgabedatum)}
                          {a.fields.projekt_baustelle ? ` · ${a.fields.projekt_baustelle}` : ''}
                        </p>
                        {isActive ? (
                          <p className={`mt-0.5 ${isOverdue ? 'text-destructive font-semibold' : 'text-primary'}`}>
                            {isOverdue ? '⚠ ' : ''}Geplante Rückgabe: {formatDate(a.fields.geplante_rueckgabe)}
                          </p>
                        ) : (
                          <p className="text-muted-foreground mt-0.5">Zurückgegeben: {formatDate(a.fields.tatsaechliche_rueckgabe)}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Maintenance history */}
            {selectedMaintenance.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-4 overflow-hidden">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                  <IconClipboardCheck size={14} className="shrink-0" />Wartungen ({selectedMaintenance.length})
                </h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedMaintenance.map(m => (
                    <div key={m.record_id} className="rounded-xl p-2.5 text-xs border border-border bg-muted/30">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium truncate">{m.fields.art_wartung?.label ?? '—'}</p>
                        <Badge className={`text-xs py-0 px-1.5 h-4 shrink-0 ${
                          m.fields.ergebnis?.key === 'bestanden' ? 'bg-green-100 text-green-700' :
                          m.fields.ergebnis?.key === 'nicht_bestanden' ? 'bg-destructive/10 text-destructive' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {m.fields.ergebnis?.label ?? '—'}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mt-0.5">
                        {formatDate(m.fields.datum_wartung)}
                        {m.fields.durchgefuehrt_von ? ` · ${m.fields.durchgefuehrt_von}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Active lendings overview when nothing selected */}
      {!selectedWerkzeug && activeLendings.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 overflow-hidden">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="font-semibold text-sm flex items-center gap-1.5">
              <IconBuildingWarehouse size={16} className="shrink-0" />
              Aktuelle Ausgaben ({activeLendings.length})
            </h3>
            <Button size="sm" className="h-8 text-xs" onClick={() => { setEditAusgabe(null); setPreselectedWerkzeug(null); setAusgabeOpen(true); }}>
              <IconPlus size={13} className="mr-1 shrink-0" />Neue Ausgabe
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-left py-1.5 pr-3 font-medium">Werkzeug</th>
                  <th className="text-left py-1.5 pr-3 font-medium">Mitarbeiter</th>
                  <th className="text-left py-1.5 pr-3 font-medium hidden sm:table-cell">Ausgabe</th>
                  <th className="text-left py-1.5 pr-3 font-medium">Rückgabe</th>
                  <th className="text-left py-1.5 pr-3 font-medium hidden md:table-cell">Baustelle</th>
                  <th className="py-1.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {activeLendings.map(a => {
                  const isOverdue = a.fields.geplante_rueckgabe && a.fields.geplante_rueckgabe < today;
                  return (
                    <tr key={a.record_id} className="border-b border-border/50 hover:bg-accent/20 transition-colors">
                      <td className="py-2 pr-3">
                        <p className="font-medium truncate max-w-[120px]">{a.werkzeug_refName || '—'}</p>
                      </td>
                      <td className="py-2 pr-3">
                        <p className="truncate max-w-[100px]">{a.mitarbeiter_refName || '—'}</p>
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground hidden sm:table-cell">{formatDate(a.fields.ausgabedatum)}</td>
                      <td className="py-2 pr-3">
                        <span className={isOverdue ? 'text-destructive font-semibold' : ''}>
                          {isOverdue ? '⚠ ' : ''}{formatDate(a.fields.geplante_rueckgabe)}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground hidden md:table-cell truncate max-w-[100px]">
                        {a.fields.projekt_baustelle || '—'}
                      </td>
                      <td className="py-2">
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2"
                            onClick={() => { setEditAusgabe(a); setPreselectedWerkzeug(null); setAusgabeOpen(true); }}
                          >
                            <IconPencil size={12} className="shrink-0" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget({ type: 'ausgabe', id: a.record_id })}
                          >
                            <IconTrash size={12} className="shrink-0" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <WerkzeugausgabeDialog
        open={ausgabeOpen}
        onClose={() => { setAusgabeOpen(false); setEditAusgabe(null); setPreselectedWerkzeug(null); }}
        onSubmit={async (fields) => {
          if (editAusgabe) {
            await LivingAppsService.updateWerkzeugausgabeEntry(editAusgabe.record_id, fields);
          } else {
            await LivingAppsService.createWerkzeugausgabeEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editAusgabe
          ? { ...editAusgabe.fields }
          : preselectedWerkzeug
          ? { werkzeug_ref: createRecordUrl(APP_IDS.WERKZEUGKATALOG, preselectedWerkzeug) }
          : undefined
        }
        werkzeugkatalogList={werkzeugkatalog}
        mitarbeiterverwaltungList={mitarbeiterverwaltung}
        enablePhotoScan={AI_PHOTO_SCAN['Werkzeugausgabe']}
      />

      <WerkzeugkatalogDialog
        open={katalogOpen}
        onClose={() => { setKatalogOpen(false); setEditKatalog(null); }}
        onSubmit={async (fields) => {
          if (editKatalog) {
            await LivingAppsService.updateWerkzeugkatalogEntry(editKatalog.record_id, fields);
          } else {
            await LivingAppsService.createWerkzeugkatalogEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editKatalog?.fields}
        enablePhotoScan={AI_PHOTO_SCAN['Werkzeugkatalog']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eintrag löschen"
        description="Soll dieser Eintrag wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden."
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
