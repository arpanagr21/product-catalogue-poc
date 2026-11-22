/** Mirrors the backend API contract (app/Http/Resources), not any upstream provider. */

export type Category = {
  slug: string
  name: string
}

export type Product = {
  id: string
  title: string
  description: string
  price: number
  currency: string
  /** Served via our backend's image proxy; null when the product has none. */
  image: string | null
  category: Category
  rating: { rate: number; count: number } | null
}

/** Laravel's paginated resource collection (meta subset we use). */
export type Paginated<T> = {
  data: T[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
    from: number | null
    to: number | null
  }
}

export type CategoryListing = {
  category: Category
  top_rated: Product[]
  products: Product[]
}

export type EnquiryInput = {
  product_id: string
  name: string
  email: string
  phone?: string
  message?: string
}

export type User = {
  id: number
  name: string
  email: string
}
