import api from '@core/lib/api-client'
import type { AestheticPlan } from '@/types/specialty'

export function getAestheticPlans(params?: { patientId?: string; doctorId?: string }): Promise<AestheticPlan[]> {
  const q = new URLSearchParams(params as Record<string, string> || {}).toString()
  return api.get<AestheticPlan[]>(`/api/aesthetic-plans${q ? '?' + q : ''}`)
}

export function createAestheticPlan(data: {
  patientId: string; doctorId: string; treatmentId?: string
  procedureType: string; bodyArea: string; cost?: number; status?: string; notes?: string
}): Promise<AestheticPlan> {
  return api.post<AestheticPlan>('/api/aesthetic-plans', data)
}

export function updateAestheticPlan(id: string, data: Partial<Pick<AestheticPlan,
  'procedureType' | 'bodyArea' | 'cost' | 'status' | 'notes'>>): Promise<AestheticPlan> {
  return api.put<AestheticPlan>(`/api/aesthetic-plans/${id}`, data)
}

export function deleteAestheticPlan(id: string): Promise<void> {
  return api.delete(`/api/aesthetic-plans/${id}`)
}
