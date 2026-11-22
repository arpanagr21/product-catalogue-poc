import { useEffect, useState } from 'react'
import { ProductGrid, ProductGridSkeleton } from '@/components/catalogue/ProductGrid'
import { ProductSection } from '@/components/catalogue/ProductSection'
import { ErrorMessage } from '@/components/ErrorMessage'
import { config } from '@/lib/config'
import { catalogueService } from '@/services/catalogue.service'
import type { Product } from '@/types/catalogue'

export function HomePage() {
  const [products, setProducts] = useState<Product[] | null>(null)
  const [error, setError] = useState<Error | null>(null)

  function fetchFeatured() {
    catalogueService.getFeatured().then((data) => {
      setProducts(data)
      setError(null)
    }, setError)
  }

  useEffect(fetchFeatured, [])

  return (
    <ProductSection title="Top rated" description="Our hand-picked favourites.">
      {error ? (
        <ErrorMessage error={error} onRetry={fetchFeatured} />
      ) : products ? (
        <ProductGrid products={products} />
      ) : (
        <ProductGridSkeleton count={config.featuredCount} />
      )}
    </ProductSection>
  )
}
