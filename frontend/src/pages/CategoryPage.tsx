import { useParams } from 'react-router'
import { ProductGrid, ProductGridSkeleton } from '@/components/catalogue/ProductGrid'
import { ProductSection } from '@/components/catalogue/ProductSection'
import { QueryState } from '@/components/QueryState'
import { Skeleton } from '@/components/ui/skeleton'
import { useCategory } from '@/hooks/queries'

export function CategoryPage() {
  const { slug = '' } = useParams()
  const listing = useCategory(slug)

  return (
    <QueryState
      query={listing}
      loading={
        <div className="space-y-6">
          <Skeleton className="h-9 w-48" />
          <ProductGridSkeleton count={3} />
        </div>
      }
    >
      {({ category, top_rated, products }) => (
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
      )}
    </QueryState>
  )
}
