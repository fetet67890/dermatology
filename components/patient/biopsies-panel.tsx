'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { FlaskConical, Plus } from 'lucide-react'
import { Button } from '@core/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@core/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@core/components/ui/select'
import { Field, FieldLabel } from '@core/components/ui/field'
import { Input } from '@core/components/ui/input'
import { Textarea } from '@core/components/ui/textarea'
import { useAuth } from '@core/context/auth-context'
import { useData } from '@core/context/data-context'
import { getBiopsies, createBiopsy, updateBiopsy } from '@/lib/api/biopsies'
import type { Biopsy, BiopsyResult } from '@/types/specialty'
import { fmtDate } from '@core/lib/utils'

const RESULT_VALUES: BiopsyResult[] = ['beninj', 'atipik', 'malinj']

const RESULT_CHIP: Record<BiopsyResult, string> = {
  beninj: 'chip-neutral',
  atipik: 'chip-amber',
  malinj: 'chip-red',
}

const EMPTY = {
  site: '', doctorId: '', sentDate: new Date().toISOString().slice(0, 10), labName: '', notes: '',
}

export function BiopsiesPanel({ patientId }: { patientId: string }) {
  const t = useTranslations('biopsies-panel')
  const { user } = useAuth()
  const { staff } = useData()
  const doctors = staff.filter(s => s.role === 'mjek' && s.status === 'aktiv')
  // Writes are admin/mjek-only server-side (see biopsies.routes.js) —
  // recepsion (who can still view this via the shared PatientCard) gets a
  // read-only view instead of controls that would just 403.
  const canEdit = user?.role === 'admin' || user?.role === 'mjek'

  const [biopsies, setBiopsies] = useState<Biopsy[]>([])
  const [loading, setLoading] = useState(true)
  const [newOpen, setNewOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      setBiopsies(await getBiopsies({ patientId }))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('loadError'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [patientId]) // eslint-disable-line react-hooks/exhaustive-deps

  const openNew = () => {
    setForm({ ...EMPTY, doctorId: user?.role === 'mjek' ? user.id : '' })
    setNewOpen(true)
  }

  const handleCreate = async () => {
    if (!form.site.trim() || !form.doctorId) return
    setSaving(true)
    try {
      const created = await createBiopsy({
        patientId,
        doctorId: form.doctorId,
        site: form.site.trim(),
        sentDate: form.sentDate,
        labName: form.labName.trim() || undefined,
        notes: form.notes.trim() || undefined,
      })
      setBiopsies(prev => [created, ...prev])
      toast.success(t('createSuccess'))
      setNewOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('createError'))
    } finally {
      setSaving(false)
    }
  }

  // Setting a result implies the sample's been received — the server
  // infers status/receivedDate from this alone (see biopsies.controller.js).
  const handleResultChange = async (biopsy: Biopsy, result: BiopsyResult) => {
    try {
      const updated = await updateBiopsy(biopsy.id, { result })
      setBiopsies(prev => prev.map(b => b.id === updated.id ? updated : b))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('updateError'))
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground py-6 text-center">{t('loading')}</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">{t('heading')}</p>
        {canEdit && (
          <Button size="sm" className="rounded-xl h-8 text-xs" onClick={openNew}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            {t('addBiopsy')}
          </Button>
        )}
      </div>

      {biopsies.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">{t('noBiopsies')}</p>
      ) : (
        <div className="space-y-2">
          {biopsies.map(biopsy => (
            <div key={biopsy.id} className="rounded-xl border border-border p-3">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <FlaskConical className="h-4 w-4 text-accent" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{biopsy.site}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('sentLine', { date: fmtDate(biopsy.sentDate), doctor: biopsy.doctorName })}
                    {biopsy.labName ? ` · ${biopsy.labName}` : ''}
                  </p>
                  {biopsy.notes && <p className="text-xs text-muted-foreground mt-1">{biopsy.notes}</p>}
                </div>
                {!biopsy.result && (
                  <span className="chip-amber rounded-full px-2 py-0.5 text-[10px] font-medium uppercase shrink-0">
                    {t('status.ne_pritje')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-3 ml-12">
                <FieldLabel className="text-[11px] mb-0 shrink-0">{t('resultLabel')}</FieldLabel>
                {canEdit ? (
                  <Select
                    value={biopsy.result || '__none__'}
                    onValueChange={(v) => v !== '__none__' && handleResultChange(biopsy, v as BiopsyResult)}
                  >
                    <SelectTrigger className="rounded-lg h-7 text-[11px] w-40">
                      <SelectValue placeholder={t('notRecorded')} />
                    </SelectTrigger>
                    <SelectContent>
                      {RESULT_VALUES.map(r => <SelectItem key={r} value={r}>{t(`result.${r}`)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-[11px] text-muted-foreground">{biopsy.result ? t(`result.${biopsy.result}`) : t('notRecorded')}</span>
                )}
                {biopsy.result && (
                  <span className={`${RESULT_CHIP[biopsy.result]} rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase shrink-0`}>
                    {t(`result.${biopsy.result}`)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('newDialog.title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Field>
              <FieldLabel>{t('newDialog.siteLabel')}</FieldLabel>
              <Input
                value={form.site}
                onChange={e => setForm(f => ({ ...f, site: e.target.value }))}
                placeholder={t('newDialog.sitePlaceholder')}
              />
            </Field>
            <Field>
              <FieldLabel>{t('newDialog.doctorLabel')}</FieldLabel>
              <Select value={form.doctorId} onValueChange={v => setForm(f => ({ ...f, doctorId: v }))}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder={t('newDialog.doctorPlaceholder')} /></SelectTrigger>
                <SelectContent>
                  {doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>{t('newDialog.sentDateLabel')}</FieldLabel>
              <Input
                type="date"
                value={form.sentDate}
                onChange={e => setForm(f => ({ ...f, sentDate: e.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel>{t('newDialog.labNameLabel')}</FieldLabel>
              <Input
                value={form.labName}
                onChange={e => setForm(f => ({ ...f, labName: e.target.value }))}
                placeholder={t('newDialog.labNamePlaceholder')}
              />
            </Field>
            <Field>
              <FieldLabel>{t('newDialog.notesLabel')}</FieldLabel>
              <Textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="resize-none h-16"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleCreate} disabled={!form.site.trim() || !form.doctorId || saving}>
              {saving ? t('saving') : t('newDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
