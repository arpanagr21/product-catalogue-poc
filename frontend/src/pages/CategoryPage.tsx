import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { ProductGrid, ProductGridSkeleton } from '@/components/catalogue/ProductGrid'
import { ProductSection } from '@/components/catalogue/ProductSection'
import { ErrorMessage } from '@/components/ErrorMessage'
import { Skeleton } from '@/components/ui/skeleton'
import { catalogueService } from '@/services/catalogue.service'
import type { CategoryListing } from '@/types/catalogue'

export function CategoryPage() {
  const { slug = '' } = useParams()
  const [listing, setListing] = useState<CategoryListing | null>(null)
  const [error, setError] = useState<Error | null>(null)

  function fetchListing() {
    catalogueService.getCategory(slug).then((data) => {
      setListing(data)
      setError(null)
    }, setError)
  }

  useEffect(fetchListing, [slug])

  if (error) return <ErrorMessage error={error} onRetry={fetchListing} />

  if (!listing) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <ProductGridSkeleton count={3} />
      </div>
    )
  }

  const { category, top_rated, products } = listing

  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-bold tracking-tight">{category.name}</h1>
      <ProductSection title="Top rated">
        <ProductGrid products={top_rated} />
      </ProductSection>
      {products.length > 0 && (
        <ProductSection title={`More in ${category.name}`}>
          <ProductGrid products={products} />
        </ProductSection>
      )}
    </div>
  )
}
