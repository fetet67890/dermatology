import api from '@core/lib/api-client'
import type { SkincareRegimen, AdherenceStatus } from '@/types/specialty'

export function getSkincareRegimens(params?: { patientId?: string }): Promise<SkincareRegimen[]> {
  const q = new URLSearchParams(params as Record<string, string> || {}).toString()
  return api.get<SkincareRegimen[]>(`/api/skincare-regimens${q ? '?' + q : ''}`)
}

export function createSkincareRegimen(data: {
  patientId: string; doctorId: string; regimenDescription: string; prescribedDate: string
  reviewDate?: string; notes?: string
}): Promise<SkincareRegimen> {
  return api.post<SkincareRegimen>('/api/skincare-regimens', data)
}

export function updateSkincareRegimen(id: string, data: Partial<{
  adherenceStatus: AdherenceStatus; reviewDate: string; notes: string
}>): Promise<SkincareRegimen> {
  return api.put<SkincareRegimen>(`/api/skincare-regimens/${id}`, data)
}

export function deleteSkincareRegimen(id: string): Promise<void> {
  return api.delete(`/api/skincare-regimens/${id}`)
}
