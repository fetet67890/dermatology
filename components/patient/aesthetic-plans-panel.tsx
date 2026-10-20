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
import { useData } from '@core/context/data-context'
import { getAestheticPlans, createAestheticPlan, updateAestheticPlan } from '@/lib/api/aesthetic-plans'
import type { AestheticPlan } from '@/types/specialty'
import { fmtLEK } from '@core/lib/currency'
import { fmtDate } from '@core/lib/utils'

const STATUS_CHIP: Record<AestheticPlan['status'], string> = {
  planifikuar: 'chip-amber',
  ne_proces:   'chip-blue',
  perfunduar:  'chip-green',
}

const EMPTY = { procedureType: '', bodyArea: '', doctorId: '', cost: '', notes: '' }

export function AestheticPlansPanel({ patientId }: { patientId: string }) {
  const t = useTranslations('aesthetic-plans-panel')
  const { user } = useAuth()
  const { staff } = useData()
  const doctors = staff.filter(s => s.role === 'mjek' && s.status === 'aktiv')
  // Writes are admin/mjek-only server-side (see aesthetic-plans.routes.js) —
  // recepsion (who can still view this via the shared PatientCard) gets a
  // read-only view instead of controls that would just 403.
  const canEdit = user?.role === 'admin' || user?.role === 'mjek'

  const [plans, setPlans] = useState<AestheticPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [newOpen, setNewOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      setPlans(await getAestheticPlans({ patientId }))
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
    if (!form.procedureType.trim() || !form.bodyArea.trim() || !form.doctorId) return
    setSaving(true)
    try {
      const created = await createAestheticPlan({
        patientId,
        doctorId: form.doctorId,
        procedureType: form.procedureType.trim(),
        bodyArea: form.bodyArea.trim(),
        cost: form.cost ? Number(form.cost) : undefined,
        notes: form.notes.trim() || undefined,
      })
      setPlans(prev => [created, ...prev])
      toast.success(t('createSuccess'))
      setNewOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('createError'))
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (plan: AestheticPlan, status: AestheticPlan['status']) => {
    try {
      const updated = await updateAestheticPlan(plan.id, { status })
      setPlans(prev => prev.map(p => p.id === updated.id ? updated : p))
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
            {t('addPlan')}
          </Button>
        )}
      </div>

      {plans.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">{t('noPlans')}</p>
      ) : (
        <div className="space-y-2">
          {plans.map(p => (
            <div key={p.id} className="rounded-xl border border-border p-3 flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4 text-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-foreground truncate">{p.procedureType}</p>
                  <span className={`${STATUS_CHIP[p.status]} rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide`}>
                    {t(`status.${p.status}`)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('areaLine', { area: p.bodyArea })}{p.cost ? ` · ${fmtLEK(p.cost)}` : ''}
                </p>
                <p className="text-xs text-muted-foreground/70">
                  {t('createdLine', { date: fmtDate(p.createdAt), doctor: p.doctorName })}
                </p>
                {p.notes && <p className="text-xs text-muted-foreground mt-1">{p.notes}</p>}
              </div>
              {canEdit ? (
                <Select value={p.status} onValueChange={(v) => handleStatusChange(p, v as AestheticPlan['status'])}>
                  <SelectTrigger className="rounded-xl h-7 w-28 text-[11px] shrink-0"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['planifikuar', 'ne_proces', 'perfunduar'] as const).map(s => (
                      <SelectItem key={s} value={s}>{t(`status.${s}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className={`${STATUS_CHIP[p.status]} rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide shrink-0`}>
                  {t(`status.${p.status}`)}
                </span>
              )}
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
              <FieldLabel>{t('newDialog.procedureLabel')}</FieldLabel>
              <Input
                value={form.procedureType}
                onChange={e => setForm(f => ({ ...f, procedureType: e.target.value }))}
                placeholder={t('newDialog.procedurePlaceholder')}
              />
            </Field>
            <Field>
              <FieldLabel>{t('newDialog.areaLabel')}</FieldLabel>
              <Input
                value={form.bodyArea}
                onChange={e => setForm(f => ({ ...f, bodyArea: e.target.value }))}
                placeholder={t('newDialog.areaPlaceholder')}
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
              <FieldLabel>{t('newDialog.costLabel')}</FieldLabel>
              <Input
                type="number" min="0"
                value={form.cost}
                onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
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
            <Button onClick={handleCreate} disabled={!form.procedureType.trim() || !form.bodyArea.trim() || !form.doctorId || saving}>
              {saving ? t('saving') : t('newDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
