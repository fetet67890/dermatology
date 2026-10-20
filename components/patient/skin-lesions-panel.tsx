'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Plus, TrendingUp, AlertTriangle, Ruler } from 'lucide-react'
import { Button } from '@core/components/ui/button'
import { Badge } from '@core/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@core/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@core/components/ui/select'
import { Field, FieldLabel } from '@core/components/ui/field'
import { Input } from '@core/components/ui/input'
import { Textarea } from '@core/components/ui/textarea'
import { Checkbox } from '@core/components/ui/checkbox'
import { Label } from '@core/components/ui/label'
import { useAuth } from '@core/context/auth-context'
import { useData } from '@core/context/data-context'
import {
  getSkinLesions, createSkinLesion, updateSkinLesion, deleteSkinLesion,
  getLesionMeasurements, addLesionMeasurement,
} from '@/lib/api/skin-lesions'
import type { SkinLesion, LesionMeasurement } from '@/types/specialty'
import { fmtDate } from '@core/lib/utils'

const STATUS_CHIP: Record<SkinLesion['status'], string> = {
  aktiv:    'chip-amber',
  zgjidhur: 'chip-green',
  hequr:    'chip-neutral',
}

// Real body outline (CC0, Wikimedia Commons — see public/body-silhouette/
// SOURCE.md), not a hand-drawn shape. The <img> sits in normal document
// flow at width:100%/height:auto, so its rendered box keeps the source
// SVG's real proportions — the wrapping div's size *is* that box, nothing
// else needs measuring. Markers are plain positioned buttons (not an SVG
// overlay), so they stay perfectly circular regardless of the body
// silhouette's own aspect ratio; percentages map 1:1 to CSS left/top.
function BodySilhouette({
  bodyView, markers, onPlace, placing,
}: {
  bodyView: 'perpara' | 'pas'
  markers: { id: string; x: number; y: number; color: string; onClick: () => void }[]
  onPlace: (x: number, y: number) => void
  placing: boolean
}) {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!placing) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    onPlace(
      Math.max(0, Math.min(100, Math.round(x * 100) / 100)),
      Math.max(0, Math.min(100, Math.round(y * 100) / 100))
    )
  }

  return (
    <div
      onClick={handleClick}
      className={`relative w-full select-none ${placing ? 'cursor-crosshair' : ''}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/body-silhouette/${bodyView}.svg`}
        alt="Harta e trupit"
        className="w-full h-auto pointer-events-none"
        draggable={false}
      />
      {markers.map(m => (
        <button
          key={m.id}
          type="button"
          onClick={(e) => { e.stopPropagation(); m.onClick() }}
          className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm cursor-pointer"
          style={{ left: `${m.x}%`, top: `${m.y}%`, backgroundColor: m.color }}
          aria-label="Lezion"
        />
      ))}
    </div>
  )
}

const EMPTY_NEW = { bodyLocation: '', doctorId: '', firstNotedDate: new Date().toISOString().slice(0, 10), notes: '' }
const EMPTY_MEASUREMENT = { sizeMm: '', color: '', asymmetry: false, borderIrregular: false, colorVariation: false, notes: '' }

export function SkinLesionsPanel({ patientId }: { patientId: string }) {
  const t = useTranslations('skin-lesions-panel')
  const { user } = useAuth()
  const { staff } = useData()
  const doctors = staff.filter(s => s.role === 'mjek' && s.status === 'aktiv')
  // Recording lesion data is a clinical judgment call — the API only lets
  // admin/mjek write it (see skin-lesions.routes.js), so recepsion (who can
  // still view this panel via the shared PatientCard) gets a read-only view
  // instead of buttons that would just 403.
  const canEdit = user?.role === 'admin' || user?.role === 'mjek'

  const [lesions, setLesions] = useState<SkinLesion[]>([])
  const [loading, setLoading] = useState(true)
  const [bodyView, setBodyView] = useState<'perpara' | 'pas'>('perpara')

  const [placing, setPlacing] = useState(false)
  const [pendingLocation, setPendingLocation] = useState<{ x: number; y: number } | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [newForm, setNewForm] = useState(EMPTY_NEW)
  const [saving, setSaving] = useState(false)

  const [detailLesion, setDetailLesion] = useState<SkinLesion | null>(null)
  const [measurements, setMeasurements] = useState<LesionMeasurement[]>([])
  const [measurementsLoading, setMeasurementsLoading] = useState(false)
  const [measurementForm, setMeasurementForm] = useState(EMPTY_MEASUREMENT)
  const [addingMeasurement, setAddingMeasurement] = useState(false)

  const load = async () => {
    try {
      const data = await getSkinLesions({ patientId })
      setLesions(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('loadError'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [patientId]) // eslint-disable-line react-hooks/exhaustive-deps

  const visibleLesions = useMemo(
    () => lesions.filter(l => (l.bodyView || 'perpara') === bodyView && l.locationX != null && l.locationY != null),
    [lesions, bodyView]
  )

  const markerColor = (l: SkinLesion) => {
    if (l.status !== 'aktiv') return '#94a3b8'
    if (l.trend === 'po_perkeqesohet') return '#ef4444'
    return '#f59e0b'
  }

  const openMap = () => setPlacing(true)

  const handlePlace = (x: number, y: number) => {
    setPlacing(false)
    setPendingLocation({ x, y })
    setNewForm({ ...EMPTY_NEW, doctorId: user?.role === 'mjek' ? user.id : '' })
    setNewOpen(true)
  }

  const openPlainNew = () => {
    setPendingLocation(null)
    setNewForm({ ...EMPTY_NEW, doctorId: user?.role === 'mjek' ? user.id : '' })
    setNewOpen(true)
  }

  const handleCreate = async () => {
    if (!newForm.bodyLocation.trim() || !newForm.doctorId) return
    setSaving(true)
    try {
      const created = await createSkinLesion({
        patientId,
        doctorId: newForm.doctorId,
        bodyLocation: newForm.bodyLocation.trim(),
        locationX: pendingLocation?.x,
        locationY: pendingLocation?.y,
        bodyView,
        firstNotedDate: newForm.firstNotedDate,
        notes: newForm.notes.trim() || undefined,
      })
      setLesions(prev => [created, ...prev])
      toast.success(t('createSuccess'))
      setNewOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('createError'))
    } finally {
      setSaving(false)
    }
  }

  const openDetail = async (lesion: SkinLesion) => {
    setDetailLesion(lesion)
    setMeasurementForm(EMPTY_MEASUREMENT)
    setMeasurementsLoading(true)
    try {
      const data = await getLesionMeasurements(lesion.id)
      setMeasurements(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('loadError'))
    } finally {
      setMeasurementsLoading(false)
    }
  }

  const handleStatusChange = async (status: SkinLesion['status']) => {
    if (!detailLesion) return
    try {
      const updated = await updateSkinLesion(detailLesion.id, { status })
      setLesions(prev => prev.map(l => l.id === updated.id ? updated : l))
      setDetailLesion(updated)
      toast.success(t('statusUpdated'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('updateError'))
    }
  }

  const handleAddMeasurement = async () => {
    if (!detailLesion || !measurementForm.sizeMm) return
    setAddingMeasurement(true)
    try {
      const created = await addLesionMeasurement(detailLesion.id, {
        sizeMm: Number(measurementForm.sizeMm),
        color: measurementForm.color.trim() || undefined,
        asymmetry: measurementForm.asymmetry,
        borderIrregular: measurementForm.borderIrregular,
        colorVariation: measurementForm.colorVariation,
        notes: measurementForm.notes.trim() || undefined,
        recordedAt: new Date().toISOString().slice(0, 10),
      })
      setMeasurements(prev => [created, ...prev])
      setMeasurementForm(EMPTY_MEASUREMENT)
      // Refresh the list so the trend/latestMeasurement badges stay in sync.
      load()
      toast.success(t('measurementAdded'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('createError'))
    } finally {
      setAddingMeasurement(false)
    }
  }

  const handleDelete = async (lesion: SkinLesion) => {
    try {
      await deleteSkinLesion(lesion.id)
      setLesions(prev => prev.filter(l => l.id !== lesion.id))
      setDetailLesion(null)
      toast.success(t('deleteSuccess'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('deleteError'))
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground py-6 text-center">{t('loading')}</p>
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm font-medium text-foreground">{t('heading')}</p>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-border overflow-hidden">
            {(['perpara', 'pas'] as const).map(v => (
              <button
                key={v}
                onClick={() => { setBodyView(v); setPlacing(false) }}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${bodyView === v ? 'bg-accent text-accent-foreground' : 'bg-transparent text-muted-foreground hover:bg-secondary/50'}`}
              >
                {t(`view.${v}`)}
              </button>
            ))}
          </div>
          {canEdit && (
            <>
              <Button
                size="sm"
                variant={placing ? 'default' : 'outline'}
                className="rounded-xl h-8 text-xs"
                onClick={() => setPlacing(p => !p)}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                {placing ? t('cancelPlacing') : t('placeOnMap')}
              </Button>
              <Button size="sm" variant="ghost" className="rounded-xl h-8 text-xs" onClick={openPlainNew}>
                {t('addWithoutLocation')}
              </Button>
            </>
          )}
        </div>
      </div>

      {placing && (
        <p className="text-xs ic-amber bg-[var(--p-amber-bg,rgba(245,158,11,0.1))] rounded-lg px-3 py-2">{t('placingHint')}</p>
      )}

      <div className="grid sm:grid-cols-[220px_1fr] gap-5">
        <div className="rounded-xl border border-border/50 bg-secondary/20 p-3">
          <BodySilhouette
            bodyView={bodyView}
            placing={placing}
            onPlace={handlePlace}
            markers={visibleLesions.map(l => ({
              id: l.id, x: l.locationX!, y: l.locationY!, color: markerColor(l),
              onClick: () => openDetail(l),
            }))}
          />
        </div>

        <div className="space-y-2">
          {lesions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">{t('noLesions')}</p>
          ) : (
            lesions.map(l => (
              <button
                key={l.id}
                onClick={() => openDetail(l)}
                className="w-full text-left rounded-xl border border-border p-3 flex items-start gap-3 hover:border-accent/40 hover:bg-secondary/30 transition-colors"
              >
                <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <Ruler className="h-4 w-4 text-accent" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground truncate">{l.bodyLocation}</p>
                    <span className={`${STATUS_CHIP[l.status]} rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide`}>
                      {t(`status.${l.status}`)}
                    </span>
                    {l.trend === 'po_perkeqesohet' && (
                      <span className="chip-red rounded-full px-2 py-0.5 text-[10px] font-medium flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />{t('trend.worsening')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('firstNotedLine', { date: fmtDate(l.firstNotedDate) })}
                    {l.latestMeasurement ? ` · ${t('latestSizeLine', { size: l.latestMeasurement.sizeMm })}` : ''}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* New lesion dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('newDialog.title')}</DialogTitle>
            {pendingLocation && <DialogDescription>{t('newDialog.locationPinned')}</DialogDescription>}
          </DialogHeader>
          <div className="space-y-3">
            <Field>
              <FieldLabel>{t('newDialog.locationLabel')}</FieldLabel>
              <Input
                value={newForm.bodyLocation}
                onChange={e => setNewForm(f => ({ ...f, bodyLocation: e.target.value }))}
                placeholder={t('newDialog.locationPlaceholder')}
              />
            </Field>
            <Field>
              <FieldLabel>{t('newDialog.doctorLabel')}</FieldLabel>
              <Select value={newForm.doctorId} onValueChange={v => setNewForm(f => ({ ...f, doctorId: v }))}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder={t('newDialog.doctorPlaceholder')} /></SelectTrigger>
                <SelectContent>
                  {doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>{t('newDialog.firstNotedLabel')}</FieldLabel>
              <Input
                type="date"
                value={newForm.firstNotedDate}
                onChange={e => setNewForm(f => ({ ...f, firstNotedDate: e.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel>{t('newDialog.notesLabel')}</FieldLabel>
              <Textarea
                value={newForm.notes}
                onChange={e => setNewForm(f => ({ ...f, notes: e.target.value }))}
                className="resize-none h-16"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleCreate} disabled={!newForm.bodyLocation.trim() || !newForm.doctorId || saving}>
              {saving ? t('saving') : t('newDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lesion detail dialog */}
      <Dialog open={!!detailLesion} onOpenChange={(o) => !o && setDetailLesion(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          {detailLesion && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 flex-wrap">
                  {detailLesion.bodyLocation}
                  {detailLesion.trend === 'po_perkeqesohet' && (
                    <span className="chip-red rounded-full px-2 py-0.5 text-[10px] font-medium flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />{t('trend.worsening')}
                    </span>
                  )}
                </DialogTitle>
                <DialogDescription>{t('firstNotedLine', { date: fmtDate(detailLesion.firstNotedDate) })}</DialogDescription>
              </DialogHeader>

              <div className="flex items-center gap-2">
                <FieldLabel className="mb-0">{t('detail.statusLabel')}</FieldLabel>
                {canEdit ? (
                  <Select value={detailLesion.status} onValueChange={(v) => handleStatusChange(v as SkinLesion['status'])}>
                    <SelectTrigger className="rounded-xl h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(['aktiv', 'zgjidhur', 'hequr'] as const).map(s => (
                        <SelectItem key={s} value={s}>{t(`status.${s}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className={`${STATUS_CHIP[detailLesion.status]} rounded-full px-2 py-0.5 text-xs font-medium`}>
                    {t(`status.${detailLesion.status}`)}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('detail.measurementsHeading')}</p>
                {measurementsLoading ? (
                  <p className="text-sm text-muted-foreground py-3 text-center">{t('loading')}</p>
                ) : measurements.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-3 text-center">{t('detail.noMeasurements')}</p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {measurements.map(m => (
                      <div key={m.id} className="rounded-lg border border-border/50 p-2.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-foreground">{t('measurementSizeLabel', { size: m.sizeMm })}</span>
                          <span className="text-muted-foreground">{fmtDate(m.recordedAt)}</span>
                        </div>
                        {(m.asymmetry || m.borderIrregular || m.colorVariation) && (
                          <div className="flex gap-1 flex-wrap mt-1">
                            {m.asymmetry && <Badge variant="outline" className="text-[10px]">{t('abcd.asymmetry')}</Badge>}
                            {m.borderIrregular && <Badge variant="outline" className="text-[10px]">{t('abcd.border')}</Badge>}
                            {m.colorVariation && <Badge variant="outline" className="text-[10px]">{t('abcd.color')}</Badge>}
                          </div>
                        )}
                        {m.notes && <p className="text-muted-foreground mt-1">{m.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {canEdit && (
                <div className="space-y-2.5 rounded-xl border border-border/50 p-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('detail.addMeasurementHeading')}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Field>
                      <FieldLabel>{t('detail.sizeLabel')}</FieldLabel>
                      <Input
                        type="number" step="0.1" min="0"
                        value={measurementForm.sizeMm}
                        onChange={e => setMeasurementForm(f => ({ ...f, sizeMm: e.target.value }))}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>{t('detail.colorLabel')}</FieldLabel>
                      <Input
                        value={measurementForm.color}
                        onChange={e => setMeasurementForm(f => ({ ...f, color: e.target.value }))}
                      />
                    </Field>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {(['asymmetry', 'borderIrregular', 'colorVariation'] as const).map(key => (
                      <div key={key} className="flex items-center gap-2">
                        <Checkbox
                          id={`lesion-${key}`}
                          checked={measurementForm[key]}
                          onCheckedChange={(c) => setMeasurementForm(f => ({ ...f, [key]: c === true }))}
                        />
                        <Label htmlFor={`lesion-${key}`} className="text-xs font-normal cursor-pointer">
                          {t(`abcd.${key === 'asymmetry' ? 'asymmetry' : key === 'borderIrregular' ? 'border' : 'color'}`)}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <Textarea
                    placeholder={t('detail.measurementNotesPlaceholder')}
                    value={measurementForm.notes}
                    onChange={e => setMeasurementForm(f => ({ ...f, notes: e.target.value }))}
                    className="resize-none h-14"
                  />
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={handleAddMeasurement}
                    disabled={!measurementForm.sizeMm || addingMeasurement}
                  >
                    {addingMeasurement ? t('saving') : t('detail.addMeasurementButton')}
                  </Button>
                </div>
              )}

              <DialogFooter>
                {canEdit && (
                  <Button variant="ghost" className="text-destructive hover:text-destructive mr-auto" onClick={() => handleDelete(detailLesion)}>
                    {t('detail.deleteLesion')}
                  </Button>
                )}
                <Button variant="outline" onClick={() => setDetailLesion(null)}>{t('cancel')}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
