import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminService } from '@/services/admin.service'
import { authService } from '@/services/auth.service'
import { catalogueService } from '@/services/catalogue.service'
import { enquiryService } from '@/services/enquiry.service'

/** React Query bindings for the services. Components use these, never services directly. */

export const queryKeys = {
  featured: ['featured'] as const,
  categories: ['categories'] as const,
  category: (slug: string) => ['categories', slug] as const,
  products: (term: string, page: number) => ['products', { term, page }] as const,
  product: (id: string) => ['product', id] as const,
  currentUser: ['currentUser'] as const,
}

export const useFeaturedProducts = () =>
  useQuery({ queryKey: queryKeys.featured, queryFn: catalogueService.getFeatured })

export const useCategories = () =>
  useQuery({ queryKey: queryKeys.categories, queryFn: catalogueService.getCategories, staleTime: 10 * 60_000 })

export const useCategory = (slug: string) =>
  useQuery({ queryKey: queryKeys.category(slug), queryFn: () => catalogueService.getCategory(slug) })

/** Keeps showing the current page while the next one loads, so the list doesn't flash. */
export const useProducts = ({ term = '', page = 1 }: { term?: string; page?: number }, { enabled = true } = {}) =>
  useQuery({
    queryKey: queryKeys.products(term, page),
    queryFn: () => catalogueService.getProducts({ term, page }),
    placeholderData: keepPreviousData,
    enabled,
  })

export const useProduct = (id: string) =>
  useQuery({ queryKey: queryKeys.product(id), queryFn: () => catalogueService.getProduct(id) })

export const useSubmitEnquiry = () => useMutation({ mutationFn: enquiryService.submit })

export const useCurrentUser = () =>
  useQuery({ queryKey: queryKeys.currentUser, queryFn: authService.currentUser, staleTime: 5 * 60_000 })

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: authService.login,
    onSuccess: (user) => queryClient.setQueryData(queryKeys.currentUser, user),
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: authService.logout,
    onSettled: () => queryClient.setQueryData(queryKeys.currentUser, null),
  })
}

export function useSetFeatured() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: adminService.setFeatured,
    onSuccess: (products) => {
      queryClient.setQueryData(queryKeys.featured, products)
      // Category "top rated" sections depend on the featured list too.
      return queryClient.invalidateQueries({ queryKey: queryKeys.categories })
    },
  })
}
