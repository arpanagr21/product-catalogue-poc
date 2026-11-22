import { apiClient, type ApiEnvelope } from '@/lib/api/client'
import { config } from '@/lib/config'
import type { Category, CategoryListing, Paginated, Product } from '@/types/catalogue'

export const catalogueService = {
  async getFeatured(): Promise<Product[]> {
    return (await apiClient.get<ApiEnvelope<Product[]>>('/featured')).data
  },

  async getCategories(): Promise<Category[]> {
    return (await apiClient.get<ApiEnvelope<Category[]>>('/categories')).data
  },

  async getCategory(slug: string): Promise<CategoryListing> {
    return (await apiClient.get<ApiEnvelope<CategoryListing>>(`/categories/${encodeURIComponent(slug)}`)).data
  },

  /** A page of products, or of those matching `term` when given. */
  getProducts({ term = '', page = 1, perPage = config.pageSize }: { term?: string; page?: number; perPage?: number } = {}) {
    return apiClient.get<Paginated<Product>>('/products', { query: { q: term, page, per_page: perPage } })
  },

  async getProduct(id: string): Promise<Product> {
    return (await apiClient.get<ApiEnvelope<Product>>(`/products/${encodeURIComponent(id)}`)).data
  },
}
