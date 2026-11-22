import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { ProductGrid, ProductGridSkeleton } from '@/components/catalogue/ProductGrid'
import { ErrorMessage } from '@/components/ErrorMessage'
import { PageNav, usePageParam } from '@/components/PageNav'
import { catalogueService } from '@/services/catalogue.service'
import type { Paginated, Product } from '@/types/catalogue'

export function SearchPage() {
  const [params] = useSearchParams()
  const term = params.get('q')?.trim() ?? ''
  const page = usePageParam()
  const [results, setResults] = useState<Paginated<Product> | null>(null)
  const [error, setError] = useState<Error | null>(null)

  function fetchResults() {
    if (!term) return
    catalogueService.getProducts({ term, page }).then((data) => {
      setResults(data)
      setError(null)
    }, setError)
  }

  useEffect(fetchResults, [term, page])

  if (!term) {
    return <p className="text-muted-foreground">Enter a search term to find products.</p>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Results for “{term}”</h1>
      {error ? (
        <ErrorMessage error={error} onRetry={fetchResults} />
      ) : results ? (
        <div className="space-y-6">
          <ProductGrid products={results.data} emptyMessage={`No products match “${term}”.`} />
          {results.meta.total > 0 && <PageNav meta={results.meta} />}
        </div>
      ) : (
        <ProductGridSkeleton />
      )}
    </div>
  )
}
