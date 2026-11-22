import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { config } from '@/lib/config'
import { categories, featuredIds, products } from './fixtures'

/** Absolute URL of a backend API path, as the client builds it. */
export const api = (path: string) => `${config.apiUrl}/api${path}`

const byId = (id: string) => products.find((p) => p.id === id)

/** Same shape as Laravel's paginated resource collection. */
export function paginate<T>(items: T[], page = 1, perPage = 10) {
  const start = (page - 1) * perPage
  const data = items.slice(start, start + perPage)
  return {
    data,
    meta: {
      current_page: page,
      last_page: Math.max(1, Math.ceil(items.length / perPage)),
      per_page: perPage,
      total: items.length,
      from: data.length ? start + 1 : null,
      to: data.length ? start + data.length : null,
    },
  }
}

/** A happy-path fake of the Laravel API, built on the same contract as the real one. */
export const handlers = [
  http.get(`${config.apiUrl}/sanctum/csrf-cookie`, () => new HttpResponse(null, { status: 204 })),

  http.get(api('/featured'), () => HttpResponse.json({ data: featuredIds.map(byId) })),

  http.get(api('/categories'), () => HttpResponse.json({ data: categories })),

  http.get(api('/categories/:slug'), ({ params }) => {
    const category = categories.find((c) => c.slug === params.slug)
    if (!category) return HttpResponse.json({ message: 'Category not found.' }, { status: 404 })
    const inCategory = products.filter((p) => p.category.slug === category.slug)
    return HttpResponse.json({ data: { category, top_rated: inCategory.slice(0, 1), products: inCategory.slice(1) } })
  }),

  http.get(api('/products'), ({ request }) => {
    const params = new URL(request.url).searchParams
    const q = params.get('q')?.toLowerCase() ?? ''
    const matches = products.filter((p) => p.title.toLowerCase().includes(q))
    return HttpResponse.json(paginate(matches, Number(params.get('page') ?? 1), Number(params.get('per_page') ?? 10)))
  }),

  http.get(api('/products/:id'), ({ params }) => {
    const product = byId(String(params.id))
    return product
      ? HttpResponse.json({ data: product })
      : HttpResponse.json({ message: 'Product not found.' }, { status: 404 })
  }),

  http.post(api('/enquiries'), () =>
    HttpResponse.json({ data: { id: 1 }, message: 'Thank you! Our sales team will be in touch shortly.' }, { status: 201 }),
  ),

  http.get(api('/user'), () => HttpResponse.json({ message: 'Unauthenticated.' }, { status: 401 })),
]

export const server = setupServer(...handlers)
