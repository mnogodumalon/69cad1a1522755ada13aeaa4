import { useState, useEffect, useRef, useCallback } from 'react';
import type { Werkzeugausgabe, Werkzeugkatalog, Mitarbeiterverwaltung } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId, createRecordUrl, cleanFieldsForApi, getUserProfile } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { IconCamera, IconCircleCheck, IconFileText, IconLoader2, IconPhotoPlus, IconSparkles, IconUpload, IconX } from '@tabler/icons-react';
import { fileToDataUri, extractFromPhoto, extractPhotoMeta, reverseGeocode } from '@/lib/ai';
import { lookupKey } from '@/lib/formatters';

interface WerkzeugausgabeDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: Werkzeugausgabe['fields']) => Promise<void>;
  defaultValues?: Werkzeugausgabe['fields'];
  werkzeugkatalogList: Werkzeugkatalog[];
  mitarbeiterverwaltungList: Mitarbeiterverwaltung[];
  enablePhotoScan?: boolean;
  enablePhotoLocation?: boolean;
}

export function WerkzeugausgabeDialog({ open, onClose, onSubmit, defaultValues, werkzeugkatalogList, mitarbeiterverwaltungList, enablePhotoScan = true, enablePhotoLocation = true }: WerkzeugausgabeDialogProps) {
  const [fields, setFields] = useState<Partial<Werkzeugausgabe['fields']>>({});
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [usePersonalInfo, setUsePersonalInfo] = useState(() => {
    try { return localStorage.getItem('ai-use-personal-info') === 'true'; } catch { return false; }
  });
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setFields(defaultValues ?? {});
      setPreview(null);
      setScanSuccess(false);
    }
  }, [open, defaultValues]);
  useEffect(() => {
    try { localStorage.setItem('ai-use-personal-info', String(usePersonalInfo)); } catch {}
  }, [usePersonalInfo]);
  async function handleShowProfileInfo() {
    if (showProfileInfo) { setShowProfileInfo(false); return; }
    setProfileLoading(true);
    try {
      const p = await getUserProfile();
      setProfileData(p);
    } catch {
      setProfileData(null);
    } finally {
      setProfileLoading(false);
      setShowProfileInfo(true);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const clean = cleanFieldsForApi({ ...fields }, 'werkzeugausgabe');
      await onSubmit(clean as Werkzeugausgabe['fields']);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoScan(file: File) {
    setScanning(true);
    setScanSuccess(false);
    try {
      const [uri, meta] = await Promise.all([fileToDataUri(file), extractPhotoMeta(file)]);
      if (file.type.startsWith('image/')) setPreview(uri);
      const gps = enablePhotoLocation ? meta?.gps ?? null : null;
      const parts: string[] = [];
      let geoAddr = '';
      if (gps) {
        geoAddr = await reverseGeocode(gps.latitude, gps.longitude);
        parts.push(`Location coordinates: ${gps.latitude}, ${gps.longitude}`);
        if (geoAddr) parts.push(`Reverse-geocoded address: ${geoAddr}`);
      }
      if (meta?.dateTime) {
        parts.push(`Date taken: ${meta.dateTime.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')}`);
      }
      const contextParts: string[] = [];
      if (parts.length) {
        contextParts.push(`<photo-metadata>\nThe following metadata was extracted from the photo\'s EXIF data:\n${parts.join('\n')}\n</photo-metadata>`);
      }
      contextParts.push(`<available-records field="werkzeug_ref" entity="Werkzeugkatalog">\n${JSON.stringify(werkzeugkatalogList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      contextParts.push(`<available-records field="mitarbeiter_ref" entity="Mitarbeiterverwaltung">\n${JSON.stringify(mitarbeiterverwaltungList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      if (usePersonalInfo) {
        try {
          const profile = await getUserProfile();
          contextParts.push(`<user-profile>\nThe following is the logged-in user\'s personal information. Use this to pre-fill relevant fields like name, email, address, company etc. when appropriate:\n${JSON.stringify(profile, null, 2)}\n</user-profile>`);
        } catch (err) {
          console.warn('Failed to fetch user profile:', err);
        }
      }
      const photoContext = contextParts.length ? contextParts.join('\n') : undefined;
      const schema = `{\n  "werkzeug_ref": string | null, // Display name from Werkzeugkatalog (see <available-records>)\n  "mitarbeiter_ref": string | null, // Display name from Mitarbeiterverwaltung (see <available-records>)\n  "ausgabedatum": string | null, // YYYY-MM-DD\n  "geplante_rueckgabe": string | null, // YYYY-MM-DD\n  "projekt_baustelle": string | null, // Projekt / Baustelle\n  "zustand_ausgabe": LookupValue | null, // Zustand bei Ausgabe (select one key: "neuwertig" | "gut" | "gebraucht") mapping: neuwertig=Neuwertig, gut=Gut, gebraucht=Gebraucht\n  "tatsaechliche_rueckgabe": string | null, // YYYY-MM-DD\n  "zustand_rueckgabe": LookupValue | null, // Zustand bei Rückgabe (select one key: "neuwertig" | "gut" | "gebraucht" | "defekt") mapping: neuwertig=Neuwertig, gut=Gut, gebraucht=Gebraucht, defekt=Defekt\n  "bemerkung_ausgabe": string | null, // Bemerkungen\n}`;
      const raw = await extractFromPhoto<Record<string, unknown>>(uri, schema, photoContext, DIALOG_INTENT);
      setFields(prev => {
        const merged = { ...prev } as Record<string, unknown>;
        function matchName(name: string, candidates: string[]): boolean {
          const n = name.toLowerCase().trim();
          return candidates.some(c => c.toLowerCase().includes(n) || n.includes(c.toLowerCase()));
        }
        const applookupKeys = new Set<string>(["werkzeug_ref", "mitarbeiter_ref"]);
        for (const [k, v] of Object.entries(raw)) {
          if (applookupKeys.has(k)) continue;
          if (v != null) merged[k] = v;
        }
        const werkzeug_refName = raw['werkzeug_ref'] as string | null;
        if (werkzeug_refName) {
          const werkzeug_refMatch = werkzeugkatalogList.find(r => matchName(werkzeug_refName!, [String(r.fields.bezeichnung ?? '')]));
          if (werkzeug_refMatch) merged['werkzeug_ref'] = createRecordUrl(APP_IDS.WERKZEUGKATALOG, werkzeug_refMatch.record_id);
        }
        const mitarbeiter_refName = raw['mitarbeiter_ref'] as string | null;
        if (mitarbeiter_refName) {
          const mitarbeiter_refMatch = mitarbeiterverwaltungList.find(r => matchName(mitarbeiter_refName!, [[r.fields.vorname ?? '', r.fields.nachname ?? ''].filter(Boolean).join(' ')]));
          if (mitarbeiter_refMatch) merged['mitarbeiter_ref'] = createRecordUrl(APP_IDS.MITARBEITERVERWALTUNG, mitarbeiter_refMatch.record_id);
        }
        return merged as Partial<Werkzeugausgabe['fields']>;
      });
      setScanSuccess(true);
      setTimeout(() => setScanSuccess(false), 3000);
    } catch (err) {
      console.error('Scan fehlgeschlagen:', err);
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setScanning(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handlePhotoScan(f);
    e.target.value = '';
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      handlePhotoScan(file);
    }
  }, []);

  const DIALOG_INTENT = defaultValues ? 'Werkzeugausgabe bearbeiten' : 'Werkzeugausgabe hinzufügen';

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{DIALOG_INTENT}</DialogTitle>
        </DialogHeader>

        {enablePhotoScan && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div>
              <div className="flex items-center gap-1.5 font-medium">
                <IconSparkles className="h-4 w-4 text-primary" />
                KI-Assistent
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Versteht deine Fotos / Dokumente und füllt alles für dich aus</p>
            </div>
            <div className="flex items-start gap-2 pl-0.5">
              <Checkbox
                id="ai-use-personal-info"
                checked={usePersonalInfo}
                onCheckedChange={(v) => setUsePersonalInfo(!!v)}
                className="mt-0.5"
              />
              <span className="text-xs text-muted-foreground leading-snug">
                <Label htmlFor="ai-use-personal-info" className="text-xs font-normal text-muted-foreground cursor-pointer inline">
                  KI-Assistent darf zusätzlich Informationen zu meiner Person verwenden
                </Label>
                {' '}
                <button type="button" onClick={handleShowProfileInfo} className="text-xs text-primary hover:underline whitespace-nowrap">
                  {profileLoading ? 'Lade...' : '(mehr Infos)'}
                </button>
              </span>
            </div>
            {showProfileInfo && (
              <div className="rounded-md border bg-muted/50 p-2 text-xs max-h-40 overflow-y-auto">
                <p className="font-medium mb-1">Folgende Infos über dich können von der KI genutzt werden:</p>
                {profileData ? Object.values(profileData).map((v, i) => (
                  <span key={i}>{i > 0 && ", "}{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                )) : (
                  <span className="text-muted-foreground">Profil konnte nicht geladen werden</span>
                )}
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !scanning && fileInputRef.current?.click()}
              className={`
                relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
                ${scanning
                  ? 'border-primary/40 bg-primary/5'
                  : scanSuccess
                    ? 'border-green-500/40 bg-green-50/50 dark:bg-green-950/20'
                    : dragOver
                      ? 'border-primary bg-primary/10 scale-[1.01]'
                      : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }
              `}
            >
              {scanning ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <IconLoader2 className="h-7 w-7 text-primary animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">KI analysiert...</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Felder werden automatisch ausgefüllt</p>
                  </div>
                </div>
              ) : scanSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <IconCircleCheck className="h-7 w-7 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">Felder ausgefüllt!</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Prüfe die Werte und passe sie ggf. an</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/8 flex items-center justify-center">
                    <IconPhotoPlus className="h-7 w-7 text-primary/70" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Foto oder Dokument hierher ziehen oder auswählen</p>
                  </div>
                </div>
              )}

              {preview && !scanning && (
                <div className="absolute top-2 right-2">
                  <div className="relative group">
                    <img src={preview} alt="" className="h-10 w-10 rounded-md object-cover border shadow-sm" />
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setPreview(null); }}
                      className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-muted-foreground/80 text-white flex items-center justify-center"
                    >
                      <IconX className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" className="flex-1 h-9 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); cameraInputRef.current?.click(); }}>
                <IconCamera className="h-3.5 w-3.5 mr-1.5" />Kamera
              </Button>
              <Button type="button" variant="outline" size="sm" className="flex-1 h-9 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                <IconUpload className="h-3.5 w-3.5 mr-1.5" />Foto wählen
              </Button>
              <Button type="button" variant="outline" size="sm" className="flex-1 h-9 text-xs" disabled={scanning}
                onClick={e => {
                  e.stopPropagation();
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'application/pdf,.pdf';
                    fileInputRef.current.click();
                    setTimeout(() => { if (fileInputRef.current) fileInputRef.current.accept = 'image/*,application/pdf'; }, 100);
                  }
                }}>
                <IconFileText className="h-3.5 w-3.5 mr-1.5" />Dokument
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="werkzeug_ref">Werkzeug</Label>
            <Select
              value={extractRecordId(fields.werkzeug_ref) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, werkzeug_ref: v === 'none' ? undefined : createRecordUrl(APP_IDS.WERKZEUGKATALOG, v) }))}
            >
              <SelectTrigger id="werkzeug_ref"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {werkzeugkatalogList.map(r => (
                  <SelectItem key={r.record_id} value={r.record_id}>
                    {r.fields.bezeichnung ?? r.record_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mitarbeiter_ref">Mitarbeiter</Label>
            <Select
              value={extractRecordId(fields.mitarbeiter_ref) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, mitarbeiter_ref: v === 'none' ? undefined : createRecordUrl(APP_IDS.MITARBEITERVERWALTUNG, v) }))}
            >
              <SelectTrigger id="mitarbeiter_ref"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {mitarbeiterverwaltungList.map(r => (
                  <SelectItem key={r.record_id} value={r.record_id}>
                    {r.fields.vorname ?? r.record_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ausgabedatum">Ausgabedatum</Label>
            <Input
              id="ausgabedatum"
              type="date"
              value={fields.ausgabedatum ?? ''}
              onChange={e => setFields(f => ({ ...f, ausgabedatum: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="geplante_rueckgabe">Geplantes Rückgabedatum</Label>
            <Input
              id="geplante_rueckgabe"
              type="date"
              value={fields.geplante_rueckgabe ?? ''}
              onChange={e => setFields(f => ({ ...f, geplante_rueckgabe: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="projekt_baustelle">Projekt / Baustelle</Label>
            <Input
              id="projekt_baustelle"
              value={fields.projekt_baustelle ?? ''}
              onChange={e => setFields(f => ({ ...f, projekt_baustelle: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zustand_ausgabe">Zustand bei Ausgabe</Label>
            <Select
              value={lookupKey(fields.zustand_ausgabe) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, zustand_ausgabe: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="zustand_ausgabe"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="neuwertig">Neuwertig</SelectItem>
                <SelectItem value="gut">Gut</SelectItem>
                <SelectItem value="gebraucht">Gebraucht</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tatsaechliche_rueckgabe">Tatsächliches Rückgabedatum</Label>
            <Input
              id="tatsaechliche_rueckgabe"
              type="date"
              value={fields.tatsaechliche_rueckgabe ?? ''}
              onChange={e => setFields(f => ({ ...f, tatsaechliche_rueckgabe: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zustand_rueckgabe">Zustand bei Rückgabe</Label>
            <Select
              value={lookupKey(fields.zustand_rueckgabe) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, zustand_rueckgabe: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="zustand_rueckgabe"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="neuwertig">Neuwertig</SelectItem>
                <SelectItem value="gut">Gut</SelectItem>
                <SelectItem value="gebraucht">Gebraucht</SelectItem>
                <SelectItem value="defekt">Defekt</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bemerkung_ausgabe">Bemerkungen</Label>
            <Textarea
              id="bemerkung_ausgabe"
              value={fields.bemerkung_ausgabe ?? ''}
              onChange={e => setFields(f => ({ ...f, bemerkung_ausgabe: e.target.value }))}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Speichern...' : defaultValues ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}