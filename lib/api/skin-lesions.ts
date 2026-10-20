import api from '@core/lib/api-client'
import type { SkinLesion, LesionMeasurement } from '@/types/specialty'

export function getSkinLesions(params?: { patientId?: string; status?: string }): Promise<SkinLesion[]> {
  const q = new URLSearchParams(params as Record<string, string> || {}).toString()
  return api.get<SkinLesion[]>(`/api/skin-lesions${q ? '?' + q : ''}`)
}

export function createSkinLesion(data: {
  patientId: string; doctorId: string; bodyLocation: string
  locationX?: number; locationY?: number; bodyView?: 'perpara' | 'pas'
  firstNotedDate: string; notes?: string
}): Promise<SkinLesion> {
  return api.post<SkinLesion>('/api/skin-lesions', data)
}

export function updateSkinLesion(id: string, data: Partial<Pick<SkinLesion,
  'bodyLocation' | 'locationX' | 'locationY' | 'bodyView' | 'status' | 'notes'>>): Promise<SkinLesion> {
  return api.put<SkinLesion>(`/api/skin-lesions/${id}`, data)
}

export function deleteSkinLesion(id: string): Promise<void> {
  return api.delete(`/api/skin-lesions/${id}`)
}

export function getLesionMeasurements(lesionId: string): Promise<LesionMeasurement[]> {
  return api.get<LesionMeasurement[]>(`/api/skin-lesions/${lesionId}/measurements`)
}

export function addLesionMeasurement(lesionId: string, data: {
  sizeMm: number; color?: string; asymmetry?: boolean; borderIrregular?: boolean
  colorVariation?: boolean; notes?: string; recordedAt: string
}): Promise<LesionMeasurement> {
  return api.post<LesionMeasurement>(`/api/skin-lesions/${lesionId}/measurements`, data)
}
