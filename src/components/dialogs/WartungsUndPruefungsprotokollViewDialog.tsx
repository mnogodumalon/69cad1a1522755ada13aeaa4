import type { WartungsUndPruefungsprotokoll, Werkzeugkatalog } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil, IconFileText } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface WartungsUndPruefungsprotokollViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: WartungsUndPruefungsprotokoll | null;
  onEdit: (record: WartungsUndPruefungsprotokoll) => void;
  werkzeugkatalogList: Werkzeugkatalog[];
}

export function WartungsUndPruefungsprotokollViewDialog({ open, onClose, record, onEdit, werkzeugkatalogList }: WartungsUndPruefungsprotokollViewDialogProps) {
  function getWerkzeugkatalogDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return werkzeugkatalogList.find(r => r.record_id === id)?.fields.bezeichnung ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Wartungs- und Prüfungsprotokoll anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Werkzeug</Label>
            <p className="text-sm">{getWerkzeugkatalogDisplayName(record.fields.werkzeug_wartung_ref)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Datum der Wartung / Prüfung</Label>
            <p className="text-sm">{formatDate(record.fields.datum_wartung)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Art der Maßnahme</Label>
            <Badge variant="secondary">{record.fields.art_wartung?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Durchgeführt von</Label>
            <p className="text-sm">{record.fields.durchgefuehrt_von ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ergebnis</Label>
            <Badge variant="secondary">{record.fields.ergebnis?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nächste Prüfung / Wartung fällig am</Label>
            <p className="text-sm">{formatDate(record.fields.naechste_pruefung_datum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kosten (€)</Label>
            <p className="text-sm">{record.fields.kosten ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bemerkungen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.bemerkung_wartung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Prüfprotokoll / Dokument</Label>
            {record.fields.dokument_wartung ? (
              <div className="relative w-full rounded-lg bg-muted overflow-hidden border">
                <img src={record.fields.dokument_wartung} alt="" className="w-full h-auto object-contain" />
              </div>
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}