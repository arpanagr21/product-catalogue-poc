import type { RouteObject } from 'react-router'
import { AuthProvider } from '@/components/AuthProvider'
import { AppLayout } from '@/components/layout/AppLayout'
import { RequireAdmin } from '@/components/RequireAdmin'
import { AdminFeaturedPage } from '@/pages/AdminFeaturedPage'
import { CategoryPage } from '@/pages/CategoryPage'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ProductPage } from '@/pages/ProductPage'
import { SearchPage } from '@/pages/SearchPage'

export const routes: RouteObject[] = [
  {
    element: (
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    ),
    children: [
      { index: true, element: <HomePage /> },
      { path: 'categories/:slug', element: <CategoryPage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'products/:id', element: <ProductPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'admin/featured', element: <RequireAdmin><AdminFeaturedPage /></RequireAdmin> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
