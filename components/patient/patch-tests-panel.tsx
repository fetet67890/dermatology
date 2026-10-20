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
import { getPatchTests, createPatchTest, updatePatchTest } from '@/lib/api/patch-tests'
import type { PatchTest, PatchTestResult } from '@/types/specialty'
import { fmtDate } from '@core/lib/utils'

const RESULT_VALUES: PatchTestResult[] = ['negativ', 'i_dyshimte', 'pozitiv_dobet', 'pozitiv_forte', 'ekstrem', 'iritant']

const RESULT_CHIP: Record<PatchTestResult, string> = {
  negativ:        'chip-neutral',
  i_dyshimte:     'chip-amber',
  pozitiv_dobet:  'chip-amber',
  pozitiv_forte:  'chip-red',
  ekstrem:        'chip-red',
  iritant:        'chip-amber',
}

const EMPTY = { substance: '', doctorId: '', appliedDate: new Date().toISOString().slice(0, 10), notes: '' }

export function PatchTestsPanel({ patientId }: { patientId: string }) {
  const t = useTranslations('patch-tests-panel')
  const { user } = useAuth()
  const { staff } = useData()
  const doctors = staff.filter(s => s.role === 'mjek' && s.status === 'aktiv')
  // Writes are admin/mjek-only server-side (see patch-tests.routes.js) —
  // recepsion (who can still view this via the shared PatientCard) gets a
  // read-only view instead of controls that would just 403.
  const canEdit = user?.role === 'admin' || user?.role === 'mjek'

  const [tests, setTests] = useState<PatchTest[]>([])
  const [loading, setLoading] = useState(true)
  const [newOpen, setNewOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      setTests(await getPatchTests({ patientId }))
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
    if (!form.substance.trim() || !form.doctorId) return
    setSaving(true)
    try {
      const created = await createPatchTest({
        patientId,
        doctorId: form.doctorId,
        substance: form.substance.trim(),
        appliedDate: form.appliedDate,
        notes: form.notes.trim() || undefined,
      })
      setTests(prev => [created, ...prev])
      toast.success(t('createSuccess'))
      setNewOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('createError'))
    } finally {
      setSaving(false)
    }
  }

  const handleResultChange = async (test: PatchTest, field: 'result48h' | 'result96h', value: PatchTestResult) => {
    try {
      const updated = await updatePatchTest(test.id, { [field]: value })
      setTests(prev => prev.map(t => t.id === updated.id ? updated : t))
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
            {t('addTest')}
          </Button>
        )}
      </div>

      {tests.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">{t('noTests')}</p>
      ) : (
        <div className="space-y-2">
          {tests.map(test => (
            <div key={test.id} className="rounded-xl border border-border p-3">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <FlaskConical className="h-4 w-4 text-accent" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{test.substance}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('appliedLine', { date: fmtDate(test.appliedDate), doctor: test.doctorName })}
                  </p>
                  {test.notes && <p className="text-xs text-muted-foreground mt-1">{test.notes}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 ml-12">
                {(['result48h', 'result96h'] as const).map(field => (
                  <div key={field} className="flex items-center gap-2">
                    <FieldLabel className="text-[11px] mb-0 shrink-0">{t(`${field}Label`)}</FieldLabel>
                    {canEdit ? (
                      <Select
                        value={test[field] || '__none__'}
                        onValueChange={(v) => v !== '__none__' && handleResultChange(test, field, v as PatchTestResult)}
                      >
                        <SelectTrigger className="rounded-lg h-7 text-[11px]">
                          <SelectValue placeholder={t('notRecorded')} />
                        </SelectTrigger>
                        <SelectContent>
                          {RESULT_VALUES.map(r => <SelectItem key={r} value={r}>{t(`result.${r}`)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">{test[field] ? t(`result.${test[field]}`) : t('notRecorded')}</span>
                    )}
                    {test[field] && (
                      <span className={`${RESULT_CHIP[test[field]!]} rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase shrink-0`}>
                        {t(`result.${test[field]}`)}
                      </span>
                    )}
                  </div>
                ))}
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
              <FieldLabel>{t('newDialog.substanceLabel')}</FieldLabel>
              <Input
                value={form.substance}
                onChange={e => setForm(f => ({ ...f, substance: e.target.value }))}
                placeholder={t('newDialog.substancePlaceholder')}
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
              <FieldLabel>{t('newDialog.appliedDateLabel')}</FieldLabel>
              <Input
                type="date"
                value={form.appliedDate}
                onChange={e => setForm(f => ({ ...f, appliedDate: e.target.value }))}
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
            <Button onClick={handleCreate} disabled={!form.substance.trim() || !form.doctorId || saving}>
              {saving ? t('saving') : t('newDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
