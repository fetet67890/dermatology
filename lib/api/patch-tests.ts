import api from '@core/lib/api-client'
import type { PatchTest, PatchTestResult } from '@/types/specialty'

export function getPatchTests(params?: { patientId?: string }): Promise<PatchTest[]> {
  const q = new URLSearchParams(params as Record<string, string> || {}).toString()
  return api.get<PatchTest[]>(`/api/patch-tests${q ? '?' + q : ''}`)
}

export function createPatchTest(data: {
  patientId: string; doctorId: string; substance: string; appliedDate: string; notes?: string
}): Promise<PatchTest> {
  return api.post<PatchTest>('/api/patch-tests', data)
}

export function updatePatchTest(id: string, data: {
  result48h?: PatchTestResult; result96h?: PatchTestResult; notes?: string
}): Promise<PatchTest> {
  return api.put<PatchTest>(`/api/patch-tests/${id}`, data)
}

export function deletePatchTest(id: string): Promise<void> {
  return api.delete(`/api/patch-tests/${id}`)
}
