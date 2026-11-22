import { apiClient, type ApiEnvelope } from '@/lib/api/client'
import type { Product } from '@/types/catalogue'

export const adminService = {
  async setFeatured(productIds: string[]): Promise<Product[]> {
    return (await apiClient.put<ApiEnvelope<Product[]>>('/admin/featured', { product_ids: productIds })).data
  },
}
