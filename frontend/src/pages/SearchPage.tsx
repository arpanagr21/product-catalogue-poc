import { useSearchParams } from 'react-router'
import { ProductGrid, ProductGridSkeleton } from '@/components/catalogue/ProductGrid'
import { PageNav, usePageParam } from '@/components/PageNav'
import { QueryState } from '@/components/QueryState'
import { useProducts } from '@/hooks/queries'

export function SearchPage() {
  const [params] = useSearchParams()
  const term = params.get('q')?.trim() ?? ''
  const page = usePageParam()
  const results = useProducts({ term, page }, { enabled: term !== '' })

  if (!term) {
    return <p className="text-muted-foreground">Enter a search term to find products.</p>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Results for “{term}”</h1>
      <QueryState query={results} loading={<ProductGridSkeleton />}>
        {({ data, meta }) => (
          <div className="space-y-6">
            <ProductGrid products={data} emptyMessage={`No products match “${term}”.`} />
            {meta.total > 0 && <PageNav meta={meta} />}
          </div>
        )}
      </QueryState>
    </div>
  )
}
