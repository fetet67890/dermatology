import api from '@core/lib/api-client'
import type { Biopsy, BiopsyResult, BiopsyStatus } from '@/types/specialty'

export function getBiopsies(params?: { patientId?: string; status?: BiopsyStatus }): Promise<Biopsy[]> {
  const q = new URLSearchParams(params as Record<string, string> || {}).toString()
  return api.get<Biopsy[]>(`/api/biopsies${q ? '?' + q : ''}`)
}

export function createBiopsy(data: {
  patientId: string; doctorId: string; lesionId?: string; site: string; sentDate: string
  labName?: string; notes?: string
}): Promise<Biopsy> {
  return api.post<Biopsy>('/api/biopsies', data)
}

export function updateBiopsy(id: string, data: Partial<{
  site: string; labName: string; status: BiopsyStatus; result: BiopsyResult
  receivedDate: string; notes: string
}>): Promise<Biopsy> {
  return api.put<Biopsy>(`/api/biopsies/${id}`, data)
}

export function deleteBiopsy(id: string): Promise<void> {
  return api.delete(`/api/biopsies/${id}`)
}
