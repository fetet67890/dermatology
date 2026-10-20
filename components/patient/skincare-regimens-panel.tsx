'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Sparkles, Plus } from 'lucide-react'
import { Button } from '@core/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@core/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@core/components/ui/select'
import { Field, FieldLabel } from '@core/components/ui/field'
import { Input } from '@core/components/ui/input'
import { Textarea } from '@core/components/ui/textarea'
import { useAuth } from '@core/context/auth-context'
import { getSkincareRegimens, createSkincareRegimen, updateSkincareRegimen } from '@/lib/api/skincare-regimens'
import type { SkincareRegimen, AdherenceStatus } from '@/types/specialty'
import { fmtDate } from '@core/lib/utils'

const today = () => new Date().toISOString().slice(0, 10)
const EMPTY = { regimenDescription: '', prescribedDate: today(), reviewDate: '', notes: '' }

const ADHERENCE_CHIP: Record<AdherenceStatus, string> = {
  e_mire: 'chip-green', e_pjesshme: 'chip-amber', e_dobet: 'chip-red',
}

export function SkincareRegimensPanel({ patientId }: { patientId: string }) {
  const t = useTranslations('skincare-regimens-panel')
  const { user } = useAuth()
  const canEdit = user?.role === 'admin' || user?.role === 'mjek'
  const [regimens, setRegimens] = useState<SkincareRegimen[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = () => getSkincareRegimens({ patientId }).then(setRegimens).catch(() => toast.error(t('loadError'))).finally(() => setLoading(false))
  useEffect(() => { load() }, [patientId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async () => {
    if (!user || (user.role !== 'admin' && user.role !== 'mjek') || !form.regimenDescription.trim()) return
    setSaving(true)
    try {
      const created = await createSkincareRegimen({
        patientId, doctorId: user.id, regimenDescription: form.regimenDescription.trim(),
        prescribedDate: form.prescribedDate, reviewDate: form.reviewDate || undefined,
        notes: form.notes.trim() || undefined,
      })
      setRegimens(prev => [created, ...prev])
      toast.success(t('createSuccess'))
      setOpen(false)
      setForm(EMPTY)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('createError'))
    } finally {
      setSaving(false)
    }
  }

  const handleAdherenceChange = async (regimen: SkincareRegimen, adherenceStatus: AdherenceStatus) => {
    try {
      const updated = await updateSkincareRegimen(regimen.id, { adherenceStatus })
      setRegimens(prev => prev.map(r => r.id === updated.id ? updated : r))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('updateError'))
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground py-6 text-center">{t('loading')}</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">{t('heading')}</p>
        {canEdit && (
          <Button size="sm" className="rounded-xl h-8 text-xs" onClick={() => setOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />{t('addRegimen')}
          </Button>
        )}
      </div>

      {regimens.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">{t('noRegimens')}</p>
      ) : (
        <div className="space-y-2">
          {regimens.map(r => (
            <div key={r.id} className="rounded-xl border border-border p-3 flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4 text-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{r.regimenDescription}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('prescribedLine', { date: fmtDate(r.prescribedDate), doctor: r.doctorName })}
                  {r.reviewDate ? ` · ${t('reviewLine', { date: fmtDate(r.reviewDate) })}` : ''}
                </p>
                {r.notes && <p className="text-xs text-muted-foreground mt-1">{r.notes}</p>}
                <div className="flex items-center gap-2 mt-2">
                  <FieldLabel className="text-[11px] mb-0">{t('adherenceLabel')}</FieldLabel>
                  {canEdit ? (
                    <Select value={r.adherenceStatus || '__none__'} onValueChange={(v) => v !== '__none__' && handleAdherenceChange(r, v as AdherenceStatus)}>
                      <SelectTrigger className="rounded-lg h-7 text-[11px] w-36"><SelectValue placeholder={t('notRecorded')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="e_mire">{t('adherence.e_mire')}</SelectItem>
                        <SelectItem value="e_pjesshme">{t('adherence.e_pjesshme')}</SelectItem>
                        <SelectItem value="e_dobet">{t('adherence.e_dobet')}</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">{r.adherenceStatus ? t(`adherence.${r.adherenceStatus}`) : t('notRecorded')}</span>
                  )}
                  {r.adherenceStatus && (
                    <span className={`${ADHERENCE_CHIP[r.adherenceStatus]} rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase`}>
                      {t(`adherence.${r.adherenceStatus}`)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{t('newDialog.title')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Field>
              <FieldLabel>{t('newDialog.descriptionLabel')}</FieldLabel>
              <Textarea value={form.regimenDescription} onChange={e => setForm(f => ({ ...f, regimenDescription: e.target.value }))} placeholder={t('newDialog.descriptionPlaceholder')} className="resize-none h-20" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>{t('newDialog.prescribedDateLabel')}</FieldLabel>
                <Input type="date" value={form.prescribedDate} onChange={e => setForm(f => ({ ...f, prescribedDate: e.target.value }))} />
              </Field>
              <Field>
                <FieldLabel>{t('newDialog.reviewDateLabel')}</FieldLabel>
                <Input type="date" value={form.reviewDate} onChange={e => setForm(f => ({ ...f, reviewDate: e.target.value }))} />
              </Field>
            </div>
            <Field>
              <FieldLabel>{t('newDialog.notesLabel')}</FieldLabel>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="resize-none h-14" />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleCreate} disabled={!form.regimenDescription.trim() || saving}>{saving ? t('saving') : t('confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
