import api from '@core/lib/api-client'
import type { Invoice } from '@core/types'

export interface SellableInventoryItem {
  id: string
  name: string
  unit: string
  quantity: number
  sellPrice: number
}

export function getSellableInventory(): Promise<SellableInventoryItem[]> {
  return api.get<SellableInventoryItem[]>('/api/retail-sales/inventory')
}

export function setInventorySellPrice(id: string, sellPrice: number | null): Promise<SellableInventoryItem> {
  return api.put<SellableInventoryItem>(`/api/retail-sales/inventory/${id}/price`, { sellPrice })
}

export function createRetailSale(data: {
  patientId: string
  items: { inventoryItemId: string; quantity: number }[]
  dueDate: string
}): Promise<Invoice> {
  return api.post<Invoice>('/api/retail-sales', data)
}
