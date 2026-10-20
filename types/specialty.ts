// Dermatology-only types — skin-lesion body-map tracking, aesthetic
// treatment plans, and allergy patch tests. Not part of
// @hypocrates/core-dashboard's shared types since no other specialty has
// these clinical concepts.
import type { Patient as CorePatient } from '@core/types'

// This fork's one extra patient field (see specialty.config.ts's
// patientExtraFields) — components that need it use this extended type
// instead of the base Patient from @core/types.
export interface Patient extends CorePatient {
  fitzpatrickType?: number
}

export interface LesionMeasurement {
  id: string
  lesionId: string
  sizeMm: number
  color?: string
  asymmetry: boolean
  borderIrregular: boolean
  colorVariation: boolean
  notes?: string
  recordedBy?: string
  recordedByName?: string
  recordedAt: string
  createdAt: string
}

export interface SkinLesion {
  id: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  bodyLocation: string
  locationX?: number
  locationY?: number
  bodyView: 'perpara' | 'pas'
  status: 'aktiv' | 'zgjidhur' | 'hequr'
  firstNotedDate: string
  notes?: string
  createdAt: string
  latestMeasurement: LesionMeasurement | null
  trend: 'stabile' | 'po_perkeqesohet' | null
}

export interface AestheticPlan {
  id: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  treatmentId?: string
  procedureType: string
  bodyArea: string
  cost: number
  status: 'planifikuar' | 'ne_proces' | 'perfunduar'
  notes?: string
  createdAt: string
}

export type PatchTestResult = 'negativ' | 'i_dyshimte' | 'pozitiv_dobet' | 'pozitiv_forte' | 'ekstrem' | 'iritant'

export interface PatchTest {
  id: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  substance: string
  appliedDate: string
  result48h?: PatchTestResult
  result96h?: PatchTestResult
  notes?: string
  createdAt: string
}

export type BiopsyStatus = 'ne_pritje' | 'marre'
export type BiopsyResult = 'beninj' | 'malinj' | 'atipik'

export interface Biopsy {
  id: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  lesionId?: string
  site: string
  sentDate: string
  labName?: string
  status: BiopsyStatus
  result?: BiopsyResult
  receivedDate?: string
  notes?: string
  createdAt: string
}

export type IsotretinoinCycleStatus = 'aktiv' | 'perfunduar' | 'ndaluar'
export type PregnancyTestResult = 'negativ' | 'pozitiv'

export interface IsotretinoinCycle {
  id: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  startDate: string
  targetEndDate?: string
  status: IsotretinoinCycleStatus
  notes?: string
  createdAt: string
  // Most-recent-first, small enough per cycle to just embed rather than
  // paginate separately (see isotretinoin.controller.js's getAll).
  pregnancyTests: IsotretinoinPregnancyTest[]
  labs: IsotretinoinLab[]
  dispenses: IsotretinoinDispense[]
}

export interface IsotretinoinPregnancyTest {
  id: string
  cycleId: string
  testDate: string
  result: PregnancyTestResult
  recordedBy?: string
  recordedByName?: string
  createdAt: string
}

export interface IsotretinoinLab {
  id: string
  cycleId: string
  testDate: string
  testType: string
  resultSummary?: string
  isNormal: boolean
  recordedBy?: string
  recordedByName?: string
  createdAt: string
}

export interface IsotretinoinDispense {
  id: string
  cycleId: string
  dispensedDate: string
  supplyDays?: number
  notes?: string
  dispensedBy?: string
  dispensedByName?: string
  createdAt: string
}

export type AdherenceStatus = 'e_mire' | 'e_pjesshme' | 'e_dobet'

export interface SkincareRegimen {
  id: string
  patientId: string
  doctorId: string
  doctorName: string
  regimenDescription: string
  prescribedDate: string
  reviewDate?: string
  adherenceStatus?: AdherenceStatus
  notes?: string
  createdAt: string
}
