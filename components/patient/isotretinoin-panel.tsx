'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Pill, Plus, FlaskConical, Syringe } from 'lucide-react'
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
import { ApiError } from '@core/lib/api-client'
import {
  getIsotretinoinCycles, createIsotretinoinCycle, updateIsotretinoinCycle,
  addPregnancyTest, addIsotretinoinLab, createDispense,
} from '@/lib/api/isotretinoin'
import type { IsotretinoinCycle, IsotretinoinCycleStatus } from '@/types/specialty'
import { fmtDate } from '@core/lib/utils'

const STATUS_CHIP: Record<IsotretinoinCycleStatus, string> = {
  aktiv: 'chip-green', perfunduar: 'chip-neutral', ndaluar: 'chip-red',
}

const today = () => new Date().toISOString().slice(0, 10)

export function IsotretinoinPanel({ patientId }: { patientId: string }) {
  const t = useTranslations('isotretinoin-panel')
  const { user } = useAuth()
  const { staff } = useData()
  const doctors = staff.filter(s => s.role === 'mjek' && s.status === 'aktiv')
  const canEdit = user?.role === 'admin' || user?.role === 'mjek'

  const [cycles, setCycles] = useState<IsotretinoinCycle[]>([])
  const [loading, setLoading] = useState(true)
  const [newCycleOpen, setNewCycleOpen] = useState(false)
  const [cycleForm, setCycleForm] = useState({ doctorId: '', startDate: today(), targetEndDate: '', notes: '' })
  const [saving, setSaving] = useState(false)

  // Which cycle's which dialog is open — at most one at a time is enough for this UI.
  const [activeDialog, setActiveDialog] = useState<{ cycleId: string; kind: 'pregnancy' | 'lab' | 'dispense' } | null>(null)
  const [pregForm, setPregForm] = useState({ testDate: today(), result: 'negativ' as 'negativ' | 'pozitiv' })
  const [labForm, setLabForm] = useState({ testDate: today(), testType: '', resultSummary: '', isNormal: true })
  const [dispenseForm, setDispenseForm] = useState({ dispensedDate: today(), supplyDays: 30, notes: '' })

  const load = async () => {
    try {
      setCycles(await getIsotretinoinCycles({ patientId }))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('loadError'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [patientId]) // eslint-disable-line react-hooks/exhaustive-deps

  const openNewCycle = () => {
    setCycleForm({ doctorId: user?.role === 'mjek' ? user.id : '', startDate: today(), targetEndDate: '', notes: '' })
    setNewCycleOpen(true)
  }

  const handleCreateCycle = async () => {
    if (!cycleForm.doctorId) return
    setSaving(true)
    try {
      const created = await createIsotretinoinCycle({
        patientId,
        doctorId: cycleForm.doctorId,
        startDate: cycleForm.startDate,
        targetEndDate: cycleForm.targetEndDate || undefined,
        notes: cycleForm.notes.trim() || undefined,
      })
      setCycles(prev => [created, ...prev])
      toast.success(t('cycleCreateSuccess'))
      setNewCycleOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('cycleCreateError'))
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (cycle: IsotretinoinCycle, status: IsotretinoinCycleStatus) => {
    try {
      const updated = await updateIsotretinoinCycle(cycle.id, { status })
      setCycles(prev => prev.map(c => c.id === updated.id ? updated : c))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('updateError'))
    }
  }

  const closeDialog = () => setActiveDialog(null)

  const submitPregnancyTest = async () => {
    if (!activeDialog) return
    setSaving(true)
    try {
      const updated = await addPregnancyTest(activeDialog.cycleId, pregForm)
      setCycles(prev => prev.map(c => c.id === updated.id ? updated : c))
      toast.success(t('pregnancyTestAddSuccess'))
      closeDialog()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('pregnancyTestAddError'))
    } finally {
      setSaving(false)
    }
  }

  const submitLab = async () => {
    if (!activeDialog || !labForm.testType.trim()) return
    setSaving(true)
    try {
      const updated = await addIsotretinoinLab(activeDialog.cycleId, {
        testDate: labForm.testDate,
        testType: labForm.testType.trim(),
        resultSummary: labForm.resultSummary.trim() || undefined,
        isNormal: labForm.isNormal,
      })
      setCycles(prev => prev.map(c => c.id === updated.id ? updated : c))
      toast.success(t('labAddSuccess'))
      closeDialog()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('labAddError'))
    } finally {
      setSaving(false)
    }
  }

  // The one action that can be legitimately, expectedly blocked by the
  // server — a plain generic error toast would read as a bug report
  // instead of the compliance rule it actually is (see
  // isotretinoin.controller.js's createDispense). The 403 message from the
  // server is already written for staff to read directly.
  const submitDispense = async () => {
    if (!activeDialog) return
    setSaving(true)
    try {
      const updated = await createDispense(activeDialog.cycleId, dispenseForm)
      setCycles(prev => prev.map(c => c.id === updated.id ? updated : c))
      toast.success(t('dispenseAddSuccess'))
      closeDialog()
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        toast.error(err.message, { duration: 8000 })
      } else {
        toast.error(err instanceof Error ? err.message : t('dispenseAddError'))
      }
    } finally {
      setSaving(false)
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
          <Button size="sm" className="rounded-xl h-8 text-xs" onClick={openNewCycle}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            {t('startCycle')}
          </Button>
        )}
      </div>

      {cycles.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">{t('noCycles')}</p>
      ) : (
        <div className="space-y-4">
          {cycles.map(cycle => (
            <div key={cycle.id} className="rounded-xl border border-border p-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <Pill className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {t('cycleLine', { date: fmtDate(cycle.startDate), doctor: cycle.doctorName })}
                    </p>
                    {cycle.targetEndDate && (
                      <p className="text-xs text-muted-foreground mt-0.5">{t('targetEnd', { date: fmtDate(cycle.targetEndDate) })}</p>
                    )}
                  </div>
                </div>
                {canEdit && cycle.status === 'aktiv' ? (
                  <Select value={cycle.status} onValueChange={(v) => handleStatusChange(cycle, v as IsotretinoinCycleStatus)}>
                    <SelectTrigger className="rounded-lg h-7 text-[11px] w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aktiv">{t('status.aktiv')}</SelectItem>
                      <SelectItem value="perfunduar">{t('status.perfunduar')}</SelectItem>
                      <SelectItem value="ndaluar">{t('status.ndaluar')}</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <span className={`${STATUS_CHIP[cycle.status]} rounded-full px-2 py-0.5 text-[10px] font-medium uppercase shrink-0`}>
                    {t(`status.${cycle.status}`)}
                  </span>
                )}
              </div>

              {/* Pregnancy tests */}
              <div className="pl-12 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">{t('pregnancyTests')}</p>
                  {canEdit && cycle.status === 'aktiv' && (
                    <button
                      className="text-[11px] text-accent font-medium hover:underline"
                      onClick={() => { setPregForm({ testDate: today(), result: 'negativ' }); setActiveDialog({ cycleId: cycle.id, kind: 'pregnancy' }) }}
                    >
                      + {t('addTest')}
                    </button>
                  )}
                </div>
                {cycle.pregnancyTests.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t('noneRecorded')}</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {cycle.pregnancyTests.map(pt => (
                      <span key={pt.id} className={`${pt.result === 'negativ' ? 'chip-green' : 'chip-red'} rounded-full px-2 py-0.5 text-[10px] font-medium`}>
                        {fmtDate(pt.testDate)} — {t(`pregnancyResult.${pt.result}`)}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Liver-function labs */}
              <div className="pl-12 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">{t('labs')}</p>
                  {canEdit && cycle.status === 'aktiv' && (
                    <button
                      className="text-[11px] text-accent font-medium hover:underline"
                      onClick={() => { setLabForm({ testDate: today(), testType: '', resultSummary: '', isNormal: true }); setActiveDialog({ cycleId: cycle.id, kind: 'lab' }) }}
                    >
                      <FlaskConical className="inline h-3 w-3 mr-0.5" />{t('addLab')}
                    </button>
                  )}
                </div>
                {cycle.labs.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t('noneRecorded')}</p>
                ) : (
                  <div className="space-y-1">
                    {cycle.labs.map(lab => (
                      <div key={lab.id} className="flex items-center gap-2 text-xs">
                        <span className={`${lab.isNormal ? 'chip-green' : 'chip-red'} rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase shrink-0`}>
                          {lab.isNormal ? t('normal') : t('abnormal')}
                        </span>
                        <span className="text-muted-foreground">{fmtDate(lab.testDate)} — {lab.testType}{lab.resultSummary ? `: ${lab.resultSummary}` : ''}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dispenses */}
              <div className="pl-12 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">{t('dispenses')}</p>
                  {canEdit && cycle.status === 'aktiv' && (
                    <button
                      className="text-[11px] text-accent font-medium hover:underline"
                      onClick={() => { setDispenseForm({ dispensedDate: today(), supplyDays: 30, notes: '' }); setActiveDialog({ cycleId: cycle.id, kind: 'dispense' }) }}
                    >
                      <Syringe className="inline h-3 w-3 mr-0.5" />{t('addDispense')}
                    </button>
                  )}
                </div>
                {cycle.dispenses.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t('noneRecorded')}</p>
                ) : (
                  <div className="space-y-1">
                    {cycle.dispenses.map(d => (
                      <p key={d.id} className="text-xs text-muted-foreground">
                        {fmtDate(d.dispensedDate)}{d.supplyDays ? ` — ${t('supplyDays', { days: d.supplyDays })}` : ''}{d.dispensedByName ? ` · ${d.dispensedByName}` : ''}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New cycle */}
      <Dialog open={newCycleOpen} onOpenChange={setNewCycleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{t('newCycleDialog.title')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Field>
              <FieldLabel>{t('newCycleDialog.doctorLabel')}</FieldLabel>
              <Select value={cycleForm.doctorId} onValueChange={v => setCycleForm(f => ({ ...f, doctorId: v }))}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder={t('newCycleDialog.doctorPlaceholder')} /></SelectTrigger>
                <SelectContent>{doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>{t('newCycleDialog.startDateLabel')}</FieldLabel>
              <Input type="date" value={cycleForm.startDate} onChange={e => setCycleForm(f => ({ ...f, startDate: e.target.value }))} />
            </Field>
            <Field>
              <FieldLabel>{t('newCycleDialog.targetEndDateLabel')}</FieldLabel>
              <Input type="date" value={cycleForm.targetEndDate} onChange={e => setCycleForm(f => ({ ...f, targetEndDate: e.target.value }))} />
            </Field>
            <Field>
              <FieldLabel>{t('newCycleDialog.notesLabel')}</FieldLabel>
              <Textarea value={cycleForm.notes} onChange={e => setCycleForm(f => ({ ...f, notes: e.target.value }))} className="resize-none h-16" />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewCycleOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleCreateCycle} disabled={!cycleForm.doctorId || saving}>{saving ? t('saving') : t('newCycleDialog.confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add pregnancy test */}
      <Dialog open={activeDialog?.kind === 'pregnancy'} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{t('pregnancyDialog.title')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Field>
              <FieldLabel>{t('pregnancyDialog.dateLabel')}</FieldLabel>
              <Input type="date" value={pregForm.testDate} onChange={e => setPregForm(f => ({ ...f, testDate: e.target.value }))} />
            </Field>
            <Field>
              <FieldLabel>{t('pregnancyDialog.resultLabel')}</FieldLabel>
              <Select value={pregForm.result} onValueChange={v => setPregForm(f => ({ ...f, result: v as 'negativ' | 'pozitiv' }))}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="negativ">{t('pregnancyResult.negativ')}</SelectItem>
                  <SelectItem value="pozitiv">{t('pregnancyResult.pozitiv')}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>{t('cancel')}</Button>
            <Button onClick={submitPregnancyTest} disabled={saving}>{saving ? t('saving') : t('confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add lab */}
      <Dialog open={activeDialog?.kind === 'lab'} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{t('labDialog.title')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Field>
              <FieldLabel>{t('labDialog.dateLabel')}</FieldLabel>
              <Input type="date" value={labForm.testDate} onChange={e => setLabForm(f => ({ ...f, testDate: e.target.value }))} />
            </Field>
            <Field>
              <FieldLabel>{t('labDialog.typeLabel')}</FieldLabel>
              <Input value={labForm.testType} onChange={e => setLabForm(f => ({ ...f, testType: e.target.value }))} placeholder={t('labDialog.typePlaceholder')} />
            </Field>
            <Field>
              <FieldLabel>{t('labDialog.summaryLabel')}</FieldLabel>
              <Input value={labForm.resultSummary} onChange={e => setLabForm(f => ({ ...f, resultSummary: e.target.value }))} placeholder={t('labDialog.summaryPlaceholder')} />
            </Field>
            <Field>
              <FieldLabel>{t('labDialog.isNormalLabel')}</FieldLabel>
              <Select value={labForm.isNormal ? 'true' : 'false'} onValueChange={v => setLabForm(f => ({ ...f, isNormal: v === 'true' }))}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">{t('normal')}</SelectItem>
                  <SelectItem value="false">{t('abnormal')}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>{t('cancel')}</Button>
            <Button onClick={submitLab} disabled={!labForm.testType.trim() || saving}>{saving ? t('saving') : t('confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add dispense */}
      <Dialog open={activeDialog?.kind === 'dispense'} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{t('dispenseDialog.title')}</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2">{t('dispenseDialog.hint')}</p>
          <div className="space-y-3">
            <Field>
              <FieldLabel>{t('dispenseDialog.dateLabel')}</FieldLabel>
              <Input type="date" value={dispenseForm.dispensedDate} onChange={e => setDispenseForm(f => ({ ...f, dispensedDate: e.target.value }))} />
            </Field>
            <Field>
              <FieldLabel>{t('dispenseDialog.supplyDaysLabel')}</FieldLabel>
              <Input type="number" min={1} value={dispenseForm.supplyDays} onChange={e => setDispenseForm(f => ({ ...f, supplyDays: parseInt(e.target.value) || 0 }))} />
            </Field>
            <Field>
              <FieldLabel>{t('dispenseDialog.notesLabel')}</FieldLabel>
              <Textarea value={dispenseForm.notes} onChange={e => setDispenseForm(f => ({ ...f, notes: e.target.value }))} className="resize-none h-16" />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>{t('cancel')}</Button>
            <Button onClick={submitDispense} disabled={saving}>{saving ? t('saving') : t('confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
