import type { Werkzeugausgabe, Werkzeugkatalog, Mitarbeiterverwaltung } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface WerkzeugausgabeViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Werkzeugausgabe | null;
  onEdit: (record: Werkzeugausgabe) => void;
  werkzeugkatalogList: Werkzeugkatalog[];
  mitarbeiterverwaltungList: Mitarbeiterverwaltung[];
}

export function WerkzeugausgabeViewDialog({ open, onClose, record, onEdit, werkzeugkatalogList, mitarbeiterverwaltungList }: WerkzeugausgabeViewDialogProps) {
  function getWerkzeugkatalogDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return werkzeugkatalogList.find(r => r.record_id === id)?.fields.bezeichnung ?? '—';
  }

  function getMitarbeiterverwaltungDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return mitarbeiterverwaltungList.find(r => r.record_id === id)?.fields.vorname ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Werkzeugausgabe anzeigen</DialogTitle>
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
            <p className="text-sm">{getWerkzeugkatalogDisplayName(record.fields.werkzeug_ref)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Mitarbeiter</Label>
            <p className="text-sm">{getMitarbeiterverwaltungDisplayName(record.fields.mitarbeiter_ref)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ausgabedatum</Label>
            <p className="text-sm">{formatDate(record.fields.ausgabedatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Geplantes Rückgabedatum</Label>
            <p className="text-sm">{formatDate(record.fields.geplante_rueckgabe)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Projekt / Baustelle</Label>
            <p className="text-sm">{record.fields.projekt_baustelle ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Zustand bei Ausgabe</Label>
            <Badge variant="secondary">{record.fields.zustand_ausgabe?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Tatsächliches Rückgabedatum</Label>
            <p className="text-sm">{formatDate(record.fields.tatsaechliche_rueckgabe)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Zustand bei Rückgabe</Label>
            <Badge variant="secondary">{record.fields.zustand_rueckgabe?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bemerkungen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.bemerkung_ausgabe ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}