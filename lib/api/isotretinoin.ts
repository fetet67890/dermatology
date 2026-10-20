import api from '@core/lib/api-client'
import type { IsotretinoinCycle, IsotretinoinCycleStatus, PregnancyTestResult } from '@/types/specialty'

export function getIsotretinoinCycles(params?: { patientId?: string }): Promise<IsotretinoinCycle[]> {
  const q = new URLSearchParams(params as Record<string, string> || {}).toString()
  return api.get<IsotretinoinCycle[]>(`/api/isotretinoin/cycles${q ? '?' + q : ''}`)
}

export function createIsotretinoinCycle(data: {
  patientId: string; doctorId: string; startDate: string; targetEndDate?: string; notes?: string
}): Promise<IsotretinoinCycle> {
  return api.post<IsotretinoinCycle>('/api/isotretinoin/cycles', data)
}

export function updateIsotretinoinCycle(id: string, data: Partial<{
  status: IsotretinoinCycleStatus; targetEndDate: string; notes: string
}>): Promise<IsotretinoinCycle> {
  return api.put<IsotretinoinCycle>(`/api/isotretinoin/cycles/${id}`, data)
}

export function addPregnancyTest(cycleId: string, data: {
  testDate: string; result: PregnancyTestResult
}): Promise<IsotretinoinCycle> {
  return api.post<IsotretinoinCycle>(`/api/isotretinoin/cycles/${cycleId}/pregnancy-tests`, data)
}

export function addIsotretinoinLab(cycleId: string, data: {
  testDate: string; testType: string; resultSummary?: string; isNormal?: boolean
}): Promise<IsotretinoinCycle> {
  return api.post<IsotretinoinCycle>(`/api/isotretinoin/cycles/${cycleId}/labs`, data)
}

// Throws ApiError with status 403 and message pre-formatted for display
// when the hard-stop blocks the dispense (no current negative pregnancy
// test) — see isotretinoin.controller.js's createDispense.
export function createDispense(cycleId: string, data: {
  dispensedDate: string; supplyDays?: number; notes?: string
}): Promise<IsotretinoinCycle> {
  return api.post<IsotretinoinCycle>(`/api/isotretinoin/cycles/${cycleId}/dispenses`, data)
}
